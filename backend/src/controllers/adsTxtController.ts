import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel from '../models/AdsTxtRecord';
import RequestModel from '../models/Request';
import { parseAdsTxtContent } from '../utils/validation';

/**
 * Update the status of an Ads.txt record
 * @route PATCH /api/adstxt/:id/status
 */
export const updateRecordStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, token } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    throw new ApiError(
      400,
      'Valid status is required (pending, approved, or rejected)',
      'errors:invalidStatus'
    );
  }

  // Get the record first to find its request_id
  const record = await AdsTxtRecordModel.getById(id);

  if (!record) {
    throw new ApiError(404, 'Ads.txt record not found', 'errors:recordNotFound');
  }

  // Verify the token with the associated request
  const request = await RequestModel.getByIdWithToken(record.request_id, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Update the status
  const updatedRecord = await AdsTxtRecordModel.updateStatus(
    id,
    status as 'pending' | 'approved' | 'rejected'
  );

  if (!updatedRecord) {
    throw new ApiError(500, 'Failed to update record status', 'errors:failedToUpdate.recordStatus');
  }

  res.status(200).json({
    success: true,
    data: updatedRecord,
  });
});

/**
 * Process Ads.txt content (from file upload or text input)
 * @route POST /api/adstxt/process
 */
export const processAdsTxtFile = asyncHandler(async (req: Request, res: Response) => {
  // Check for file upload first
  if (req.file) {
    try {
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf8');

      // Parse the content
      const parsedRecords = parseAdsTxtContent(fileContent);

      res.status(200).json({
        success: true,
        data: {
          records: parsedRecords,
          totalRecords: parsedRecords.length,
          validRecords: parsedRecords.filter((r) => r.is_valid).length,
          invalidRecords: parsedRecords.filter((r) => !r.is_valid).length,
        },
      });
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid format';
      throw new ApiError(400, `Error parsing Ads.txt file: ${errorMessage}`, 'errors:parsingError', {
        message: errorMessage,
      });
    }
  }

  // Check for text content in request body
  if (!req.body.adsTxtContent) {
    throw new ApiError(400, 'No content provided', 'errors:noContentProvided');
  }

  try {
    const content = req.body.adsTxtContent;
    
    // Parse the content
    const parsedRecords = parseAdsTxtContent(content);

    res.status(200).json({
      success: true,
      data: {
        records: parsedRecords,
        totalRecords: parsedRecords.length,
        validRecords: parsedRecords.filter((r) => r.is_valid).length,
        invalidRecords: parsedRecords.filter((r) => !r.is_valid).length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid format';
    throw new ApiError(400, `Error parsing Ads.txt content: ${errorMessage}`, 'errors:parsingError', {
      message: errorMessage,
    });
  }
});

/**
 * Get all Ads.txt records for a request
 * @route GET /api/adstxt/request/:requestId
 */
export const getRecordsByRequestId = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(requestId, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get all records for the request
  const records = await AdsTxtRecordModel.getByRequestId(requestId);

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * Generate Ads.txt content for approved records
 * @route GET /api/adstxt/generate/:requestId
 */
export const generateAdsTxtContent = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new ApiError(401, 'Access token is required', 'errors:accessTokenRequired');
  }

  // Verify the token and request
  const request = await RequestModel.getByIdWithToken(requestId, token);

  if (!request) {
    throw new ApiError(404, 'Request not found or invalid token', 'errors:notFoundOrInvalidToken');
  }

  // Get approved records for the request
  const records = await AdsTxtRecordModel.getByRequestId(requestId);
  const approvedRecords = records.filter((record) => record.status === 'approved');

  // Generate the content
  let content = '# Ads.txt file generated by Ads.txt Manager\n';
  content += `# Generated on: ${new Date().toISOString()}\n\n`;

  approvedRecords.forEach((record) => {
    let line = `${record.domain}, ${record.account_id}, ${record.account_type}, ${record.relationship}`;
    if (record.certification_authority_id) {
      line += `, ${record.certification_authority_id}`;
    }
    content += line + '\n';
  });

  // Set the content type for downloading as a text file
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="ads.txt"');

  res.status(200).send(content);
});
