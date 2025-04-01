import React, { CSSProperties, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WarningInfo } from '../../data/warnings';
import { t } from '../../i18n/translations';
import '../adsTxt/WarningDisplay.css';
// Import from the warnings data file
import { warningInfos } from '../../data/warnings';

interface WarningPopoverProps {
  warningId: string;
  params?: Record<string, any>;
}

const WarningPopover: React.FC<WarningPopoverProps> = ({ warningId, params }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { language } = useApp();

  // Use a state to store the timer ID
  const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Clean up the timer on component unmount
  useEffect(() => {
    return () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
      }
    };
  }, [closeTimer]);

  // Get warning info from the central repository
  const warningInfo = getWarningInfoForId(warningId);

  // Early return if no warning info is found
  if (!warningInfo) {
    return <span className="warning-text">{warningId}</span>;
  }

  // Event handlers
  const handleTooltipMouseEnter = () => {
    // If there is a timer, clear it
    if (closeTimer) {
      clearTimeout(closeTimer);
      setCloseTimer(null);
    }
    setIsOpen(true);
  };

  const handleTooltipMouseLeave = () => {
    // Don't close immediately, add a delay
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ミリ秒の遅延
    setCloseTimer(timer);
  };

  // Translate the warning content
  const title = t(warningInfo.titleKey, language, params);
  const description = t(warningInfo.descriptionKey, language, params);
  const recommendation = t(warningInfo.recommendationKey, language, params);

  // Create a shorter title for the button
  const shortTitle =
    title.split(' ').length > 2 ? title.split(' ').slice(0, 2).join(' ') + '...' : title;

  // Generate help link - ensure it starts with the correct path and includes language
  const helpLink = `/help?warning=${warningInfo.id}${warningInfo.helpAnchor}&lang=${language}`;

  const getButtonStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0.25rem 0.75rem',
      margin: '0',
      fontFamily: 'inherit',
      fontSize: '0.8rem',
      fontWeight: '600',
      lineHeight: '1.5',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '16px',
      textDecoration: 'none',
      textAlign: 'center' as const, // TypeScript with CSSProperties requires this cast
      whiteSpace: 'nowrap',
      boxShadow: isHovered
        ? '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)'
        : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      transition: 'all 0.2s ease',
      color: '#ffffff',
      textShadow: '0 1px 1px rgba(0,0,0,0.2)',
    };

    switch (warningInfo.level) {
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: '#e53935',
          border: '1px solid #d32f2f',
        } as CSSProperties;
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: '#ff9800',
          border: '1px solid #f57c00',
        } as CSSProperties;
      case 'info':
        return {
          ...baseStyles,
          backgroundColor: '#03a9f4',
          border: '1px solid #0288d1',
        } as CSSProperties;
      default:
        return baseStyles;
    }
  };

  const buttonStyles = getButtonStyles();

  return (
    <div
      className="warning-popover-container"
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      <button
        style={buttonStyles}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-expanded={isOpen}
      >
        {shortTitle}
      </button>

      {isOpen && (
        <div
          className="warning-popover"
          role="tooltip"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="warning-popover-content">
            <h3>{title}</h3>
            <p className="warning-description">{description}</p>
            {recommendation && (
              <p className="warning-recommendation">
                <strong>{t('common.recommendation', language)}:</strong> {recommendation}
              </p>
            )}
            <a
              href={helpLink}
              className="warning-help-link"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                // Prevent popover from closing when clicking the link
                e.stopPropagation();
                // Leave the popover open when clicking the link
                if (closeTimer) {
                  clearTimeout(closeTimer);
                  setCloseTimer(null);
                }
              }}
            >
              {t('common.learnMore', language)}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get warning info from ID
function getWarningInfoForId(id: string): WarningInfo | null {
  return warningInfos[id] || null;
}

export default WarningPopover;
