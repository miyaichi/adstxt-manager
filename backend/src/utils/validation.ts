import * as psl from 'psl';

/**
 * Utility to validate and parse Ads.txt data
 */

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
  duplicate_domain?: string; // Store duplicate domain without overwriting original domain
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

  // Uncomment for detailed parsing logs if needed
  // console.log(`Parsing line: "${trimmedLine}" -> ${JSON.stringify(parts)}`);

  // Basic validation - must have at least domain, account ID, and type
  if (parts.length < 3) {
    return {
      domain: parts[0] || '',
      account_id: parts[1] || '',
      account_type: parts[2] || '',
      relationship: 'DIRECT',
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'errors:adsTxtValidation.missingFields',
    };
  }

  // Check for invalid format (no commas)
  if (parts.length === 1 && parts[0] === trimmedLine) {
    return {
      domain: parts[0],
      account_id: '',
      account_type: '',
      relationship: 'DIRECT',
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'errors:adsTxtValidation.invalidFormat',
    };
  }

  // Extract and normalize the values
  const [domain, accountId, accountType, ...rest] = parts;
  let relationship: 'DIRECT' | 'RESELLER' = 'DIRECT';
  let certAuthorityId: string | undefined;

  // Uncomment for detailed parsing logs if needed
  // console.log(`Found record: domain=${domain}, accountId=${accountId}, accountType=${accountType}, rest=${JSON.stringify(rest)}`);

  // Check if accountType contains the relationship
  const upperAccountType = accountType.toUpperCase();
  if (upperAccountType === 'DIRECT' || upperAccountType === 'RESELLER') {
    relationship = upperAccountType as 'DIRECT' | 'RESELLER';
  } else if (
    upperAccountType !== 'DIRECT' &&
    upperAccountType !== 'RESELLER' &&
    !['DIRECT', 'RESELLER'].includes(rest[0]?.toUpperCase())
  ) {
    // Invalid relationship type - must be exactly DIRECT or RESELLER (case insensitive)
    return {
      domain,
      account_id: accountId,
      account_type: accountType,
      relationship,
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'errors:adsTxtValidation.invalidRelationship',
    };
  }

  // Check for certification authority ID in the rest of the parts
  if (rest.length > 0) {
    // The next part could be relationship or cert authority
    const firstRest = rest[0].toUpperCase();
    if (firstRest === 'DIRECT' || firstRest === 'RESELLER') {
      relationship = firstRest as 'DIRECT' | 'RESELLER';
      if (rest.length > 1) {
        certAuthorityId = rest[1];
      }
    } else {
      // Check if it's a misspelled relationship type by comparing edit distance
      if (isSimilarToRelationship(firstRest)) {
        return {
          domain,
          account_id: accountId,
          account_type: accountType,
          certification_authority_id: rest.length > 1 ? rest[1] : undefined,
          relationship,
          line_number: lineNumber,
          raw_line: line,
          is_valid: false,
          error: 'errors:adsTxtValidation.misspelledRelationship',
        };
      }
      certAuthorityId = rest[0];
    }
  }

  // Validate domain using PSL
  const isValidRoot = psl.isValid(domain);
  const parsed = psl.parse(domain);

  // A domain is a root domain if it's valid and the input domain equals the parsed domain
  // (not a subdomain like sub.example.com)
  const isRootDomain = isValidRoot && parsed && 'domain' in parsed && parsed.domain === domain;

  if (!isRootDomain || domain.includes(' ')) {
    return {
      domain,
      account_id: accountId,
      account_type: accountType,
      certification_authority_id: certAuthorityId,
      relationship,
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'errors:adsTxtValidation.invalidRootDomain',
    };
  }

  // Validate account ID (must not be empty)
  if (!accountId) {
    return {
      domain,
      account_id: accountId,
      account_type: accountType,
      certification_authority_id: certAuthorityId,
      relationship,
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'errors:adsTxtValidation.emptyAccountId',
    };
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
 * Cross-check parsed Ads.txt records against publisher domain
 * This function checks for duplicate entries between submitted records and
 * existing ads.txt records from the publisher's domain
 *
 * @param publisherDomain - The publisher's domain for cross-checking
 * @param parsedRecords - The parsed Ads.txt records to check
 * @returns The validated/filtered records with duplicate entries marked
 */
export async function crossCheckAdsTxtRecords(
  publisherDomain: string | undefined,
  parsedRecords: ParsedAdsTxtRecord[]
): Promise<ParsedAdsTxtRecord[]> {
  // If no publisher domain provided, can't do cross-check
  if (!publisherDomain) {
    return parsedRecords;
  }

  console.log(`Starting cross-check with publisher domain: ${publisherDomain}`);
  // Print the parsedRecords for debugging
  parsedRecords.forEach((record, i) => {
    if (i < 5) {
      // Only print the first 5 to avoid log spam
      console.log(
        `Input record ${i + 1}: domain=${record.domain}, account_id=${record.account_id}, type=${record.account_type}, relationship=${record.relationship}`
      );
    }
  });

  try {
    // Import needed modules here to avoid circular dependencies
    const { default: AdsTxtCacheModel } = await import('../models/AdsTxtCache');

    // Attempt to get cached ads.txt for the publisher domain
    console.log(`Fetching cached ads.txt data for ${publisherDomain}`);
    const cachedData = await AdsTxtCacheModel.getByDomain(publisherDomain);
    console.log(`Cached data found: ${!!cachedData}, status: ${cachedData?.status}`);

    // If no cached data or not successful, return records as-is
    if (!cachedData || cachedData.status !== 'success' || !cachedData.content) {
      console.log(`No valid cached ads.txt data found for ${publisherDomain}`);
      return parsedRecords;
    }

    console.log(`Cached content length: ${cachedData.content.length}`);

    // Parse the cached ads.txt content
    const existingRecords = parseAdsTxtContent(cachedData.content);

    // Print a sample of the parsed records from publisher's ads.txt
    console.log("Sample of records from publisher's ads.txt:");
    existingRecords.slice(0, 3).forEach((record, i) => {
      console.log(
        `  ${i + 1}: domain=${record.domain}, account_id=${record.account_id}, type=${record.account_type}, relationship=${record.relationship}, valid=${record.is_valid}`
      );
    });

    // Create lookup map of existing records for faster checking
    // Key format: domain|account_id|account_type
    const existingRecordMap = new Map<string, ParsedAdsTxtRecord>();

    console.log(`Parsed ${existingRecords.length} records from cached ads.txt`);
    console.log(`Valid records: ${existingRecords.filter((r) => r.is_valid).length}`);

    for (const record of existingRecords) {
      if (record.is_valid) {
        // Make all comparisons case-insensitive for better matching
        // Use domain, account_id, and account_type for duplicate detection (not relationship)
        const domainLower = record.domain.toLowerCase();
        const key = `${domainLower}|${record.account_id}|${record.account_type}`;
        existingRecordMap.set(key, record);
      }
    }

    console.log(`Created lookup map with ${existingRecordMap.size} entries`);

    // Check each of the input records for duplicates and mark them
    console.log(
      `Checking ${parsedRecords.length} input records for duplicates against ${existingRecordMap.size} existing records`
    );

    // Log a sample of the existing map keys for debugging
    const mapKeySample = Array.from(existingRecordMap.keys()).slice(0, 10);
    console.log(`Sample of existing map keys: ${JSON.stringify(mapKeySample)}`);

    const result = parsedRecords.map((record) => {
      if (!record.is_valid) {
        return record; // Skip invalid records
      }

      // Make all comparisons case-insensitive for better matching
      // Use domain, account_id, and account_type for duplicate detection (not relationship)
      const lowerDomain = record.domain.toLowerCase();
      const key = `${lowerDomain}|${record.account_id}|${record.account_type}`;

      // Check for duplicate - exact key match
      const isDuplicate = existingRecordMap.has(key);

      // We no longer need this section since we already made the domain lowercase in the key
      // and we're comparing keys directly. Keep it as a backup just in case, but it won't execute.
      if (!isDuplicate) {
        // This is debugging only, it shouldn't trigger in normal operation now
        console.log(
          `Unusual: case-sensitive match failed, double-checking with domain=${record.domain}, account_id=${record.account_id}`
        );

        // Additional check just to be safe
        const lowerCaseDomain = record.domain.toLowerCase();

        // Check if any key in map has the same lower case domain, account_id, and account_type
        for (const [existingKey, existingRecord] of existingRecordMap.entries()) {
          const [existingDomain, existingAccountId, existingAccountType] = existingKey.split('|');
          if (
            existingDomain.toLowerCase() === lowerCaseDomain &&
            existingAccountId === record.account_id &&
            existingAccountType.toLowerCase() === record.account_type.toLowerCase()
          ) {
            console.log(
              `Found case-insensitive duplicate through backup check: ${existingDomain} vs ${record.domain}`
            );
            return {
              ...record,
              is_valid: true,
              has_warning: true,
              warning: 'errors:adsTxtValidation.duplicateEntryCaseInsensitive',
              duplicate_domain: publisherDomain, // Store the domain where the duplicate was found
            };
          }
        }
      }

      if (isDuplicate) {
        console.log(`Found duplicate for: ${key}`);
        // It's a duplicate, create a warning but keep the record valid
        const warningRecord = {
          ...record,
          is_valid: true, // Changed from false to true
          has_warning: true,
          warning: 'errors:adsTxtValidation.duplicateEntry',
          duplicate_domain: publisherDomain, // Store the domain where the duplicate was found
        };
        console.log(
          `Created warning record with duplicate_domain=${publisherDomain}, warning=${warningRecord.warning}`
        );
        return warningRecord;
      }

      return record;
    });

    console.log(
      `After cross-check: ${result.length} records, ${result.filter((r) => r.has_warning).length} with warnings`
    );
    return result;
  } catch (error) {
    // If there's any error during cross-check, log it but return records as-is
    console.error('Error during ads.txt cross-check:', error);
    return parsedRecords;
  }
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
