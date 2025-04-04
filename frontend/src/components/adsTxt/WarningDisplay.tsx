import React from 'react';
import WarningPopover from '../common/WarningPopover';
import { getWarningIdFromErrorMessage, convertValidationKeyToWarningId } from '../../data/warnings';
import './WarningDisplay.css';
import { Severity } from '../../models';

interface ValidationMessage {
  message: string;
  severity?: Severity;
  validation_key?: string;
  params?: Record<string, any>;
}

interface WarningDisplayProps {
  errorMessages: string[] | ValidationMessage[];
}

/**
 * A component that displays a list of warning/error messages with enhanced information
 * via popovers and links to the help documentation.
 */
const WarningDisplay: React.FC<WarningDisplayProps> = ({ errorMessages }) => {
  if (!errorMessages || errorMessages.length === 0) {
    return null;
  }

  // Helper function to check if an error message is a ValidationMessage object
  const isValidationMessage = (message: any): message is ValidationMessage => {
    return typeof message === 'object' && message !== null && 'message' in message;
  };

  return (
    <div className="warning-display">
      <ul className="warning-list">
        {errorMessages.map((messageObj, index) => {
          // Handle both string message format (legacy) and object format (new)
          if (isValidationMessage(messageObj)) {
            const { message, severity, validation_key, params } = messageObj;

            // If we have a validation_key, convert it to a frontend warningId
            if (validation_key) {
              const warningId = convertValidationKeyToWarningId(validation_key);

              // Log for debugging
              console.log(
                `Converting validation_key: ${validation_key} to warningId: ${warningId}`
              );

              return (
                <li key={index} className="warning-item">
                  <WarningPopover warningId={warningId} params={params || {}} severity={severity} />
                </li>
              );
            }

            // Otherwise fall back to the legacy pattern matching
            const extractedParams = extractParamsFromMessage(message);
            const warningId = getWarningIdFromErrorMessage(message);

            return (
              <li key={index} className="warning-item">
                {warningId ? (
                  <WarningPopover
                    warningId={warningId}
                    params={extractedParams}
                    severity={severity}
                  />
                ) : (
                  <span className="warning-text">{message}</span>
                )}
              </li>
            );
          } else {
            // Legacy string-based message handling
            const message = messageObj;
            const params = extractParamsFromMessage(message);
            const warningId = getWarningIdFromErrorMessage(message);

            return (
              <li key={index} className="warning-item">
                {warningId ? (
                  <WarningPopover warningId={warningId} params={params} />
                ) : (
                  <span className="warning-text">{message}</span>
                )}
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

/**
 * Helper function to extract parameters from error messages
 * For example: "Duplicate entry found in publisher's ads.txt (example.com)"
 * would extract {domain: "example.com"}
 */
function extractParamsFromMessage(message: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Extract domain parameters from different patterns
  // Pattern: (example.com)
  const standardDomainMatch = message.match(/\(([^)]+\.[^)]+)\)/);
  if (standardDomainMatch && standardDomainMatch[1]) {
    params.domain = standardDomainMatch[1];
  }
  
  // Pattern: domain example.com
  const domainWordMatch = message.match(/domain\s+([a-z0-9.-]+\.[a-z0-9]+)/i);
  if (!params.domain && domainWordMatch && domainWordMatch[1]) {
    params.domain = domainWordMatch[1];
  }
  
  // Pattern: for example.com
  const forDomainMatch = message.match(/for\s+([a-z0-9.-]+\.[a-z0-9]+)/i);
  if (!params.domain && forDomainMatch && forDomainMatch[1]) {
    params.domain = forDomainMatch[1];
  }

  // Extract account_id parameters
  // Standard pattern: account ID xxx
  const accountIdMatch = message.match(/account ID ([\w\d.-]+)/i);
  if (accountIdMatch && accountIdMatch[1]) {
    params.account_id = accountIdMatch[1];
  }
  
  // Seller ID pattern: Seller ID xxx
  const sellerIdMatch = message.match(/Seller ID ([\w\d.-]+)/i);
  if (!params.account_id && sellerIdMatch && sellerIdMatch[1]) {
    params.account_id = sellerIdMatch[1];
  }

  // Extract seller_type parameters
  const sellerTypeMatch = message.match(/\(current type: ([\w]+)\)/i);
  if (sellerTypeMatch && sellerTypeMatch[1]) {
    params.seller_type = sellerTypeMatch[1];
  }

  // Extract domain mismatch parameters
  const sellerDomainMatch = message.match(/entry domain \(([^)]+)\)/i);
  if (sellerDomainMatch && sellerDomainMatch[1]) {
    params.seller_domain = sellerDomainMatch[1];
  }

  const publisherDomainMatch = message.match(/publisher domain \(([^)]+)\)/i);
  if (publisherDomainMatch && publisherDomainMatch[1]) {
    params.publisher_domain = publisherDomainMatch[1];
  }

  // Extract misspelled relationship value
  const valueMatch = message.match(/"([^"]+)" appears to be a misspelled/i);
  if (valueMatch && valueMatch[1]) {
    params.value = valueMatch[1];
  }

  // Extract error message from sellers.json validation errors
  const errorMessageMatch = message.match(/sellers\.json[^:]+:\s(.+)$/i);
  if (errorMessageMatch && errorMessageMatch[1]) {
    params.message = errorMessageMatch[1];
  }
  
  // Log for debugging
  console.log('Extracted params from message:', message, params);
  
  return params;
}

export default WarningDisplay;
