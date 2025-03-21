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
  const parts = trimmedLine.split(',').map(part => part.trim());
  
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
      error: 'Line must contain at least domain, account ID, and account type'
    };
  }

  // Extract and normalize the values
  const [domain, accountId, accountType, ...rest] = parts;
  let relationship: 'DIRECT' | 'RESELLER' = 'DIRECT';
  let certAuthorityId: string | undefined;

  // Check if accountType contains the relationship
  const upperAccountType = accountType.toUpperCase();
  if (upperAccountType === 'DIRECT' || upperAccountType === 'RESELLER') {
    relationship = upperAccountType as 'DIRECT' | 'RESELLER';
  } else if (!['DIRECT', 'RESELLER'].includes(upperAccountType) && rest.length === 0) {
    // Invalid accountType without relationship field
    return {
      domain,
      account_id: accountId,
      account_type: accountType,
      relationship,
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'Account type must be valid and relationship (DIRECT/RESELLER) must be specified'
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
      certAuthorityId = rest[0];
    }
  }

  // Validate domain (basic check)
  if (!domain.includes('.')) {
    return {
      domain,
      account_id: accountId,
      account_type: accountType,
      certification_authority_id: certAuthorityId,
      relationship,
      line_number: lineNumber,
      raw_line: line,
      is_valid: false,
      error: 'Domain must be valid'
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
      error: 'Account ID must not be empty'
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
    is_valid: true
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
 * Check if an email address is valid
 * @param email - The email address to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a domain is valid
 * @param domain - The domain to validate
 * @returns Boolean indicating if the domain is valid
 */
export function isValidDomain(domain: string): boolean {
  // Basic domain validation - contains at least one dot and no spaces
  const domainRegex = /^[^.\s]+(\.[^.\s]+)+$/;
  return domainRegex.test(domain);
}