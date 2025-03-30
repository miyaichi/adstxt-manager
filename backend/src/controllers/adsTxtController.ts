import { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler';
import AdsTxtRecordModel from '../models/AdsTxtRecord';
import RequestModel from '../models/Request';
import { crossCheckAdsTxtRecords, parseAdsTxtContent } from '../utils/validation';

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
      let parsedRecords = parseAdsTxtContent(fileContent);

      // If publisher domain is provided, perform duplicate check (as warnings)
      const publisherDomain = req.body.publisherDomain;
      if (publisherDomain) {
        parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
      }

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
      throw new ApiError(
        400,
        `Error parsing Ads.txt file: ${errorMessage}`,
        'errors:parsingError',
        {
          message: errorMessage,
        }
      );
    }
  }

  // Check for text content in request body
  if (!req.body.adsTxtContent) {
    throw new ApiError(400, 'No content provided', 'errors:noContentProvided');
  }

  try {
    const content = req.body.adsTxtContent;
    const publisherDomain = req.body.publisherDomain;

    // Parse the content
    let parsedRecords = parseAdsTxtContent(content);

    // If publisher domain is provided, perform duplicate check (as warnings)
    if (publisherDomain) {
      // Force fetching fresh ads.txt data for the domain to ensure we have the latest
      try {
        console.log(`Force-fetching fresh ads.txt for domain: ${publisherDomain}`);
        const { default: AdsTxtCacheModel } = await import('../models/AdsTxtCache');

        // Force ads.txt fetch by calling the domain validation endpoint directly with force parameter
        const axios = (await import('axios')).default;
        const port = process.env.PORT || 4000; // Use consistent default port
        const cacheResponse = await axios.get(
          `http://localhost:${port}/api/adsTxtCache/domain/${encodeURIComponent(publisherDomain)}?force=true`
        );

        console.log(`Ads.txt cache response status: ${cacheResponse.status}`);
        console.log(
          `Ads.txt cache response data:`,
          JSON.stringify(cacheResponse.data).substring(0, 300) + '...'
        );

        console.log(`Performing duplicate check for domain: ${publisherDomain}`);

        // Log entry counts before cross-check
        const cachedData = await AdsTxtCacheModel.getByDomain(publisherDomain);
        if (cachedData && cachedData.content) {
          console.log(`Raw ads.txt content length: ${cachedData.content.length}`);
          const lines = cachedData.content.split('\n');
          console.log(`Total lines in ads.txt: ${lines.length}`);

          // Count interesting lines (non-comment, non-empty)
          const interestingLines = lines.filter((line) => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('#');
          });
          console.log(`Interesting (non-comment, non-empty) lines: ${interestingLines.length}`);

          // Print the first few entries containing ad-generation.jp
          const adGenLines = interestingLines.filter((line) =>
            line.toLowerCase().includes('ad-generation.jp')
          );
          console.log(`Lines containing ad-generation.jp: ${adGenLines.length}`);
          if (adGenLines.length > 0) {
            console.log('Sample ad-generation.jp lines:');
            adGenLines.slice(0, 5).forEach((line, i) => console.log(`  ${i + 1}: ${line}`));
          }
        }

        parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        console.log(`Processed ${parsedRecords.length} records after cross-check`);
        console.log(`Found ${parsedRecords.filter((r) => r.has_warning).length} duplicates`);
      } catch (err) {
        console.error(`Failed to perform cross-check: ${err}`);
        // Continue with cross-check even if force fetch fails
        try {
          parsedRecords = await crossCheckAdsTxtRecords(publisherDomain, parsedRecords);
        } catch (crossCheckErr) {
          console.error(`Cross-check also failed: ${crossCheckErr}`);
        }
      }
    }

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
    throw new ApiError(
      400,
      `Error parsing Ads.txt content: ${errorMessage}`,
      'errors:parsingError',
      {
        message: errorMessage,
      }
    );
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

  // Get requester info from the request
  const requesterName = request.requester_name;
  const requesterEmail = request.requester_email;

  // Format current date in a readable format
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD format

  // Generate the content with detailed comments
  let content = '# Ads.txt file generated by Ads.txt Manager\n';
  content += `# Generated on: ${currentDate.toISOString()}\n`;
  content += `# Requester: ${requesterName}\n`;
  content += `# Approved on: ${formattedDate}\n`;

  // Add description about the file
  content += '# The following entries have been approved for inclusion in your ads.txt file\n';
  content +=
    '# Format: domain, account_id, account_type, relationship[, certification_authority_id]\n\n';

  // Import needed for seller lookup
  const SellersJsonCacheModel = (await import('../models/SellersJsonCache')).default;

  // Group records by domain to reduce DB lookups
  const domainSellersJsonCache: Map<string, any> = new Map();

  // Process each approved record
  for (const record of approvedRecords) {
    let line = `${record.domain}, ${record.account_id}, ${record.account_type}, ${record.relationship}`;

    // Check if certification_authority_id already exists in the record
    if (record.certification_authority_id) {
      line += `, ${record.certification_authority_id}`;
    } else {
      // Try to find certification_authority_id from sellers.json if not present in record
      try {
        // Get sellers.json for the domain, either from cache or db
        let sellersJsonData;
        if (domainSellersJsonCache.has(record.domain)) {
          sellersJsonData = domainSellersJsonCache.get(record.domain);
        } else {
          const cachedSellersJson = await SellersJsonCacheModel.getByDomain(record.domain);
          if (
            cachedSellersJson &&
            cachedSellersJson.status === 'success' &&
            cachedSellersJson.content
          ) {
            sellersJsonData = SellersJsonCacheModel.parseContent(cachedSellersJson.content);
            domainSellersJsonCache.set(record.domain, sellersJsonData);
          }
        }

        // If we have valid sellers.json data and identifiers are present
        if (
          sellersJsonData &&
          sellersJsonData.identifiers &&
          Array.isArray(sellersJsonData.identifiers)
        ) {
          // Look for a TAG-ID (Trustworthy Accountability Group) identifier
          const tagIdEntry = sellersJsonData.identifiers.find(
            (id: any) => id.name && id.name.toLowerCase().includes('tag-id')
          );

          if (tagIdEntry && tagIdEntry.value) {
            line += `, ${tagIdEntry.value}`;
            // Add a comment to indicate this was auto-added from sellers.json
            line += ' # Certification Authority ID added from sellers.json';
          }
        }
      } catch (error) {
        // If there's an error, just continue without the certification authority ID
        console.error(`Error getting certification authority ID for ${record.domain}:`, error);
      }
    }

    content += line + '\n';
  }

  // Set the content type for downloading as a text file
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="ads.txt"');

  res.status(200).send(content);
});
