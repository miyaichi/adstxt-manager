/**
 * Validation helper utilities using enhanced message system
 */

import {
  parseAdsTxtContent,
  crossCheckAdsTxtRecords,
  isAdsTxtRecord,
  ValidationMessage,
  createValidationMessage,
} from 'adstxt-validator';
import { messageService } from '../services/messageService';
import { ApiError } from '../middleware/errorHandler';

/**
 * Enhanced validation result with detailed messages
 */
export interface EnhancedValidationResult {
  isValid: boolean;
  records: any[];
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  summary: {
    totalRecords: number;
    validRecords: number;
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Validate ads.txt content with enhanced error messaging
 */
export async function validateAdsTxtWithMessages(
  content: string,
  publisherDomain?: string,
  sellersJsonProvider?: any,
  locale: string = 'ja'
): Promise<EnhancedValidationResult> {
  const warnings: ValidationMessage[] = [];
  const errors: ValidationMessage[] = [];

  // Check for empty content
  if (!content || content.trim().length === 0) {
    const errorMessage = messageService.getValidationMessage('emptyFile', [], locale);
    if (errorMessage) {
      errors.push(errorMessage);
    }

    return {
      isValid: false,
      records: [],
      warnings,
      errors,
      summary: {
        totalRecords: 0,
        validRecords: 0,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    };
  }

  try {
    // Parse content
    const parsedEntries = parseAdsTxtContent(content, publisherDomain);
    const recordEntries = parsedEntries.filter(isAdsTxtRecord);

    // Process validation results
    for (const entry of parsedEntries) {
      if (!entry.is_valid && entry.validation_key) {
        const placeholders: string[] = [];

        // Extract placeholders based on validation type
        if ('domain' in entry) placeholders.push(entry.domain);
        if ('account_id' in entry) placeholders.push(entry.account_id);

        const validationMessage = messageService.getValidationMessage(
          entry.validation_key,
          placeholders,
          locale
        );

        if (validationMessage) {
          if (entry.severity === 'error') {
            errors.push(validationMessage);
          } else {
            warnings.push(validationMessage);
          }
        }
      }
    }

    // Cross-check with sellers.json if provider is available
    let crossCheckedEntries = parsedEntries;
    if (sellersJsonProvider) {
      try {
        crossCheckedEntries = await crossCheckAdsTxtRecords(
          publisherDomain,
          parsedEntries,
          null,
          sellersJsonProvider
        );

        // Process cross-check validation results
        for (const entry of crossCheckedEntries) {
          if (isAdsTxtRecord(entry) && entry.validation_results) {
            const validationWarnings = extractValidationWarnings(
              entry,
              entry.validation_results,
              locale
            );
            warnings.push(...validationWarnings);
          }
        }
      } catch (error) {
        const errorMessage = messageService.getValidationMessage(
          'sellersJsonValidationError',
          [error instanceof Error ? error.message : 'Unknown error'],
          locale
        );
        if (errorMessage) {
          warnings.push(errorMessage);
        }
      }
    }

    const validRecords = recordEntries.filter((entry) => entry.is_valid).length;

    return {
      isValid: errors.length === 0,
      records: crossCheckedEntries,
      warnings,
      errors,
      summary: {
        totalRecords: recordEntries.length,
        validRecords,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    };
  } catch (error) {
    const errorMessage = messageService.getValidationMessage(
      'parsingError',
      [error instanceof Error ? error.message : 'Unknown parsing error'],
      locale
    );

    if (errorMessage) {
      errors.push(errorMessage);
    }

    return {
      isValid: false,
      records: [],
      warnings,
      errors,
      summary: {
        totalRecords: 0,
        validRecords: 0,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    };
  }
}

/**
 * Extract validation warnings from cross-check results
 */
function extractValidationWarnings(
  entry: any,
  validationResults: any,
  locale: string
): ValidationMessage[] {
  const warnings: ValidationMessage[] = [];

  if (!validationResults.hasSellerJson) {
    const warning = messageService.getValidationMessage('noSellersJson', [entry.domain], locale);
    if (warning) warnings.push(warning);
  }

  if (entry.relationship === 'DIRECT' && !validationResults.directAccountIdInSellersJson) {
    const warning = messageService.getValidationMessage(
      'directAccountIdNotInSellersJson',
      [entry.account_id],
      locale
    );
    if (warning) warnings.push(warning);
  }

  if (entry.relationship === 'RESELLER' && !validationResults.resellerAccountIdInSellersJson) {
    const warning = messageService.getValidationMessage(
      'resellerAccountIdNotInSellersJson',
      [entry.account_id],
      locale
    );
    if (warning) warnings.push(warning);
  }

  if (validationResults.directDomainMatchesSellerJsonEntry === false) {
    const warning = messageService.getValidationMessage(
      'domainMismatch',
      [validationResults.sellerData?.domain || 'unknown'],
      locale
    );
    if (warning) warnings.push(warning);
  }

  if (validationResults.directEntryHasPublisherType === false) {
    const warning = messageService.getValidationMessage(
      'directNotPublisher',
      [entry.account_id],
      locale
    );
    if (warning) warnings.push(warning);
  }

  if (validationResults.resellerEntryHasIntermediaryType === false) {
    const warning = messageService.getValidationMessage(
      'resellerNotIntermediary',
      [entry.account_id],
      locale
    );
    if (warning) warnings.push(warning);
  }

  if (
    validationResults.directSellerIdIsUnique === false ||
    validationResults.resellerSellerIdIsUnique === false
  ) {
    const warning = messageService.getValidationMessage(
      'sellerIdNotUnique',
      [entry.account_id],
      locale
    );
    if (warning) warnings.push(warning);
  }

  return warnings;
}

/**
 * Create API error with enhanced messaging
 */
export function createValidationApiError(
  statusCode: number,
  validationKey: string,
  placeholders: string[] = [],
  locale: string = 'ja'
): ApiError {
  const errorInfo = messageService.formatApiError(validationKey, placeholders, locale);
  return new ApiError(statusCode, errorInfo.message, validationKey, { placeholders });
}

/**
 * Format validation summary for API response
 */
export function formatValidationSummary(
  result: EnhancedValidationResult,
  locale: string = 'ja'
): {
  isValid: boolean;
  summary: any;
  messages: {
    errors: Array<{
      message: string;
      key: string;
      severity: string;
      helpUrl?: string;
    }>;
    warnings: Array<{
      message: string;
      key: string;
      severity: string;
      helpUrl?: string;
    }>;
  };
} {
  return {
    isValid: result.isValid,
    summary: result.summary,
    messages: {
      errors: result.errors.map((error) => ({
        message: error.message,
        key: error.key,
        severity: error.severity,
        helpUrl: error.helpUrl,
      })),
      warnings: result.warnings.map((warning) => ({
        message: warning.message,
        key: warning.key,
        severity: warning.severity,
        helpUrl: warning.helpUrl,
      })),
    },
  };
}
