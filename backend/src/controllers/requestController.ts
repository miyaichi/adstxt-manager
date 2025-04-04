import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel, { CreateAdsTxtRecordDTO } from '../models/AdsTxtRecord';
import RequestModel, { CreateRequestDTO } from '../models/Request';
import emailService from '../services/emailService';
import { isValidEmail, parseAdsTxtContent, crossCheckAdsTxtRecords } from '../utils/validation';

/**
 * Create a new request
 * @route POST /api/requests
 */
export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const { publisher_email, requester_email, requester_name, publisher_name, publisher_domain } =
    req.body;

  // Validate required fields
  if (!publisher_email || !requester_email || !requester_name) {
    throw new ApiError(
      400,
      'Publisher email, requester email, and requester name are required',
      'errors:missingFields.request'
    );
  }

  // Validate email addresses
  if (!isValidEmail(publisher_email) || !isValidEmail(requester_email)) {
    throw new ApiError(400, 'Invalid email address', 'errors:invalidEmail');
  }

  // Parse records if it's a string (from FormData)
  let recordsArray: any[] = [];
  if (req.body.records) {
    try {
      if (typeof req.body.records === 'string') {
        recordsArray = JSON.parse(req.body.records);
      } else if (Array.isArray(req.body.records)) {
        recordsArray = req.body.records;
      }
    } catch (error) {
      console.error('Error parsing records JSON:', error);
    }
  }

  // Check for Ads.txt records in the request
  if (!req.file && recordsArray.length === 0) {
    throw new ApiError(
      400,
      'Ads.txt records are required (either file upload or JSON data)',
      'errors:missingFields.records'
    );
  }

  // Create the request
  const requestData: CreateRequestDTO = {
    publisher_email,
    requester_email,
    requester_name,
    publisher_name,
    publisher_domain,
  };

  const request = await RequestModel.create(requestData);

  // Parse and store Ads.txt records
  let adsTxtRecords: CreateAdsTxtRecordDTO[] = [];

  if (req.file) {
    // Process uploaded CSV file
    try {
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf8');

      // Parse the content
      const parsedRecords = parseAdsTxtContent(fileContent);
      // Cross-check records against publisher domain
      const crossCheckedRecords = await crossCheckAdsTxtRecords(publisher_domain, parsedRecords);
      const validRecords = crossCheckedRecords.filter((record) => record.is_valid);

      if (validRecords.length === 0) {
        throw new ApiError(
          400,
          'No valid Ads.txt records found in the uploaded file',
          'errors:noValidRecords'
        );
      }

      // Convert to DTOs
      adsTxtRecords = validRecords.map((record) => ({
        request_id: request.id,
        domain: record.domain,
        account_id: record.account_id,
        account_type: record.account_type,
        certification_authority_id: record.certification_authority_id,
        relationship: record.relationship,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid format';
      throw new ApiError(
        400,
        `Error parsing Ads.txt file: ${errorMessage}`,
        'errors:parsingError',
        { message: errorMessage }
      );
    }
  } else if (recordsArray.length > 0) {
    // Process JSON records
    adsTxtRecords = recordsArray.map(
      (record: {
        domain: string;
        account_id: string;
        account_type: string;
        certification_authority_id?: string;
        relationship?: 'DIRECT' | 'RESELLER';
      }) => ({
        request_id: request.id,
        domain: record.domain,
        account_id: record.account_id,
        account_type: record.account_type,
        certification_authority_id: record.certification_authority_id,
        relationship: record.relationship || 'DIRECT',
      })
    );
  }

  // Store the records
  await AdsTxtRecordModel.bulkCreate(adsTxtRecords);

  // Get the preferred language from the request header
  const language = req.language || 'en';

  // Send notification emails
  try {
    await Promise.all([
      emailService.sendPublisherRequestNotification(
        publisher_email,
        request.id,
        requester_name,
        requester_email,
        request.token,
        language
      ),
      emailService.sendRequesterConfirmation(
        requester_email,
        requester_name,
        publisher_email,
        request.id,
        request.token,
        language
      ),
    ]);
  } catch (error) {
    console.error('Error sending emails:', error);
    // Continue even if emails fail - we'll log but not fail the request
  }

  res.status(201).json({
    success: true,
    data: {
      request_id: request.id,
      token: request.token,
    },
  });
});

/**
 * Get a request by ID and token
 * @route GET /api/requests/:id
 */
export const getRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  const request = await RequestModel.getByIdWithToken(id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get associated Ads.txt records
  const adsTxtRecords = await AdsTxtRecordModel.getByRequestId(id);

  res.status(200).json({
    success: true,
    data: {
      request,
      records: adsTxtRecords,
    },
  });
});

/**
 * Update a request status
 * @route PATCH /api/requests/:id/status
 */
export const updateRequestStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, token } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  if (!status || !['pending', 'approved', 'rejected', 'updated'].includes(status)) {
    throw new ApiError(
      400,
      'Valid status is required (pending, approved, rejected, or updated)',
      'errors:invalidStatus'
    );
  }

  // Verify the token
  const request = await RequestModel.getByIdWithToken(id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Update the status
  const updatedRequest = await RequestModel.updateStatus(
    id,
    status as 'pending' | 'approved' | 'rejected' | 'updated'
  );

  if (!updatedRequest) {
    throw new ApiError(500, 'Failed to update request status', 'errors:failedToUpdate.status');
  }

  // When approving a request, update all pending Ads.txt records to approved
  if (status === 'approved') {
    const records = await AdsTxtRecordModel.getByRequestId(id);
    await Promise.all(
      records
        .filter((record) => record.status === 'pending')
        .map((record) => AdsTxtRecordModel.updateStatus(record.id, 'approved'))
    );
  }

  // Get the preferred language from the request header
  const language = req.language || 'en';

  // Send email notifications
  try {
    // Notify the requester of the status change
    await emailService.sendStatusUpdateNotification(
      request.requester_email,
      id,
      status,
      request.token,
      language
    );
  } catch (error) {
    console.error('Error sending status update email:', error);
    // Continue even if emails fail
  }

  res.status(200).json({
    success: true,
    data: updatedRequest,
  });
});

/**
 * Update publisher information
 * @route PATCH /api/requests/:id/publisher
 */
export const updatePublisherInfo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { publisher_name, publisher_domain, token } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  if (!publisher_name || !publisher_domain) {
    throw new ApiError(
      400,
      'Publisher name and domain are required',
      'errors:missingFields.publisherInfo'
    );
  }

  // Verify the token
  const request = await RequestModel.getByIdWithToken(id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Update publisher info
  const updatedRequest = await RequestModel.updatePublisherInfo(
    id,
    publisher_name,
    publisher_domain
  );

  if (!updatedRequest) {
    throw new ApiError(
      500,
      'Failed to update publisher information',
      'errors:failedToUpdate.publisherInfo'
    );
  }

  res.status(200).json({
    success: true,
    data: updatedRequest,
  });
});

/**
 * Get requests by email (either publisher or requester)
 * @route GET /api/requests/email/:email
 */
export const getRequestsByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.params;
  const { role } = req.query;

  if (!isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email address', 'errors:invalidEmail');
  }

  let requests;
  if (role === 'publisher') {
    requests = await RequestModel.getByPublisherEmail(email);
  } else if (role === 'requester') {
    requests = await RequestModel.getByRequesterEmail(email);
  } else {
    // If no role specified, check both
    const publisherRequests = await RequestModel.getByPublisherEmail(email);
    const requesterRequests = await RequestModel.getByRequesterEmail(email);
    requests = [...publisherRequests, ...requesterRequests];
  }

  res.status(200).json({
    success: true,
    data: requests,
  });
});

/**
 * Update an existing request with new records
 * @route PUT /api/requests/:id
 */
export const updateRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    token,
    records,
    publisher_email,
    requester_email,
    requester_name,
    publisher_name,
    publisher_domain,
  } = req.body;

  // Validate token
  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Get existing request to check token and permissions
  const existingRequest = await RequestModel.getByIdWithToken(id, token);

  if (!existingRequest) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Only allow updates if status is pending or rejected
  if (existingRequest.status !== 'pending' && existingRequest.status !== 'rejected') {
    throw new ApiError(400, 'Cannot update request in current status', 'errors:cannotUpdate');
  }

  // Validate that requester email matches the original request (security check)
  if (requester_email && requester_email !== existingRequest.requester_email) {
    throw new ApiError(400, 'Cannot change requester email', 'errors:cannotChangeRequesterEmail');
  }

  // Validate that publisher email matches the original request (security check)
  if (publisher_email && publisher_email !== existingRequest.publisher_email) {
    throw new ApiError(400, 'Cannot change publisher email', 'errors:cannotChangePublisherEmail');
  }

  // Only update request data if provided
  if (requester_name || publisher_name || publisher_domain) {
    await RequestModel.update(id, {
      requester_name: requester_name || existingRequest.requester_name,
      publisher_name: publisher_name || existingRequest.publisher_name,
      publisher_domain: publisher_domain || existingRequest.publisher_domain,
    });
  }

  // Update records if provided
  if (records && Array.isArray(records) && records.length > 0) {
    try {
      // Prepare new records data before deletion to minimize time without records
      const recordsData = records.map((record: any) => ({
        request_id: id,
        domain: record.domain,
        account_id: record.account_id,
        account_type: record.account_type,
        certification_authority_id: record.certification_authority_id,
        relationship: record.relationship || 'DIRECT',
      }));

      // Delete existing records
      const deleteResult = await AdsTxtRecordModel.deleteByRequestId(id);

      if (!deleteResult) {
        console.error(`Failed to delete records for request ${id}`);
        throw new ApiError(500, 'Failed to update records', 'errors:failedToDeleteRecords');
      }

      // Create new records
      const newRecords = await AdsTxtRecordModel.bulkCreate(recordsData);

      if (!newRecords || newRecords.length === 0) {
        console.error(`Failed to create new records for request ${id}`);
        throw new ApiError(500, 'Failed to create new records', 'errors:failedToCreateRecords');
      }

      console.log(`Successfully updated ${newRecords.length} records for request ${id}`);
    } catch (error) {
      console.error('Error updating records:', error);
      throw new ApiError(500, 'Failed to update records', 'errors:failedToUpdateRecords');
    }
  }

  // Update request status to updated
  await RequestModel.updateStatus(id, 'updated');

  // Get the preferred language from the request header
  const language = req.language || 'en';

  // Send email notification to publisher
  try {
    await emailService.sendRequestUpdateNotification(
      existingRequest.publisher_email,
      id,
      existingRequest.requester_name,
      existingRequest.requester_email,
      token,
      language
    );
  } catch (error) {
    console.error('Error sending update notification email:', error);
    // Continue even if email fails
  }

  res.status(200).json({
    success: true,
    data: {
      request_id: id,
      token: token,
      status: 'updated',
    },
  });
});
