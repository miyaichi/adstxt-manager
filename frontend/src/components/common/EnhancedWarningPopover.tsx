/**
 * Enhanced warning popover using ads-txt-validator message system
 */

import React from 'react';
import { Badge, Button, Card, Flex, Heading, Link, Text } from '@aws-amplify/ui-react';
import { UIValidationMessage } from '../../services/messageService';
import { Severity } from 'adstxt-validator';

interface EnhancedWarningPopoverProps {
  message: UIValidationMessage;
  trigger?: React.ReactElement;
  isOpen?: boolean;
  onClose?: () => void;
}

const EnhancedWarningPopover: React.FC<EnhancedWarningPopoverProps> = ({
  message,
  trigger,
  isOpen = false,
  onClose,
}) => {
  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.ERROR:
        return 'error';
      case Severity.WARNING:
        return 'warning';
      case Severity.INFO:
        return 'info';
      default:
        return 'info';
    }
  };

  const getSeverityLabel = (severity: Severity): string => {
    switch (severity) {
      case Severity.ERROR:
        return 'エラー';
      case Severity.WARNING:
        return '警告';
      case Severity.INFO:
        return '情報';
      default:
        return '不明';
    }
  };

  if (!isOpen) {
    return trigger || null;
  }

  return (
    <Card
      variation="elevated"
      padding="medium"
      maxWidth="400px"
      style={{
        position: 'absolute',
        zIndex: 1000,
        backgroundColor: 'var(--amplify-colors-background-primary)',
        border: '1px solid var(--amplify-colors-border-primary)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <Flex direction="column" gap="small">
        {/* Header with severity badge */}
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Badge variation={getSeverityColor(message.severity)} size="small">
            {getSeverityLabel(message.severity)}
          </Badge>
          {onClose && (
            <Button
              variation="link"
              size="small"
              onClick={onClose}
              style={{ padding: '0', minHeight: 'auto' }}
            >
              ✕
            </Button>
          )}
        </Flex>

        {/* Title */}
        <Heading level={6} color="var(--amplify-colors-font-primary)">
          {message.message}
        </Heading>

        {/* Description */}
        {message.description && (
          <Text fontSize="small" color="var(--amplify-colors-font-secondary)">
            {message.description}
          </Text>
        )}

        {/* Error codes */}
        {message.codes && message.codes.length > 0 && (
          <Flex gap="xs" wrap="wrap">
            <Text fontSize="xs" color="var(--amplify-colors-font-tertiary)">
              コード:
            </Text>
            {message.codes.map((code, index) => (
              <Badge key={index} variation="info" size="small">
                {code}
              </Badge>
            ))}
          </Flex>
        )}

        {/* Help link */}
        {message.helpUrl && (
          <Flex justifyContent="flex-end">
            <Link
              href={message.helpUrl}
              isExternal={message.helpUrl.startsWith('http')}
              fontSize="small"
              color="var(--amplify-colors-brand-primary)"
            >
              詳細を見る →
            </Link>
          </Flex>
        )}

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '8px' }}>
            <summary
              style={{
                fontSize: '12px',
                color: 'var(--amplify-colors-font-tertiary)',
                cursor: 'pointer',
              }}
            >
              Debug Info
            </summary>
            <pre
              style={{
                fontSize: '10px',
                color: 'var(--amplify-colors-font-tertiary)',
                marginTop: '4px',
                maxWidth: '100%',
                overflow: 'auto',
                background: 'var(--amplify-colors-background-secondary)',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              {JSON.stringify(
                {
                  key: message.key,
                  severity: message.severity,
                  placeholders: message.placeholders,
                  warningInfo: message.warningInfo?.id,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </Flex>
    </Card>
  );
};

export default EnhancedWarningPopover;
