import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../../../middleware/errorHandler';
import { parseAdsTxtContent } from '@adstxt-manager/ads-txt-validator';
import { createValidationApiError } from '../../../utils/validationHelper';
import logger from '../../../utils/logger';

/**
 * Quick validation endpoint - fast syntax-only validation without sellers.json cross-checking
 * Endpoint: POST /api/v1/adstxt/validate/quick
 *
 * This endpoint is optimized for speed:
 * - No database queries
 * - No sellers.json cross-checking
 * - Only syntax validation and duplicate detection
 *
 * Use this for real-time validation UX where speed is critical.
 */
export const validateQuick = asyncHandler(async (req: Request, res: Response) => {
  const { content, checkDuplicates = true } = req.body;

  if (!content || typeof content !== 'string') {
    throw new ApiError(400, 'Content is required', 'errors:missingFields.adsTxtContent');
  }

  try {
    // Parse content - this is fast and doesn't hit the database
    const parsedEntries = parseAdsTxtContent(content);

    // Filter to get only record entries (not variables or comments)
    const recordEntries = parsedEntries.filter(
      (entry) => 'domain' in entry && 'account_id' in entry && 'relationship' in entry
    );

    // Filter to get variables
    const variableEntries = parsedEntries.filter((entry) => 'variable_type' in entry);

    // Count valid and invalid records
    const validRecords = recordEntries.filter((r) => r.is_valid).length;
    const invalidRecords = recordEntries.filter((r) => !r.is_valid).length;

    // Collect errors
    const errors = parsedEntries
      .filter((entry) => !entry.is_valid && entry.validation_key)
      .map((entry) => ({
        line: entry.line_number || 0,
        message: entry.validation_key || 'Unknown error',
        severity: entry.severity || 'error',
      }));

    // Check for internal duplicates if requested
    let duplicateWarnings: any[] = [];
    if (checkDuplicates && recordEntries.length > 0) {
      const seen = new Map<string, typeof recordEntries[0]>();

      for (const record of recordEntries) {
        if (!record.is_valid) continue;

        const key = `${record.domain}|${record.account_id}|${record.relationship}`.toLowerCase();

        if (seen.has(key)) {
          duplicateWarnings.push({
            line: record.line_number || 0,
            message: `Duplicate entry: ${record.domain}, ${record.account_id}, ${record.relationship}`,
            severity: 'warning',
            original_line: seen.get(key)?.line_number || 0,
          });
        } else {
          seen.set(key, record);
        }
      }
    }

    // Calculate statistics
    const totalLines = content.split('\n').length;
    const commentLines = content.split('\n').filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('#') || trimmed === '';
    }).length;

    res.status(200).json({
      success: true,
      data: {
        isValid: errors.length === 0,
        records: recordEntries,
        errors,
        warnings: duplicateWarnings,
        statistics: {
          totalLines,
          validRecords,
          invalidRecords,
          variables: variableEntries.length,
          comments: commentLines,
          duplicates: duplicateWarnings.length,
        },
      },
    });
  } catch (error: unknown) {
    logger.error('Error in quick validation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid format';
    throw createValidationApiError(400, 'parsingError', [errorMessage], 'ja');
  }
});
