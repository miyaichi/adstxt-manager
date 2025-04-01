/**
 * Data structure for warning information across the application
 */

export interface WarningInfo {
  id: string;
  level: 'info' | 'warning' | 'error';
  titleKey: string; // i18n reference key
  descriptionKey: string; // i18n reference key
  recommendationKey: string; // i18n reference key
  helpAnchor: string; // anchor in help page e.g. #duplicate-domain
}

/**
 * Central repository of all warning information
 */
export const warningInfos: Record<string, WarningInfo> = {
  // Invalid format warnings
  'invalid-format': {
    id: 'invalid-format',
    level: 'error',
    titleKey: 'warnings.invalidFormat.title',
    descriptionKey: 'warnings.invalidFormat.description',
    recommendationKey: 'warnings.invalidFormat.recommendation',
    helpAnchor: '#invalid-format',
  },
  'missing-fields': {
    id: 'missing-fields',
    level: 'error',
    titleKey: 'warnings.missingFields.title',
    descriptionKey: 'warnings.missingFields.description',
    recommendationKey: 'warnings.missingFields.recommendation',
    helpAnchor: '#missing-fields',
  },

  // Relationship warnings
  'invalid-relationship': {
    id: 'invalid-relationship',
    level: 'error',
    titleKey: 'warnings.invalidRelationship.title',
    descriptionKey: 'warnings.invalidRelationship.description',
    recommendationKey: 'warnings.invalidRelationship.recommendation',
    helpAnchor: '#invalid-relationship',
  },
  'misspelled-relationship': {
    id: 'misspelled-relationship',
    level: 'warning',
    titleKey: 'warnings.misspelledRelationship.title',
    descriptionKey: 'warnings.misspelledRelationship.description',
    recommendationKey: 'warnings.misspelledRelationship.recommendation',
    helpAnchor: '#misspelled-relationship',
  },

  // Domain warnings
  'invalid-root-domain': {
    id: 'invalid-root-domain',
    level: 'warning',
    titleKey: 'warnings.invalidRootDomain.title',
    descriptionKey: 'warnings.invalidRootDomain.description',
    recommendationKey: 'warnings.invalidRootDomain.recommendation',
    helpAnchor: '#invalid-root-domain',
  },
  'empty-account-id': {
    id: 'empty-account-id',
    level: 'error',
    titleKey: 'warnings.emptyAccountId.title',
    descriptionKey: 'warnings.emptyAccountId.description',
    recommendationKey: 'warnings.emptyAccountId.recommendation',
    helpAnchor: '#empty-account-id',
  },

  // Duplicate warnings
  'duplicate-entry': {
    id: 'duplicate-entry',
    level: 'warning',
    titleKey: 'warnings.duplicateEntry.title',
    descriptionKey: 'warnings.duplicateEntry.description',
    recommendationKey: 'warnings.duplicateEntry.recommendation',
    helpAnchor: '#duplicate-entry',
  },
  'duplicate-entry-case-insensitive': {
    id: 'duplicate-entry-case-insensitive',
    level: 'warning',
    titleKey: 'warnings.duplicateEntryCaseInsensitive.title',
    descriptionKey: 'warnings.duplicateEntryCaseInsensitive.description',
    recommendationKey: 'warnings.duplicateEntryCaseInsensitive.recommendation',
    helpAnchor: '#duplicate-entry-case-insensitive',
  },

  // Sellers.json warnings
  'no-sellers-json': {
    id: 'no-sellers-json',
    level: 'warning',
    titleKey: 'warnings.noSellersJson.title',
    descriptionKey: 'warnings.noSellersJson.description',
    recommendationKey: 'warnings.noSellersJson.recommendation',
    helpAnchor: '#no-sellers-json',
  },
  'direct-account-id-not-in-sellers-json': {
    id: 'direct-account-id-not-in-sellers-json',
    level: 'warning',
    titleKey: 'warnings.directAccountIdNotInSellersJson.title',
    descriptionKey: 'warnings.directAccountIdNotInSellersJson.description',
    recommendationKey: 'warnings.directAccountIdNotInSellersJson.recommendation',
    helpAnchor: '#direct-account-id-not-in-sellers-json',
  },
  'reseller-account-id-not-in-sellers-json': {
    id: 'reseller-account-id-not-in-sellers-json',
    level: 'warning',
    titleKey: 'warnings.resellerAccountIdNotInSellersJson.title',
    descriptionKey: 'warnings.resellerAccountIdNotInSellersJson.description',
    recommendationKey: 'warnings.resellerAccountIdNotInSellersJson.recommendation',
    helpAnchor: '#reseller-account-id-not-in-sellers-json',
  },
  'domain-mismatch': {
    id: 'domain-mismatch',
    level: 'warning',
    titleKey: 'warnings.domainMismatch.title',
    descriptionKey: 'warnings.domainMismatch.description',
    recommendationKey: 'warnings.domainMismatch.recommendation',
    helpAnchor: '#domain-mismatch',
  },
  'direct-not-publisher': {
    id: 'direct-not-publisher',
    level: 'warning',
    titleKey: 'warnings.directNotPublisher.title',
    descriptionKey: 'warnings.directNotPublisher.description',
    recommendationKey: 'warnings.directNotPublisher.recommendation',
    helpAnchor: '#direct-not-publisher',
  },
  'seller-id-not-unique': {
    id: 'seller-id-not-unique',
    level: 'warning',
    titleKey: 'warnings.sellerIdNotUnique.title',
    descriptionKey: 'warnings.sellerIdNotUnique.description',
    recommendationKey: 'warnings.sellerIdNotUnique.recommendation',
    helpAnchor: '#seller-id-not-unique',
  },
  'reseller-not-intermediary': {
    id: 'reseller-not-intermediary',
    level: 'warning',
    titleKey: 'warnings.resellerNotIntermediary.title',
    descriptionKey: 'warnings.resellerNotIntermediary.description',
    recommendationKey: 'warnings.resellerNotIntermediary.recommendation',
    helpAnchor: '#reseller-not-intermediary',
  },
  'sellers-json-validation-error': {
    id: 'sellers-json-validation-error',
    level: 'warning',
    titleKey: 'warnings.sellersJsonValidationError.title',
    descriptionKey: 'warnings.sellersJsonValidationError.description',
    recommendationKey: 'warnings.sellersJsonValidationError.recommendation',
    helpAnchor: '#sellers-json-validation-error',
  },
};

/**
 * Maps error message patterns to warning IDs
 */
export const getWarningIdFromErrorMessage = (errorMessage: string): string | null => {
  // Map known error messages to warning IDs
  if (errorMessage.includes('Invalid format')) {
    return 'invalid-format';
  }
  if (errorMessage.includes('must contain at least')) {
    return 'missing-fields';
  }
  if (errorMessage.includes('Relationship type must be')) {
    return 'invalid-relationship';
  }
  if (errorMessage.includes('appears to be a misspelled relationship')) {
    return 'misspelled-relationship';
  }
  if (errorMessage.includes('Domain must be a valid root domain')) {
    return 'invalid-root-domain';
  }
  if (errorMessage.includes('Account ID must not be empty')) {
    return 'empty-account-id';
  }
  if (errorMessage.includes('Duplicate entry found') && errorMessage.includes('different case')) {
    return 'duplicate-entry-case-insensitive';
  }
  if (errorMessage.includes('Duplicate entry found')) {
    return 'duplicate-entry';
  }
  if (errorMessage.includes('No sellers.json file found')) {
    return 'no-sellers-json';
  }
  if (
    errorMessage.includes('DIRECT: Publisher account ID') &&
    errorMessage.includes('not found in sellers.json')
  ) {
    return 'direct-account-id-not-in-sellers-json';
  }
  if (
    errorMessage.includes('RESELLER: Publisher account ID') &&
    errorMessage.includes('not found in sellers.json')
  ) {
    return 'reseller-account-id-not-in-sellers-json';
  }
  if (errorMessage.includes('The sellers.json entry domain')) {
    return 'domain-mismatch';
  }
  if (errorMessage.includes('DIRECT: Seller') && errorMessage.includes('not marked as PUBLISHER')) {
    return 'direct-not-publisher';
  }
  if (errorMessage.includes('Seller ID') && errorMessage.includes('used multiple times')) {
    return 'seller-id-not-unique';
  }
  if (
    errorMessage.includes('RESELLER: Seller') &&
    errorMessage.includes('not marked as INTERMEDIARY')
  ) {
    return 'reseller-not-intermediary';
  }
  if (errorMessage.includes('Error validating against sellers.json')) {
    return 'sellers-json-validation-error';
  }

  // Unknown error type
  return null;
};
