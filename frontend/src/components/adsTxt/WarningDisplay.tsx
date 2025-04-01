import React from 'react';
import WarningPopover from '../common/WarningPopover';
import { getWarningIdFromErrorMessage } from '../../data/warnings';
import './WarningDisplay.css';

interface WarningDisplayProps {
  errorMessages: string[];
}

/**
 * A component that displays a list of warning/error messages with enhanced information
 * via popovers and links to the help documentation.
 */
const WarningDisplay: React.FC<WarningDisplayProps> = ({ errorMessages }) => {
  if (!errorMessages || errorMessages.length === 0) {
    return null;
  }

  return (
    <div className="warning-display">
      <ul className="warning-list">
        {errorMessages.map((message, index) => {
          // Extract parameters from message for use in translation
          const params = extractParamsFromMessage(message);

          // Get the warning ID based on the error message pattern
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

  // Extract domain parameters
  const domainMatch = message.match(/\(([^)]+)\)/);
  if (domainMatch && domainMatch[1]) {
    params.domain = domainMatch[1];
  }

  // Extract account_id parameters
  const accountIdMatch = message.match(/account ID ([\w\d.-]+)/i);
  if (accountIdMatch && accountIdMatch[1]) {
    params.account_id = accountIdMatch[1];
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

  return params;
}

export default WarningDisplay;
