/**
 * Frontend message service for adstxt-manager
 * Integrates ads-txt-validator message system with existing frontend i18n
 */

import {
  MessageProvider,
  DefaultMessageProvider,
  ValidationMessage,
  SupportedLocale,
  Severity,
} from '@adstxt-manager/ads-txt-validator';
import { t } from '../i18n/translations';
import { warningInfos, WarningInfo } from '../data/warnings';

/**
 * Frontend-specific message provider
 * Integrates ads-txt-validator messages with existing warning system
 */
export class FrontendMessageProvider implements MessageProvider {
  private defaultProvider: DefaultMessageProvider;
  private defaultLocale: SupportedLocale;

  constructor(defaultLocale: SupportedLocale = 'ja') {
    this.defaultLocale = defaultLocale;
    this.defaultProvider = new DefaultMessageProvider(defaultLocale);
  }

  /**
   * Get message data for a validation key
   */
  getMessage(key: string, locale?: string) {
    const targetLocale = (locale as SupportedLocale) || this.defaultLocale;

    // Try to get message from ads-txt-validator first
    const validatorMessage = this.defaultProvider.getMessage(key, targetLocale);

    if (validatorMessage) {
      return validatorMessage;
    }

    // Fallback to existing warning system
    const warningId = this.mapValidationKeyToWarningId(key);
    const warningInfo = warningInfos[warningId];

    if (warningInfo) {
      return {
        message: t(warningInfo.titleKey, targetLocale),
        description: t(warningInfo.descriptionKey, targetLocale),
        helpUrl: `/help?warning=${warningId}${warningInfo.helpAnchor}`,
      };
    }

    // Final fallback to direct i18n lookup
    try {
      const message = t(`warnings.${key}.title`, targetLocale);
      if (message && message !== `warnings.${key}.title`) {
        return {
          message,
          description: t(`warnings.${key}.description`, targetLocale),
          helpUrl: undefined,
        };
      }
    } catch (error) {
      // Ignore i18n errors
    }

    return null;
  }

  /**
   * Format a message with placeholders
   */
  formatMessage(
    key: string,
    placeholders: string[] = [],
    locale?: string
  ): ValidationMessage | null {
    // Try ads-txt-validator first
    const validatorMessage = this.defaultProvider.formatMessage(key, placeholders, locale);

    if (validatorMessage) {
      return validatorMessage;
    }

    // Fallback to existing system
    const messageData = this.getMessage(key, locale);
    if (!messageData) {
      return null;
    }

    // Create validation message from existing data
    return {
      key,
      severity: this.getSeverityFromKey(key),
      message: this.replacePlaceholders(messageData.message, placeholders),
      description: messageData.description
        ? this.replacePlaceholders(messageData.description, placeholders)
        : undefined,
      helpUrl: messageData.helpUrl,
      placeholders,
    };
  }

  /**
   * Map validation keys to existing warning IDs
   */
  private mapValidationKeyToWarningId(key: string): string {
    // Convert camelCase/kebab-case validation keys to warning IDs
    const keyMappings: Record<string, string> = {
      missingFields: 'missing-fields',
      invalidFormat: 'invalid-format',
      invalidRelationship: 'invalid-relationship',
      invalidDomain: 'invalid-domain',
      emptyAccountId: 'empty-account-id',
      implimentedEntry: 'implimented-entry',
      noSellersJson: 'no-sellers-json',
      directAccountIdNotInSellersJson: 'direct-account-id-not-in-sellers-json',
      resellerAccountIdNotInSellersJson: 'reseller-account-id-not-in-sellers-json',
      domainMismatch: 'domain-mismatch',
      directNotPublisher: 'direct-not-publisher',
      sellerIdNotUnique: 'seller-id-not-unique',
      resellerNotIntermediary: 'reseller-not-intermediary',
      sellersJsonValidationError: 'sellers-json-validation-error',
    };

    return keyMappings[key] || key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Replace placeholders in message template
   */
  private replacePlaceholders(template: string, placeholders: string[]): string {
    let result = template;

    // Replace numbered placeholders like {{0}}, {{1}}
    result = result.replace(/\{\{(\d+)\}\}/g, (match, index) => {
      const placeholderIndex = parseInt(index, 10);
      return placeholders[placeholderIndex] || match;
    });

    // Replace named placeholders
    if (placeholders.length > 0) {
      const placeholderNames = ['domain', 'accountId', 'sellerDomain', 'message'];
      placeholderNames.forEach((name, index) => {
        if (index < placeholders.length) {
          result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), placeholders[index]);
        }
      });
    }

    return result;
  }

  /**
   * Determine severity from validation key
   */
  private getSeverityFromKey(key: string): Severity {
    // Try to get severity from existing warning info
    const warningId = this.mapValidationKeyToWarningId(key);
    const warningInfo = warningInfos[warningId];

    if (warningInfo) {
      switch (warningInfo.level) {
        case 'error':
          return Severity.ERROR;
        case 'warning':
          return Severity.WARNING;
        case 'info':
          return Severity.INFO;
        default:
          return Severity.WARNING;
      }
    }

    // Default severity mapping
    const errorKeys = [
      'missingFields',
      'invalidFormat',
      'invalidRelationship',
      'invalidDomain',
      'emptyAccountId',
    ];

    if (errorKeys.includes(key)) {
      return Severity.ERROR;
    }

    return Severity.WARNING;
  }
}

/**
 * Enhanced validation message with UI-specific properties
 */
export interface UIValidationMessage extends ValidationMessage {
  warningInfo?: WarningInfo;
  codes?: string[];
}

/**
 * Global message service instance
 */
export class FrontendMessageService {
  private static instance: FrontendMessageService;
  private messageProvider: MessageProvider;

  private constructor() {
    this.messageProvider = new FrontendMessageProvider();
  }

  static getInstance(): FrontendMessageService {
    if (!FrontendMessageService.instance) {
      FrontendMessageService.instance = new FrontendMessageService();
    }
    return FrontendMessageService.instance;
  }

  /**
   * Set custom message provider
   */
  setMessageProvider(provider: MessageProvider): void {
    this.messageProvider = provider;
  }

  /**
   * Get enhanced validation message with UI info
   */
  getUIValidationMessage(
    key: string,
    placeholders: string[] = [],
    locale: string = 'ja'
  ): UIValidationMessage | null {
    const validationMessage = this.messageProvider.formatMessage(key, placeholders, locale);

    if (!validationMessage) {
      return null;
    }

    // Get warning info for UI enhancements
    const warningId = this.mapValidationKeyToWarningId(key);
    const warningInfo = warningInfos[warningId];

    return {
      ...validationMessage,
      warningInfo,
      codes: warningInfo?.codes,
    };
  }

  /**
   * Get validation message for record display
   */
  getRecordValidationMessage(record: any, locale: string = 'ja'): UIValidationMessage | null {
    if (!record.validation_key) {
      return null;
    }

    // Extract placeholders from record and warning_params
    const placeholders: string[] = [];

    if (record.warning_params) {
      // Add common parameters
      if (record.warning_params.domain) placeholders.push(record.warning_params.domain);
      if (record.warning_params.account_id) placeholders.push(record.warning_params.account_id);
      if (record.warning_params.seller_domain)
        placeholders.push(record.warning_params.seller_domain);
      if (record.warning_params.message) placeholders.push(record.warning_params.message);
    }

    // Add record properties as fallback
    if (record.domain && !placeholders.includes(record.domain)) {
      placeholders.push(record.domain);
    }
    if (record.account_id && !placeholders.includes(record.account_id)) {
      placeholders.push(record.account_id);
    }

    return this.getUIValidationMessage(record.validation_key, placeholders, locale);
  }

  /**
   * Format multiple validation messages for summary display
   */
  formatValidationSummary(
    records: any[],
    locale: string = 'ja'
  ): {
    total: number;
    errors: UIValidationMessage[];
    warnings: UIValidationMessage[];
    info: UIValidationMessage[];
  } {
    const errors: UIValidationMessage[] = [];
    const warnings: UIValidationMessage[] = [];
    const info: UIValidationMessage[] = [];

    records.forEach((record) => {
      const message = this.getRecordValidationMessage(record, locale);
      if (message) {
        switch (message.severity) {
          case Severity.ERROR:
            errors.push(message);
            break;
          case Severity.WARNING:
            warnings.push(message);
            break;
          case Severity.INFO:
            info.push(message);
            break;
        }
      }
    });

    return {
      total: records.length,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Map validation key to warning ID (private method exposed for compatibility)
   */
  private mapValidationKeyToWarningId(key: string): string {
    const keyMappings: Record<string, string> = {
      missingFields: 'missing-fields',
      invalidFormat: 'invalid-format',
      invalidRelationship: 'invalid-relationship',
      invalidDomain: 'invalid-domain',
      emptyAccountId: 'empty-account-id',
      implimentedEntry: 'implimented-entry',
      noSellersJson: 'no-sellers-json',
      directAccountIdNotInSellersJson: 'direct-account-id-not-in-sellers-json',
      resellerAccountIdNotInSellersJson: 'reseller-account-id-not-in-sellers-json',
      domainMismatch: 'domain-mismatch',
      directNotPublisher: 'direct-not-publisher',
      sellerIdNotUnique: 'seller-id-not-unique',
      resellerNotIntermediary: 'reseller-not-intermediary',
      sellersJsonValidationError: 'sellers-json-validation-error',
    };

    return keyMappings[key] || key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// Export singleton instance
export const frontendMessageService = FrontendMessageService.getInstance();

// Export convenience functions
export function getUIValidationMessage(
  key: string,
  placeholders: string[] = [],
  locale: string = 'ja'
): UIValidationMessage | null {
  return frontendMessageService.getUIValidationMessage(key, placeholders, locale);
}

export function getRecordValidationMessage(
  record: any,
  locale: string = 'ja'
): UIValidationMessage | null {
  return frontendMessageService.getRecordValidationMessage(record, locale);
}

export function formatValidationSummary(records: any[], locale: string = 'ja') {
  return frontendMessageService.formatValidationSummary(records, locale);
}
