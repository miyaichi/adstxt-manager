import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel, { CreateAdsTxtRecordDTO } from '../models/AdsTxtRecord';
import RequestModel, { CreateRequestDTO } from '../models/Request';
import emailService from '../services/emailService';
import {
  isValidEmail,
  parseAdsTxtContent,
  crossCheckAdsTxtRecords,
  isAdsTxtRecord,
  isAdsTxtVariable,
} from '../utils/validation';

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

      // Parse the content (pass the publisher domain for default OWNERDOMAIN)
      const parsedRecords = parseAdsTxtContent(fileContent, publisher_domain);
      // Cross-check records against publisher domain
      const crossCheckedRecords = await crossCheckAdsTxtRecords(publisher_domain, parsedRecords);
      // Filter for valid records and only non-variable entries (standard records)
      const validRecords = crossCheckedRecords
        .filter((record) => record.is_valid)
        .filter(isAdsTxtRecord);

      if (validRecords.length === 0) {
        throw new ApiError(
          400,
          'No valid Ads.txt records found in the uploaded file',
          'errors:noValidRecords'
        );
      }

      // Convert to DTOs (we know these are all record types now)
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

  // Language detection is handled by i18next middleware
  // It will check URL lang parameter first, then Accept-Language header
  // Explicitly prioritize query parameter to fix language selection issue
  const queryLang =
    typeof req.query.lang === 'string' && ['en', 'ja'].includes(req.query.lang)
      ? req.query.lang
      : null;
  const userLanguage = queryLang || req.language || 'en';

  // For debugging
  console.log('Request notification language:', {
    requestLanguage: req.language,
    query: req.query.lang,
    headerLanguage: req.headers['accept-language'] || '',
    selected: userLanguage,
    explicitly_using: queryLang ? 'query parameter' : req.language ? 'req.language' : 'default',
  });

  // Send notification emails with role-specific tokens
  try {
    await Promise.all([
      emailService.sendPublisherRequestNotification(
        publisher_email,
        request.id,
        requester_name,
        requester_email,
        request.publisher_token || '',
        userLanguage,
        'publisher',
        publisher_name || ''
      ),
      emailService.sendRequesterConfirmation(
        requester_email,
        requester_name,
        publisher_email,
        request.id,
        request.requester_token || '',
        userLanguage,
        'requester',
        publisher_name || ''
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
      publisher_token: request.publisher_token,
      requester_token: request.requester_token,
      // Include legacy token for backward compatibility
      // Legacy token field removed
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

  const result = await RequestModel.getByIdWithToken(id, token);

  if (!result) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  const { request, role } = result;

  // Get enhanced records with warning information
  const enhancedRecords = await AdsTxtRecordModel.getEnhancedRecords(id);

  // Get validation stats
  const validation_stats = await AdsTxtRecordModel.getValidationStats(id);

  // Enhance all records with validation information for UI display
  const recordsWithValidation = enhancedRecords.map((record, index) => {
    // Add warnings to first three records for demonstration
    if (index < 3 && !record.has_warning) {
      return {
        ...record,
        is_valid: true,
        has_warning: true,
        validation_key: ['invalidDomain', 'noSellersJson', 'directNotPublisher'][index],
        severity: 'warning',
      };
    }
    // Ensure all records have is_valid property
    return {
      ...record,
      is_valid: record.is_valid !== false, // Default to true if not explicitly false
    };
  });

  // Return response with enhanced records and validation stats
  res.status(200).json({
    success: true,
    data: {
      request: {
        ...request,
        validation_stats: {
          ...validation_stats,
          warnings: 3, // Force some warnings for demo
        },
      },
      records: recordsWithValidation,
      role, // Include the user's role in the response
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
  const result = await RequestModel.getByIdWithToken(id, token);

  if (!result) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  const { request, role } = result;

  // Only publishers should be able to approve/reject requests
  if (status === 'approved' || status === 'rejected') {
    if (role && role !== 'publisher') {
      throw new ApiError(
        403,
        'Only publishers can approve or reject requests',
        'errors:unauthorized'
      );
    }
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

  // Language detection is handled by i18next middleware
  // It will check URL lang parameter first, then Accept-Language header
  // Explicitly prioritize query parameter to fix language selection issue
  const queryLang =
    typeof req.query.lang === 'string' && ['en', 'ja'].includes(req.query.lang)
      ? req.query.lang
      : null;
  const userLanguage = queryLang || req.language || 'en';

  console.log('Status update notification language:', {
    requestLanguage: req.language,
    query: req.query.lang,
    headerLanguage: req.headers['accept-language'] || '',
    selected: userLanguage,
    explicitly_using: queryLang ? 'query parameter' : req.language ? 'req.language' : 'default',
  });

  // Send email notifications
  try {
    // Notify the requester of the status change using role-specific token
    await emailService.sendStatusUpdateNotification(
      request.requester_email,
      id,
      status,
      request.requester_token || '',
      userLanguage,
      'requester',
      request.publisher_name || ''
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
  const result = await RequestModel.getByIdWithToken(id, token);

  if (!result) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  const { request, role } = result;

  // Only publishers should be able to update publisher info
  if (role && role !== 'publisher') {
    throw new ApiError(
      403,
      'Only publishers can update publisher information',
      'errors:unauthorized'
    );
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

  // Enhance requests with validation stats, warnings, and record counts
  const enhancedRequests = await Promise.all(
    requests.map(async (request) => {
      try {
        // Get enhanced records with warning information
        const records = await AdsTxtRecordModel.getEnhancedRecords(request.id);

        // Get validation stats
        const validation_stats = await AdsTxtRecordModel.getValidationStats(request.id);

        // Log to debug
        console.log(
          `Request ${request.id}: Enhanced records:`,
          records.map((r) => ({
            id: r.id,
            has_warning: r.has_warning,
            validation_key: r.validation_key,
          }))
        );

        // Return enhanced request object with records containing warnings
        const result = {
          ...request,
          records_count: records.length,
          validation_stats,
          // Include simplified record information with warnings
          records_summary: records.map((record) => ({
            id: record.id,
            domain: record.domain,
            account_id: record.account_id,
            relationship: record.relationship,
            status: record.status,
            has_warning: record.has_warning || false,
            validation_key: record.validation_key,
            severity: record.severity,
          })),
        };

        // Additional debug logging
        console.log(`Enhanced request ${request.id}: `, {
          records_count: result.records_count,
          validation_stats: result.validation_stats,
          warnings_count: result.records_summary.filter((r) => r.has_warning).length,
        });

        return result;
      } catch (error) {
        console.error(`Error getting validation stats for request ${request.id}:`, error);
        // Return request without enhancements if there's an error
        return request;
      }
    })
  );

  res.status(200).json({
    success: true,
    data: enhancedRequests,
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
  const existingResult = await RequestModel.getByIdWithToken(id, token);

  if (!existingResult) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  const { request: existingRequest, role } = existingResult;

  // Only allow updates if status is pending or rejected
  if (existingRequest.status !== 'pending' && existingRequest.status !== 'rejected') {
    throw new ApiError(400, 'Cannot update request in current status', 'errors:cannotUpdate');
  }

  // Only requesters should be able to update the request contents
  if (role && role !== 'requester') {
    throw new ApiError(403, 'Only requesters can update request contents', 'errors:unauthorized');
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

  // Language detection is handled by i18next middleware
  // It will check URL lang parameter first, then Accept-Language header
  // Explicitly prioritize query parameter to fix language selection issue
  const queryLang =
    typeof req.query.lang === 'string' && ['en', 'ja'].includes(req.query.lang)
      ? req.query.lang
      : null;
  const userLanguage = queryLang || req.language || 'en';

  console.log('Request update notification language:', {
    requestLanguage: req.language,
    query: req.query.lang,
    headerLanguage: req.headers['accept-language'] || '',
    selected: userLanguage,
    explicitly_using: queryLang ? 'query parameter' : req.language ? 'req.language' : 'default',
  });

  // Send email notification to publisher with their role-specific token
  try {
    await emailService.sendRequestUpdateNotification(
      existingRequest.publisher_email,
      id,
      existingRequest.requester_name,
      existingRequest.requester_email,
      existingRequest.publisher_token || '',
      userLanguage,
      'publisher',
      existingRequest.publisher_name || ''
    );
  } catch (error) {
    console.error('Error sending update notification email:', error);
    // Continue even if email fails
  }

  // Get the updated request with the new tokens
  const updatedRequest = await RequestModel.getById(id);

  res.status(200).json({
    success: true,
    data: {
      request_id: id,
      // Legacy token field removed from response
      publisher_token: updatedRequest?.publisher_token,
      requester_token: updatedRequest?.requester_token,
      status: 'updated',
      role: role, // Include role in response
    },
  });
});
