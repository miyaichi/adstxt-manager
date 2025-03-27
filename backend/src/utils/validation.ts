import * as psl from 'psl';

/**
 * Utility to validate and parse Ads.txt data
 */

// Error key constants to avoid string literals
export const ERROR_KEYS = {
  MISSING_FIELDS: 'errors:adsTxtValidation.missingFields',
  INVALID_FORMAT: 'errors:adsTxtValidation.invalidFormat',
  INVALID_RELATIONSHIP: 'errors:adsTxtValidation.invalidRelationship',
  MISSPELLED_RELATIONSHIP: 'errors:adsTxtValidation.misspelledRelationship',
  INVALID_ROOT_DOMAIN: 'errors:adsTxtValidation.invalidRootDomain',
  EMPTY_ACCOUNT_ID: 'errors:adsTxtValidation.emptyAccountId',
  DUPLICATE_ENTRY: 'errors:adsTxtValidation.duplicateEntry',
  DUPLICATE_ENTRY_CASE_INSENSITIVE: 'errors:adsTxtValidation.duplicateEntryCaseInsensitive',
  NO_SELLERS_JSON: 'errors:adsTxtValidation.noSellersJson',
  DIRECT_ACCOUNT_ID_NOT_IN_SELLERS_JSON: 'errors:adsTxtValidation.directAccountIdNotInSellersJson',
  RESELLER_ACCOUNT_ID_NOT_IN_SELLERS_JSON:
    'errors:adsTxtValidation.resellerAccountIdNotInSellersJson',
  DOMAIN_MISMATCH: 'errors:adsTxtValidation.domainMismatch',
  DIRECT_NOT_PUBLISHER: 'errors:adsTxtValidation.directNotPublisher',
  SELLER_ID_NOT_UNIQUE: 'errors:adsTxtValidation.sellerIdNotUnique',
  RESELLER_NOT_INTERMEDIARY: 'errors:adsTxtValidation.resellerNotIntermediary',
  SELLERS_JSON_VALIDATION_ERROR: 'errors:adsTxtValidation.sellersJsonValidationError',
};

export interface ParsedAdsTxtRecord {
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  line_number: number;
  raw_line: string;
  is_valid: boolean;
  error?: string;
  has_warning?: boolean;
  warning?: string;
  warning_params?: Record<string, any>; // Parameters for the warning message
  duplicate_domain?: string; // Store duplicate domain without overwriting original domain
  all_warnings?: Array<{ key: string; params?: Record<string, any> }>; // To store multiple warnings
  validation_results?: CrossCheckValidationResult; // Store detailed validation results
  validation_error?: string; // Store any error during validation
}

/**
 * Creates an invalid record with specified error
 */
function createInvalidRecord(
  partialRecord: Partial<ParsedAdsTxtRecord>,
  errorKey: string
): ParsedAdsTxtRecord {
  return {
    domain: partialRecord.domain || '',
    account_id: partialRecord.account_id || '',
    account_type: partialRecord.account_type || '',
    relationship: partialRecord.relationship || 'DIRECT',
    line_number: partialRecord.line_number || 0,
    raw_line: partialRecord.raw_line || '',
    is_valid: false,
    error: errorKey,
    ...partialRecord, // Allow overriding defaults
  };
}

/**
 * Parse and validate a line from an Ads.txt file
 * @param line - The raw line from the file
 * @param lineNumber - The line number in the file (for error reporting)
 * @returns A parsed record with validation status
 */
export function parseAdsTxtLine(line: string, lineNumber: number): ParsedAdsTxtRecord | null {
  // Trim whitespace and ignore empty lines or comments
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  // Split the line into its components
  // Format: domain, account_id, type, [certification_authority_id]
  const parts = trimmedLine.split(',').map((part) => part.trim());

  // Basic validation - must have at least domain, account ID, and type
  if (parts.length < 3) {
    return createInvalidRecord(
      {
        domain: parts[0] || '',
        account_id: parts[1] || '',
        account_type: parts[2] || '',
        line_number: lineNumber,
        raw_line: line,
      },
      ERROR_KEYS.MISSING_FIELDS
    );
  }

  // Check for invalid format (no commas)
  if (parts.length === 1 && parts[0] === trimmedLine) {
    return createInvalidRecord(
      {
        domain: parts[0],
        line_number: lineNumber,
        raw_line: line,
      },
      ERROR_KEYS.INVALID_FORMAT
    );
  }

  // Extract and normalize the values
  const [domain, accountId, accountType, ...rest] = parts;

  // Process relationship and certification authority ID
  const { relationship, certAuthorityId, error } = processRelationship(accountType, rest);

  if (error) {
    return createInvalidRecord(
      {
        domain,
        account_id: accountId,
        account_type: accountType,
        certification_authority_id: certAuthorityId,
        relationship,
        line_number: lineNumber,
        raw_line: line,
      },
      error
    );
  }

  // Validate domain using PSL
  if (!isValidRootDomain(domain)) {
    return createInvalidRecord(
      {
        domain,
        account_id: accountId,
        account_type: accountType,
        certification_authority_id: certAuthorityId,
        relationship,
        line_number: lineNumber,
        raw_line: line,
      },
      ERROR_KEYS.INVALID_ROOT_DOMAIN
    );
  }

  // Validate account ID (must not be empty)
  if (!accountId) {
    return createInvalidRecord(
      {
        domain,
        account_id: accountId,
        account_type: accountType,
        certification_authority_id: certAuthorityId,
        relationship,
        line_number: lineNumber,
        raw_line: line,
      },
      ERROR_KEYS.EMPTY_ACCOUNT_ID
    );
  }

  // Return the valid record
  return {
    domain,
    account_id: accountId,
    account_type: accountType,
    certification_authority_id: certAuthorityId,
    relationship,
    line_number: lineNumber,
    raw_line: line,
    is_valid: true,
  };
}

/**
 * Process relationship and certification authority ID from Ads.txt line parts
 */
function processRelationship(
  accountType: string,
  rest: string[]
): {
  relationship: 'DIRECT' | 'RESELLER';
  certAuthorityId?: string;
  error?: string;
} {
  const upperAccountType = accountType.toUpperCase();
  let relationship: 'DIRECT' | 'RESELLER' = 'DIRECT';
  let certAuthorityId: string | undefined;
  let error: string | undefined;

  // Check if accountType contains the relationship
  if (upperAccountType === 'DIRECT' || upperAccountType === 'RESELLER') {
    relationship = upperAccountType as 'DIRECT' | 'RESELLER';
  } else if (
    upperAccountType !== 'DIRECT' &&
    upperAccountType !== 'RESELLER' &&
    !['DIRECT', 'RESELLER'].includes(rest[0]?.toUpperCase())
  ) {
    // Invalid relationship type
    return {
      relationship,
      error: ERROR_KEYS.INVALID_RELATIONSHIP,
    };
  }

  // Process remaining parts
  if (rest.length > 0) {
    // The next part could be relationship or cert authority
    const firstRest = rest[0].toUpperCase();
    if (firstRest === 'DIRECT' || firstRest === 'RESELLER') {
      relationship = firstRest as 'DIRECT' | 'RESELLER';
      if (rest.length > 1) {
        certAuthorityId = rest[1];
      }
    } else {
      // Check if it's a misspelled relationship type
      if (isSimilarToRelationship(firstRest)) {
        return {
          relationship,
          certAuthorityId: rest.length > 1 ? rest[1] : undefined,
          error: ERROR_KEYS.MISSPELLED_RELATIONSHIP,
        };
      }
      certAuthorityId = rest[0];
    }
  }

  return { relationship, certAuthorityId };
}

/**
 * Checks if a domain is a valid root domain
 */
function isValidRootDomain(domain: string): boolean {
  const isValidRoot = psl.isValid(domain);
  const parsed = psl.parse(domain);

  // A domain is a root domain if it's valid and the input domain equals the parsed domain
  // (not a subdomain like sub.example.com)
  const isRootDomain = isValidRoot && parsed && 'domain' in parsed && parsed.domain === domain;

  return isRootDomain && !domain.includes(' ');
}

/**
 * Parse and validate a complete Ads.txt file
 * @param content - The full content of the Ads.txt file
 * @returns Array of parsed records with validation status
 */
export function parseAdsTxtContent(content: string): ParsedAdsTxtRecord[] {
  const lines = content.split('\n');
  const records: ParsedAdsTxtRecord[] = [];

  lines.forEach((line, index) => {
    const parsedRecord = parseAdsTxtLine(line, index + 1);
    if (parsedRecord) {
      records.push(parsedRecord);
    }
  });

  return records;
}

/**
 * Creates a warning record with specified parameters
 */
function createWarningRecord(
  record: ParsedAdsTxtRecord,
  warningKey: string,
  params: Record<string, any> = {},
  additionalProps: Partial<ParsedAdsTxtRecord> = {}
): ParsedAdsTxtRecord {
  return {
    ...record,
    is_valid: true, // Keep record valid but mark with warning
    has_warning: true,
    warning: warningKey,
    warning_params: params,
    ...additionalProps,
  };
}

/**
 * Creates a duplicate warning record
 */
function createDuplicateWarningRecord(
  record: ParsedAdsTxtRecord,
  publisherDomain: string,
  warningKey: string
): ParsedAdsTxtRecord {
  return createWarningRecord(
    record,
    warningKey,
    { domain: publisherDomain },
    {
      duplicate_domain: publisherDomain, // Store the domain where the duplicate was found
    }
  );
}

/**
 * Logger helper to standardize logging
 */
export type Logger = {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
};

/**
 * Create a standard logger
 */
function createLogger(): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    info: console.log,
    error: console.error,
    debug: isDevelopment ? console.log : () => {},
  };
}

/**
 * Interface for sellers.json seller record
 */
export interface SellersJsonSellerRecord {
  seller_id: string;
  name?: string;
  domain?: string;
  seller_type?: 'PUBLISHER' | 'INTERMEDIARY' | 'BOTH';
  is_confidential?: 0 | 1;
  [key: string]: any;
}

/**
 * Validation results for cross-checking ads.txt with sellers.json
 */
export interface CrossCheckValidationResult {
  // Case 1: Does the advertising system have a sellers.json file?
  hasSellerJson: boolean;
  // Case 2: Is the publisher account ID listed as a seller_id in the sellers.json file?
  accountIdInSellersJson: boolean;
  // Case 3: Does the sellers.json entry for this seller_id have matching domain?
  domainMatchesSellerJsonEntry: boolean | null; // null if domain is confidential or missing
  // Case 4: For DIRECT entries, is the seller_type PUBLISHER?
  directEntryHasPublisherType: boolean | null; // null if not a DIRECT entry
  // Case 5: Is the seller_id unique in the sellers.json file?
  sellerIdIsUnique: boolean;
  // Case 6: For RESELLER entries, is the publisher account ID listed as a seller_id?
  resellerAccountIdInSellersJson: boolean | null; // null if not a RESELLER entry
  // Case 7: For RESELLER entries, is the seller_type INTERMEDIARY?
  resellerEntryHasIntermediaryType: boolean | null; // null if not a RESELLER entry
  // Case 8: For RESELLER entries, is the seller_id unique?
  resellerSellerIdIsUnique: boolean | null; // null if not a RESELLER entry

  // Raw seller data for reference
  sellerData?: SellersJsonSellerRecord | null;
  // Error if any occurred during validation
  error?: string;
}

/**
 * Cross-check parsed Ads.txt records against publisher domain and sellers.json data
 * This function checks both duplicate entries between submitted records and
 * existing ads.txt records, and also validates against sellers.json specifications
 *
 * @param publisherDomain - The publisher's domain for cross-checking
 * @param parsedRecords - The parsed Ads.txt records to check
 * @returns The validated/filtered records with duplicate entries and sellers.json validation results
 */
export async function crossCheckAdsTxtRecords(
  publisherDomain: string | undefined,
  parsedRecords: ParsedAdsTxtRecord[]
): Promise<ParsedAdsTxtRecord[]> {
  const logger = createLogger();

  logger.info('=== crossCheckAdsTxtRecords called with ===');
  logger.info(`publisherDomain: ${publisherDomain}`);
  logger.info(`parsedRecords: ${parsedRecords.length}`);

  // If no publisher domain provided, can't do cross-check
  if (!publisherDomain) {
    logger.info('No publisher domain provided, skipping cross-check');
    return parsedRecords;
  }

  try {
    // Import needed modules here to avoid circular dependencies
    const { default: AdsTxtCacheModel } = await import('../models/AdsTxtCache');
    const { default: SellersJsonCacheModel } = await import('../models/SellersJsonCache');

    // Step 1: Check for duplicates with existing ads.txt records
    let resultRecords = await checkForDuplicates(
      publisherDomain,
      parsedRecords,
      AdsTxtCacheModel,
      logger
    );

    // Step 2: Validate against sellers.json data
    return await validateAgainstSellersJson(
      publisherDomain,
      resultRecords,
      SellersJsonCacheModel,
      logger
    );
  } catch (error) {
    // If there's any error during cross-check, log it but return records as-is
    logger.error('Error during ads.txt cross-check:', error);
    return parsedRecords;
  }
}

/**
 * Check for duplicates in existing ads.txt records
 */
export async function checkForDuplicates(
  publisherDomain: string,
  parsedRecords: ParsedAdsTxtRecord[],
  AdsTxtCacheModel: any,
  logger: Logger
): Promise<ParsedAdsTxtRecord[]> {
  logger.info(`Starting cross-check with publisher domain: ${publisherDomain}`);

  // Log sample of input records
  logSampleRecords(parsedRecords, logger);

  // Attempt to get cached ads.txt for the publisher domain
  logger.info(`Fetching cached ads.txt data for ${publisherDomain}`);
  const cachedData = await AdsTxtCacheModel.getByDomain(publisherDomain);
  logger.info(`Cached data found: ${!!cachedData}, status: ${cachedData?.status}`);

  // Create result array that we'll populate with validation results
  let resultRecords = [...parsedRecords];

  // Check for duplicates if we have valid cached data
  if (cachedData && cachedData.status === 'success' && cachedData.content) {
    logger.info(`Cached content length: ${cachedData.content.length}`);

    // Parse the cached ads.txt content
    const existingRecords = parseAdsTxtContent(cachedData.content);

    // Log sample of existing records
    logger.info("Sample of records from publisher's ads.txt:");
    existingRecords.slice(0, 3).forEach((record, i) => {
      logger.info(
        `  ${i + 1}: domain=${record.domain}, account_id=${record.account_id}, type=${record.account_type}, relationship=${record.relationship}, valid=${record.is_valid}`
      );
    });

    // Create lookup map from existing records
    const existingRecordMap = createExistingRecordsMap(existingRecords);
    logger.info(`Created lookup map with ${existingRecordMap.size} entries`);

    // Check for duplicates in input records
    resultRecords = findDuplicateRecords(parsedRecords, existingRecordMap, publisherDomain, logger);

    logger.info(
      `After duplicate check: ${resultRecords.length} records, ${resultRecords.filter((r) => r.has_warning).length} with warnings`
    );
  }

  return resultRecords;
}

/**
 * Log a sample of records for debugging
 */
function logSampleRecords(records: ParsedAdsTxtRecord[], logger: Logger) {
  records.slice(0, 5).forEach((record, i) => {
    logger.info(
      `Input record ${i + 1}: domain=${record.domain}, account_id=${record.account_id}, type=${record.account_type}, relationship=${record.relationship}`
    );
  });
}

/**
 * Create a map of existing records for faster lookup
 */
function createExistingRecordsMap(
  existingRecords: ParsedAdsTxtRecord[]
): Map<string, ParsedAdsTxtRecord> {
  const existingRecordMap = new Map<string, ParsedAdsTxtRecord>();

  for (const record of existingRecords) {
    if (record.is_valid) {
      // Make all comparisons case-insensitive for better matching
      // Use domain, account_id, account_type AND relationship for duplicate detection
      const domainLower = record.domain.toLowerCase();
      const accountTypeLower = record.account_type.toLowerCase();
      const key = `${domainLower}|${record.account_id}|${accountTypeLower}|${record.relationship}`;
      existingRecordMap.set(key, record);
    }
  }

  return existingRecordMap;
}

/**
 * Create lookup key for a record
 */
function createLookupKey(record: ParsedAdsTxtRecord): string {
  const lowerDomain = record.domain.toLowerCase();
  const accountTypeLower = record.account_type.toLowerCase();
  return `${lowerDomain}|${record.account_id}|${accountTypeLower}|${record.relationship}`;
}

/**
 * Find and mark duplicate records
 */
function findDuplicateRecords(
  records: ParsedAdsTxtRecord[],
  existingRecordMap: Map<string, ParsedAdsTxtRecord>,
  publisherDomain: string,
  logger: Logger
): ParsedAdsTxtRecord[] {
  logger.info(
    `Checking ${records.length} input records for duplicates against ${existingRecordMap.size} existing records`
  );

  // Log a sample of map keys for debugging
  const mapKeySample = Array.from(existingRecordMap.keys()).slice(0, 10);
  logger.debug(`Sample of existing map keys: ${JSON.stringify(mapKeySample)}`);

  return records.map((record) => {
    if (!record.is_valid) {
      return record; // Skip invalid records
    }

    // Create lookup key for this record
    const key = createLookupKey(record);

    // Check for exact duplicate
    if (existingRecordMap.has(key)) {
      logger.debug(`Found duplicate for: ${key}`);
      return createDuplicateWarningRecord(record, publisherDomain, ERROR_KEYS.DUPLICATE_ENTRY);
    }

    // Backup check for case-insensitive matches
    const caseInsensitiveDuplicate = checkForCaseInsensitiveDuplicate(record, existingRecordMap);

    if (caseInsensitiveDuplicate) {
      logger.debug(`Found case-insensitive duplicate: ${record.domain}`);
      return createDuplicateWarningRecord(
        record,
        publisherDomain,
        ERROR_KEYS.DUPLICATE_ENTRY_CASE_INSENSITIVE
      );
    }

    return record;
  });
}

/**
 * Check for case-insensitive duplicates
 */
function checkForCaseInsensitiveDuplicate(
  record: ParsedAdsTxtRecord,
  existingRecordMap: Map<string, ParsedAdsTxtRecord>
): boolean {
  const lowerCaseDomain = record.domain.toLowerCase();

  // Check each entry in the map for potential case-insensitive matches
  for (const [existingKey, existingRecord] of existingRecordMap.entries()) {
    const [existingDomain, existingAccountId, existingAccountType, existingRelationship] =
      existingKey.split('|');
    if (
      existingDomain.toLowerCase() === lowerCaseDomain &&
      existingAccountId === record.account_id &&
      existingAccountType.toLowerCase() === record.account_type.toLowerCase() &&
      existingRelationship === record.relationship
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Validate records against sellers.json
 */
async function validateAgainstSellersJson(
  publisherDomain: string,
  records: ParsedAdsTxtRecord[],
  SellersJsonCacheModel: any,
  logger: Logger
): Promise<ParsedAdsTxtRecord[]> {
  // Cache for sellers.json data and seller ID counts
  const sellersJsonCache = new Map<string, any>();
  const domainSellerIdCountsMap = new Map<string, Map<string, number>>();

  // Validate each record in parallel
  const recordsWithSellerValidation = await Promise.all(
    records.map(async (record) => {
      if (!record.is_valid) {
        return record; // Skip invalid records
      }

      try {
        return await validateSingleRecord(
          record,
          publisherDomain,
          sellersJsonCache,
          domainSellerIdCountsMap,
          SellersJsonCacheModel,
          logger
        );
      } catch (error: any) {
        logger.error(
          `Error validating against sellers.json for record (domain=${record.domain}, account_id=${record.account_id}):`,
          error
        );

        // Return the original record with error warning
        return createWarningRecord(
          record,
          ERROR_KEYS.SELLERS_JSON_VALIDATION_ERROR,
          {
            message: error.message,
            domain: record.domain,
          },
          {
            validation_error: error.message,
          }
        );
      }
    })
  );

  logger.info(
    `After sellers.json validation: ${recordsWithSellerValidation.length} records, ${recordsWithSellerValidation.filter((r) => r.has_warning).length} with warnings`
  );

  return recordsWithSellerValidation;
}

/**
 * Create a warning object with key and parameters
 */
function createWarning(key: string, params: Record<string, any>) {
  return { key, params };
}

/**
 * Validate a single record against sellers.json
 */
async function validateSingleRecord(
  record: ParsedAdsTxtRecord,
  publisherDomain: string,
  sellersJsonCache: Map<string, any>,
  domainSellerIdCountsMap: Map<string, Map<string, number>>,
  SellersJsonCacheModel: any,
  logger: Logger
): Promise<ParsedAdsTxtRecord> {
  // Extract advertising system domain from the record
  const adSystemDomain = record.domain.toLowerCase();

  // Initialize validation result
  const validationResult = createInitialValidationResult();

  // Get sellers.json data
  const sellersJsonData = await getSellersJsonData(
    adSystemDomain,
    sellersJsonCache,
    SellersJsonCacheModel,
    validationResult,
    logger
  );

  // If no sellers.json available, add warning and return
  if (!sellersJsonData || !Array.isArray(sellersJsonData.sellers)) {
    return createWarningRecord(
      record,
      ERROR_KEYS.NO_SELLERS_JSON,
      {
        domain: record.domain,
      },
      {
        validation_results: validationResult,
      }
    );
  }

  // Get seller ID counts for this domain
  const sellerIdCounts = getSellerIdCounts(
    adSystemDomain,
    domainSellerIdCountsMap,
    sellersJsonData.sellers
  );

  // Normalize account ID for comparison
  const normalizedAccountId = record.account_id.toString().trim();

  // Find matching seller record
  const matchingSeller = findMatchingSeller(sellersJsonData.sellers, normalizedAccountId);
  validationResult.sellerData = matchingSeller || null;

  // Case 2/6: Check if account_id is in sellers.json
  validationResult.accountIdInSellersJson = !!matchingSeller;

  // Run relationship-specific validations
  if (record.relationship === 'DIRECT') {
    validateDirectRelationship(
      validationResult,
      matchingSeller,
      publisherDomain,
      normalizedAccountId,
      sellerIdCounts
    );
  } else if (record.relationship === 'RESELLER') {
    validateResellerRelationship(
      validationResult,
      matchingSeller,
      normalizedAccountId,
      sellerIdCounts
    );
  }

  // Generate warnings based on validation results
  const warnings = generateWarnings(record, validationResult, publisherDomain);

  // Add warnings to record if any found
  if (warnings.length > 0) {
    return {
      ...record,
      has_warning: true,
      warning: warnings[0].key, // Primary warning key
      warning_params: warnings[0].params, // Parameters for primary warning
      all_warnings: warnings, // Store all warnings with params
      validation_results: validationResult, // Store all validation details
    };
  }

  // No warnings, but still attach the validation results
  return {
    ...record,
    validation_results: validationResult,
  };
}

/**
 * Create initial validation result object
 */
function createInitialValidationResult(): CrossCheckValidationResult {
  return {
    hasSellerJson: false,
    accountIdInSellersJson: false,
    domainMatchesSellerJsonEntry: null,
    directEntryHasPublisherType: null,
    sellerIdIsUnique: false,
    resellerAccountIdInSellersJson: null,
    resellerEntryHasIntermediaryType: null,
    resellerSellerIdIsUnique: null,
  };
}

/**
 * Get sellers.json data for a domain
 */
async function getSellersJsonData(
  adSystemDomain: string,
  sellersJsonCache: Map<string, any>,
  SellersJsonCacheModel: any,
  validationResult: CrossCheckValidationResult,
  logger: Logger
): Promise<any> {
  if (sellersJsonCache.has(adSystemDomain)) {
    return sellersJsonCache.get(adSystemDomain);
  }

  logger.info(`Fetching sellers.json for domain: ${adSystemDomain}`);
  const cachedSellersJson = await SellersJsonCacheModel.getByDomain(adSystemDomain);

  let sellersJsonData = null;
  if (cachedSellersJson && cachedSellersJson.status === 'success' && cachedSellersJson.content) {
    sellersJsonData = SellersJsonCacheModel.parseContent(cachedSellersJson.content);
    validationResult.hasSellerJson = true;
  } else {
    validationResult.hasSellerJson = false;
  }

  // Cache the result
  sellersJsonCache.set(adSystemDomain, sellersJsonData);
  return sellersJsonData;
}

/**
 * Get or create seller ID counts map for a domain
 */
function getSellerIdCounts(
  adSystemDomain: string,
  domainSellerIdCountsMap: Map<string, Map<string, number>>,
  sellers: SellersJsonSellerRecord[]
): Map<string, number> {
  if (domainSellerIdCountsMap.has(adSystemDomain)) {
    return domainSellerIdCountsMap.get(adSystemDomain)!;
  }

  // Create a new counts map for this domain
  const sellerIdCounts = new Map<string, number>();

  // Count seller IDs
  sellers.forEach((seller) => {
    if (seller.seller_id) {
      const currentId = seller.seller_id.toString().trim();
      sellerIdCounts.set(currentId, (sellerIdCounts.get(currentId) || 0) + 1);
    }
  });

  // Store in domain map
  domainSellerIdCountsMap.set(adSystemDomain, sellerIdCounts);
  return sellerIdCounts;
}

/**
 * Find a matching seller record in sellers.json
 */
function findMatchingSeller(
  sellers: SellersJsonSellerRecord[],
  normalizedAccountId: string
): SellersJsonSellerRecord | undefined {
  return sellers.find(
    (seller) => seller.seller_id && seller.seller_id.toString().trim() === normalizedAccountId
  );
}

/**
 * Validate a DIRECT relationship
 */
function validateDirectRelationship(
  validationResult: CrossCheckValidationResult,
  matchingSeller: SellersJsonSellerRecord | undefined,
  publisherDomain: string,
  normalizedAccountId: string,
  sellerIdCounts: Map<string, number>
): void {
  // Reset RESELLER-specific fields
  validationResult.resellerAccountIdInSellersJson = null;
  validationResult.resellerEntryHasIntermediaryType = null;
  validationResult.resellerSellerIdIsUnique = null;

  if (matchingSeller) {
    // Case 3: For DIRECT entries, check if domains match
    if (matchingSeller.is_confidential === 1 || !matchingSeller.domain) {
      validationResult.domainMatchesSellerJsonEntry = null; // Confidential or no domain
    } else {
      // Compare publisher domain with seller domain (case insensitive)
      const publisherDomainLower = publisherDomain.toLowerCase();
      const sellerDomainLower = matchingSeller.domain.toLowerCase();
      validationResult.domainMatchesSellerJsonEntry = publisherDomainLower === sellerDomainLower;
    }

    // Case 4: For DIRECT entries, check if seller_type is PUBLISHER
    const sellerType = matchingSeller.seller_type?.toUpperCase() || '';
    validationResult.directEntryHasPublisherType =
      sellerType === 'PUBLISHER' || sellerType === 'BOTH';

    // Case 5: Check if seller_id is unique in the file
    if (sellerIdCounts.has(normalizedAccountId)) {
      validationResult.sellerIdIsUnique = sellerIdCounts.get(normalizedAccountId)! === 1;
    } else {
      validationResult.sellerIdIsUnique = false;
    }
  } else {
    validationResult.sellerIdIsUnique = false;
  }
}

/**
 * Validate a RESELLER relationship
 */
function validateResellerRelationship(
  validationResult: CrossCheckValidationResult,
  matchingSeller: SellersJsonSellerRecord | undefined,
  normalizedAccountId: string,
  sellerIdCounts: Map<string, number>
): void {
  // Reset DIRECT-specific fields
  validationResult.directEntryHasPublisherType = null;
  validationResult.domainMatchesSellerJsonEntry = null;

  // Case 6: For RESELLER entries, check if account_id is in sellers.json
  validationResult.resellerAccountIdInSellersJson = !!matchingSeller;

  if (matchingSeller) {
    // Case 7: For RESELLER entries, check if seller_type is INTERMEDIARY
    const sellerType = matchingSeller.seller_type?.toUpperCase() || '';
    validationResult.resellerEntryHasIntermediaryType =
      sellerType === 'INTERMEDIARY' || sellerType === 'BOTH';

    // Case 8: Check if seller_id is unique in the file
    if (sellerIdCounts.has(normalizedAccountId)) {
      validationResult.resellerSellerIdIsUnique = sellerIdCounts.get(normalizedAccountId)! === 1;
    } else {
      validationResult.resellerSellerIdIsUnique = false;
    }
  } else {
    validationResult.resellerEntryHasIntermediaryType = null;
    validationResult.resellerSellerIdIsUnique = false;
  }
}

/**
 * Generate warnings based on validation results
 */
function generateWarnings(
  record: ParsedAdsTxtRecord,
  validationResult: CrossCheckValidationResult,
  publisherDomain: string
): Array<{ key: string; params?: Record<string, any> }> {
  const warnings: Array<{ key: string; params?: Record<string, any> }> = [];

  // Case 1: Missing sellers.json
  if (!validationResult.hasSellerJson) {
    warnings.push(createWarning(ERROR_KEYS.NO_SELLERS_JSON, { domain: record.domain }));
    return warnings; // Return early if no sellers.json
  }

  // Case 2/6: Account ID not found
  if (!validationResult.accountIdInSellersJson) {
    if (record.relationship === 'DIRECT') {
      warnings.push(
        createWarning(ERROR_KEYS.DIRECT_ACCOUNT_ID_NOT_IN_SELLERS_JSON, {
          domain: record.domain,
          account_id: record.account_id,
        })
      );
    } else {
      warnings.push(
        createWarning(ERROR_KEYS.RESELLER_ACCOUNT_ID_NOT_IN_SELLERS_JSON, {
          domain: record.domain,
          account_id: record.account_id,
        })
      );
    }
    // Skip further checks that require a match if account ID not found
    return warnings;
  }

  // Case 3: Domain mismatch for DIRECT
  if (record.relationship === 'DIRECT' && validationResult.domainMatchesSellerJsonEntry === false) {
    warnings.push(
      createWarning(ERROR_KEYS.DOMAIN_MISMATCH, {
        domain: record.domain,
        publisher_domain: publisherDomain,
        seller_domain: validationResult.sellerData?.domain || 'unknown',
      })
    );
  }

  // Case 4: DIRECT entry not marked as PUBLISHER
  if (record.relationship === 'DIRECT' && validationResult.directEntryHasPublisherType === false) {
    warnings.push(
      createWarning(ERROR_KEYS.DIRECT_NOT_PUBLISHER, {
        domain: record.domain,
        account_id: record.account_id,
        seller_type: validationResult.sellerData?.seller_type || 'unknown',
      })
    );
  }

  // Case 5/8: Seller ID not unique
  if (
    (record.relationship === 'DIRECT' &&
      validationResult.accountIdInSellersJson &&
      validationResult.sellerIdIsUnique === false) ||
    (record.relationship === 'RESELLER' &&
      validationResult.resellerAccountIdInSellersJson &&
      validationResult.resellerSellerIdIsUnique === false)
  ) {
    warnings.push(
      createWarning(ERROR_KEYS.SELLER_ID_NOT_UNIQUE, {
        domain: record.domain,
        account_id: record.account_id,
      })
    );
  }

  // Case 7: RESELLER entry not marked as INTERMEDIARY
  if (
    record.relationship === 'RESELLER' &&
    validationResult.accountIdInSellersJson &&
    validationResult.resellerEntryHasIntermediaryType === false
  ) {
    warnings.push(
      createWarning(ERROR_KEYS.RESELLER_NOT_INTERMEDIARY, {
        domain: record.domain,
        account_id: record.account_id,
        seller_type: validationResult.sellerData?.seller_type || 'unknown',
      })
    );
  }

  return warnings;
}

/**
 * Check if a string is similar to "DIRECT" or "RESELLER"
 * Uses Levenshtein distance to detect typing errors
 * @param str - The string to check
 * @returns Boolean indicating if the string is likely a misspelled relationship
 */
function isSimilarToRelationship(str: string): boolean {
  // Calculate Levenshtein distance between two strings
  function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Check if input is similar to DIRECT or RESELLER
  const distanceToDirect = levenshteinDistance(str, 'DIRECT');
  const distanceToReseller = levenshteinDistance(str, 'RESELLER');

  // If distance is less than 3 (allow for about 2 typos), consider it similar
  return distanceToDirect <= 2 || distanceToReseller <= 2;
}

/**
 * Check if an email address is valid
 * @param email - The email address to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  // More comprehensive email validation
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Check for invalid email patterns first
  if (
    !email ||
    email.includes('..') ||
    email.includes(' ') ||
    !email.includes('@') ||
    email.indexOf('@') === 0 ||
    email.indexOf('@') === email.length - 1 ||
    !email.includes('.', email.indexOf('@'))
  ) {
    return false;
  }

  return emailRegex.test(email);
}
