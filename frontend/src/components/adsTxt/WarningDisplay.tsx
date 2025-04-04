import React from 'react';
import WarningPopover from '../common/WarningPopover';
import './WarningDisplay.css';
import { Severity } from '../../models';

// Key-based format only
interface KeyBasedValidationMessage {
  key: string;
  params?: Record<string, any>;
  severity?: Severity;
}

interface WarningDisplayProps {
  errorMessages: KeyBasedValidationMessage[];
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
          return (
            <li key={index} className="warning-item">
              <WarningPopover
                warningId={message.key}
                params={message.params || {}}
                severity={message.severity}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WarningDisplay;
