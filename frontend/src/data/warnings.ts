/**
 * Data structure for warning information across the application
 */

import { Severity } from '../models';

export interface WarningInfo {
  id: string;
  codes: string[];
  level: Severity;
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
    codes: [],
    level: 'error',
    titleKey: 'warnings.invalidFormat.title',
    descriptionKey: 'warnings.invalidFormat.description',
    recommendationKey: 'warnings.invalidFormat.recommendation',
    helpAnchor: '#invalid-format',
  },
  'missing-fields': {
    id: 'missing-fields',
    codes: ['11010'],
    level: 'error',
    titleKey: 'warnings.missingFields.title',
    descriptionKey: 'warnings.missingFields.description',
    recommendationKey: 'warnings.missingFields.recommendation',
    helpAnchor: '#missing-fields',
  },

  // Relationship warnings
  'invalid-relationship': {
    id: 'invalid-relationship',
    codes: ['11020'],
    level: 'error',
    titleKey: 'warnings.invalidRelationship.title',
    descriptionKey: 'warnings.invalidRelationship.description',
    recommendationKey: 'warnings.invalidRelationship.recommendation',
    helpAnchor: '#invalid-relationship',
  },

  // Domain warnings
  'invalid-domain': {
    id: 'invalid-domain',
    codes: ['11030'],
    level: 'warning',
    titleKey: 'warnings.invalidDomain.title',
    descriptionKey: 'warnings.invalidDomain.description',
    recommendationKey: 'warnings.invalidDomain.recommendation',
    helpAnchor: '#invalid-domain',
  },
  'empty-account-id': {
    id: 'empty-account-id',
    codes: [],
    level: 'error',
    titleKey: 'warnings.emptyAccountId.title',
    descriptionKey: 'warnings.emptyAccountId.description',
    recommendationKey: 'warnings.emptyAccountId.recommendation',
    helpAnchor: '#empty-account-id',
  },

  // Duplicate warnings
  'duplicate-entry': {
    id: 'duplicate-entry',
    codes: [],
    level: 'warning',
    titleKey: 'warnings.duplicateEntry.title',
    descriptionKey: 'warnings.duplicateEntry.description',
    recommendationKey: 'warnings.duplicateEntry.recommendation',
    helpAnchor: '#duplicate-entry',
  },

  // Sellers.json warnings
  'no-sellers-json': {
    id: 'no-sellers-json',
    codes: ['12010', '13010'],
    level: 'warning',
    titleKey: 'warnings.noSellersJson.title',
    descriptionKey: 'warnings.noSellersJson.description',
    recommendationKey: 'warnings.noSellersJson.recommendation',
    helpAnchor: '#no-sellers-json',
  },
  'direct-account-id-not-in-sellers-json': {
    id: 'direct-account-id-not-in-sellers-json',
    codes: ['12020'],
    level: 'warning',
    titleKey: 'warnings.directAccountIdNotInSellersJson.title',
    descriptionKey: 'warnings.directAccountIdNotInSellersJson.description',
    recommendationKey: 'warnings.directAccountIdNotInSellersJson.recommendation',
    helpAnchor: '#direct-account-id-not-in-sellers-json',
  },
  'reseller-account-id-not-in-sellers-json': {
    id: 'reseller-account-id-not-in-sellers-json',
    codes: ['13020'],
    level: 'warning',
    titleKey: 'warnings.resellerAccountIdNotInSellersJson.title',
    descriptionKey: 'warnings.resellerAccountIdNotInSellersJson.description',
    recommendationKey: 'warnings.resellerAccountIdNotInSellersJson.recommendation',
    helpAnchor: '#reseller-account-id-not-in-sellers-json',
  },
  'domain-mismatch': {
    id: 'domain-mismatch',
    codes: ['12030', '13030'],
    level: 'warning',
    titleKey: 'warnings.domainMismatch.title',
    descriptionKey: 'warnings.domainMismatch.description',
    recommendationKey: 'warnings.domainMismatch.recommendation',
    helpAnchor: '#domain-mismatch',
  },
  'direct-not-publisher': {
    id: 'direct-not-publisher',
    codes: ['12040', '12050'],
    level: 'warning',
    titleKey: 'warnings.directNotPublisher.title',
    descriptionKey: 'warnings.directNotPublisher.description',
    recommendationKey: 'warnings.directNotPublisher.recommendation',
    helpAnchor: '#direct-not-publisher',
  },
  'seller-id-not-unique': {
    id: 'seller-id-not-unique',
    codes: ['12060', '13060'],
    level: 'warning',
    titleKey: 'warnings.sellerIdNotUnique.title',
    descriptionKey: 'warnings.sellerIdNotUnique.description',
    recommendationKey: 'warnings.sellerIdNotUnique.recommendation',
    helpAnchor: '#seller-id-not-unique',
  },
  'reseller-not-intermediary': {
    id: 'reseller-not-intermediary',
    codes: ['13040', '13050'],
    level: 'warning',
    titleKey: 'warnings.resellerNotIntermediary.title',
    descriptionKey: 'warnings.resellerNotIntermediary.description',
    recommendationKey: 'warnings.resellerNotIntermediary.recommendation',
    helpAnchor: '#reseller-not-intermediary',
  },
  'sellers-json-validation-error': {
    id: 'sellers-json-validation-error',
    codes: [],
    level: 'warning',
    titleKey: 'warnings.sellersJsonValidationError.title',
    descriptionKey: 'warnings.sellersJsonValidationError.description',
    recommendationKey: 'warnings.sellersJsonValidationError.recommendation',
    helpAnchor: '#sellers-json-validation-error',
  },
};

