/**
 * Message service for adstxt-manager
 * Integrates with ads-txt-validator message system and existing i18n
 */

import {
  MessageProvider,
  DefaultMessageProvider,
  ValidationMessage,
  createValidationMessage,
  SupportedLocale,
  Severity,
} from '@adstxt-manager/ads-txt-validator';
import i18n from '../i18n';

/**
 * Custom message provider for adstxt-manager
 * Integrates ads-txt-validator messages with existing i18n system
 */
export class AdsTxtManagerMessageProvider implements MessageProvider {
  private defaultProvider: DefaultMessageProvider;
  private defaultLocale: SupportedLocale;

  constructor(defaultLocale: SupportedLocale = 'ja') {
    this.defaultLocale = defaultLocale;
    this.defaultProvider = new DefaultMessageProvider(defaultLocale);
  }

  /**
   * Get message data for a validation key
   * Falls back to existing i18n system if not found in ads-txt-validator
   */
  getMessage(key: string, locale?: string) {
    const targetLocale = (locale as SupportedLocale) || this.defaultLocale;

    // Try to get message from ads-txt-validator first
    const validatorMessage = this.defaultProvider.getMessage(key, targetLocale);

    if (validatorMessage) {
      return validatorMessage;
    }

    // Fallback to existing i18n system
    try {
      const i18nKey = this.mapValidationKeyToI18nKey(key);
      const message = i18n.t(i18nKey, { lng: targetLocale });

      if (message && message !== i18nKey) {
        return {
          message,
          description: undefined,
          helpUrl: undefined,
        };
      }
    } catch (error) {
      // Ignore i18n errors
    }

    // Return null if no message found
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

    // Fallback to i18n system
    const messageData = this.getMessage(key, locale);
    if (!messageData) {
      return null;
    }

    // Create validation message from i18n data
    return {
      key,
      severity: this.getSeverityFromKey(key),
      message: this.replacePlaceholders(messageData.message, placeholders),
      description: messageData.description,
      helpUrl: messageData.helpUrl,
      placeholders,
    };
  }

  /**
   * Map validation keys to existing i18n keys
   */
  private mapValidationKeyToI18nKey(key: string): string {
    const keyMappings: Record<string, string> = {
      missingFields: 'errors:missingFields.message',
      invalidFormat: 'errors:parsingError',
      invalidEmail: 'errors:invalidEmail',
      noFileUploaded: 'errors:noFileUploaded',
      noValidRecords: 'errors:noValidRecords',
      domainRequired: 'errors:domainRequired',
      sellersFetchError: 'errors:sellersFetchError',
      adsTxtFetchError: 'errors:adsTxtFetchError',
    };

    return keyMappings[key] || key;
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
    const errorKeys = [
      'missingFields',
      'invalidFormat',
      'invalidEmail',
      'noFileUploaded',
      'noValidRecords',
    ];

    if (errorKeys.includes(key)) {
      return Severity.ERROR;
    }

    return Severity.WARNING;
  }
}

/**
 * Global message service instance
 */
export class MessageService {
  private static instance: MessageService;
  private messageProvider: MessageProvider;

  private constructor() {
    // Initialize with our custom provider
    this.messageProvider = new AdsTxtManagerMessageProvider();
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Set custom message provider
   */
  setMessageProvider(provider: MessageProvider): void {
    this.messageProvider = provider;
  }

  /**
   * Get formatted validation message
   */
  getValidationMessage(
    key: string,
    placeholders: string[] = [],
    locale: string = 'ja'
  ): ValidationMessage | null {
    return this.messageProvider.formatMessage(key, placeholders, locale);
  }

  /**
   * Get simple message text
   */
  getMessage(key: string, placeholders: string[] = [], locale: string = 'ja'): string {
    const validationMessage = this.getValidationMessage(key, placeholders, locale);

    if (validationMessage) {
      return validationMessage.message;
    }

    // Fallback to i18n
    try {
      return i18n.t(key, { lng: locale });
    } catch {
      return key;
    }
  }

  /**
   * Format error for API response
   */
  formatApiError(
    key: string,
    placeholders: string[] = [],
    locale: string = 'ja'
  ): {
    message: string;
    key: string;
    helpUrl?: string;
    severity?: string;
  } {
    const validationMessage = this.getValidationMessage(key, placeholders, locale);

    return {
      message: validationMessage?.message || this.getMessage(key, placeholders, locale),
      key,
      helpUrl: validationMessage?.helpUrl,
      severity: validationMessage?.severity,
    };
  }
}

// Export singleton instance
export const messageService = MessageService.getInstance();

// Export convenience functions
export function getValidationMessage(
  key: string,
  placeholders: string[] = [],
  locale: string = 'ja'
): ValidationMessage | null {
  return messageService.getValidationMessage(key, placeholders, locale);
}

export function getMessage(
  key: string,
  placeholders: string[] = [],
  locale: string = 'ja'
): string {
  return messageService.getMessage(key, placeholders, locale);
}

export function formatApiError(
  key: string,
  placeholders: string[] = [],
  locale: string = 'ja'
): {
  message: string;
  key: string;
  helpUrl?: string;
  severity?: string;
} {
  return messageService.formatApiError(key, placeholders, locale);
}
