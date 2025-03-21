import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel, { CreateAdsTxtRecordDTO } from '../models/AdsTxtRecord';
import RequestModel, { CreateRequestDTO } from '../models/Request';
import emailService from '../services/emailService';
import { isValidEmail, parseAdsTxtContent } from '../utils/validation';

/**
 * Create a new request
 * @route POST /api/requests
 */
export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const { publisher_email, requester_email, requester_name, publisher_name, publisher_domain } = req.body;
  
  // Validate required fields
  if (!publisher_email || !requester_email || !requester_name) {
    throw new ApiError(400, 'Publisher email, requester email, and requester name are required');
  }
  
  // Validate email addresses
  if (!isValidEmail(publisher_email) || !isValidEmail(requester_email)) {
    throw new ApiError(400, 'Invalid email address');
  }
  
  // Check for Ads.txt records in the request
  if (!req.file && (!req.body.records || !Array.isArray(req.body.records) || req.body.records.length === 0)) {
    throw new ApiError(400, 'Ads.txt records are required (either file upload or JSON data)');
  }
  
  // Create the request
  const requestData: CreateRequestDTO = {
    publisher_email,
    requester_email,
    requester_name,
    publisher_name,
    publisher_domain
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
      const validRecords = parsedRecords.filter(record => record.is_valid);
      
      if (validRecords.length === 0) {
        throw new ApiError(400, 'No valid Ads.txt records found in the uploaded file');
      }
      
      // Convert to DTOs
      adsTxtRecords = validRecords.map(record => ({
        request_id: request.id,
        domain: record.domain,
        account_id: record.account_id,
        account_type: record.account_type,
        certification_authority_id: record.certification_authority_id,
        relationship: record.relationship
      }));
    } catch (error) {
      throw new ApiError(400, `Error parsing Ads.txt file: ${error.message || 'Invalid format'}`);
    }
  } else if (req.body.records) {
    // Process JSON records
    adsTxtRecords = req.body.records.map((record: any) => ({
      request_id: request.id,
      domain: record.domain,
      account_id: record.account_id,
      account_type: record.account_type,
      certification_authority_id: record.certification_authority_id,
      relationship: record.relationship || 'DIRECT'
    }));
  }
  
  // Store the records
  await AdsTxtRecordModel.bulkCreate(adsTxtRecords);
  
  // Send notification emails
  try {
    await Promise.all([
      emailService.sendPublisherRequestNotification(
        publisher_email,
        request.id,
        requester_name,
        requester_email,
        request.token
      ),
      emailService.sendRequesterConfirmation(
        requester_email,
        requester_name,
        publisher_email,
        request.id,
        request.token
      )
    ]);
  } catch (error) {
    console.error('Error sending emails:', error);
    // Continue even if emails fail - we'll log but not fail the request
  }
  
  res.status(201).json({
    success: true,
    data: {
      request_id: request.id,
      token: request.token
    }
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
    throw new ApiError(401, 'Access token is required');
  }
  
  const request = await RequestModel.getByIdWithToken(id, token);
  
  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token');
  }
  
  // Get associated Ads.txt records
  const adsTxtRecords = await AdsTxtRecordModel.getByRequestId(id);
  
  res.status(200).json({
    success: true,
    data: {
      request,
      records: adsTxtRecords
    }
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
    throw new ApiError(401, 'Access token is required');
  }
  
  if (!status || !['pending', 'approved', 'rejected', 'updated'].includes(status)) {
    throw new ApiError(400, 'Valid status is required (pending, approved, rejected, or updated)');
  }
  
  // Verify the token
  const request = await RequestModel.getByIdWithToken(id, token);
  
  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token');
  }
  
  // Update the status
  const updatedRequest = await RequestModel.updateStatus(id, status as any);
  
  if (!updatedRequest) {
    throw new ApiError(500, 'Failed to update request status');
  }
  
  // When approving a request, update all pending Ads.txt records to approved
  if (status === 'approved') {
    const records = await AdsTxtRecordModel.getByRequestId(id);
    await Promise.all(
      records
        .filter(record => record.status === 'pending')
        .map(record => AdsTxtRecordModel.updateStatus(record.id, 'approved'))
    );
  }
  
  // Send email notifications
  try {
    // Notify the requester of the status change
    await emailService.sendStatusUpdateNotification(
      request.requester_email,
      id,
      status,
      request.token
    );
  } catch (error) {
    console.error('Error sending status update email:', error);
    // Continue even if emails fail
  }
  
  res.status(200).json({
    success: true,
    data: updatedRequest
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
    throw new ApiError(401, 'Access token is required');
  }
  
  if (!publisher_name || !publisher_domain) {
    throw new ApiError(400, 'Publisher name and domain are required');
  }
  
  // Verify the token
  const request = await RequestModel.getByIdWithToken(id, token);
  
  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token');
  }
  
  // Update publisher info
  const updatedRequest = await RequestModel.updatePublisherInfo(id, publisher_name, publisher_domain);
  
  if (!updatedRequest) {
    throw new ApiError(500, 'Failed to update publisher information');
  }
  
  res.status(200).json({
    success: true,
    data: updatedRequest
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
    throw new ApiError(400, 'Invalid email address');
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
    data: requests
  });
});