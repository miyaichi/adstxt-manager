/**
 * Enhanced validation summary component using ads-txt-validator message system
 */

import React from 'react';
import { Badge, Card, Flex, Heading, Link, Text } from '@aws-amplify/ui-react';
import { formatValidationSummary } from '../../services/messageService';
import { Severity } from '@adstxt-manager/ads-txt-validator';
import { t } from '../../i18n/translations';

interface ValidationSummaryProps {
  records: any[];
  language: string;
  showDetails?: boolean;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  records,
  language,
  showDetails = false,
}) => {
  const summary = formatValidationSummary(records, language);

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
        return t('validation.summary.errors', language);
      case Severity.WARNING:
        return t('validation.summary.warnings', language);
      case Severity.INFO:
        return t('validation.summary.info', language);
      default:
        return 'Unknown';
    }
  };

  if (summary.total === 0) {
    return (
      <Card variation="outlined" padding="medium">
        <Text>{t('validation.summary.noRecords', language)}</Text>
      </Card>
    );
  }

  return (
    <Card variation="outlined" padding="medium">
      <Flex direction="column" gap="medium">
        {/* Summary Header */}
        <Heading level={4}>{t('validation.summary.title', language)}</Heading>

        {/* Summary Stats */}
        <Flex gap="medium" wrap="wrap">
          <Badge variation="info" size="large">
            {t('validation.summary.total', language)}: {summary.total}
          </Badge>

          {summary.errors.length > 0 && (
            <Badge variation={getSeverityColor(Severity.ERROR)} size="large">
              {getSeverityLabel(Severity.ERROR)}: {summary.errors.length}
            </Badge>
          )}

          {summary.warnings.length > 0 && (
            <Badge variation={getSeverityColor(Severity.WARNING)} size="large">
              {getSeverityLabel(Severity.WARNING)}: {summary.warnings.length}
            </Badge>
          )}

          {summary.info.length > 0 && (
            <Badge variation={getSeverityColor(Severity.INFO)} size="large">
              {getSeverityLabel(Severity.INFO)}: {summary.info.length}
            </Badge>
          )}
        </Flex>

        {/* Detailed Messages */}
        {showDetails && (
          <Flex direction="column" gap="medium">
            {/* Error Messages */}
            {summary.errors.length > 0 && (
              <Card variation="outlined" backgroundColor="var(--amplify-colors-red-10)">
                <Flex direction="column" gap="small">
                  <Heading level={5} color="var(--amplify-colors-red-80)">
                    {getSeverityLabel(Severity.ERROR)}
                  </Heading>
                  {summary.errors.map((error, index) => (
                    <Flex key={index} direction="column" gap="xs">
                      <Text fontWeight="bold" color="var(--amplify-colors-red-80)">
                        {error.message}
                      </Text>
                      {error.description && (
                        <Text fontSize="small" color="var(--amplify-colors-red-60)">
                          {error.description}
                        </Text>
                      )}
                      {error.helpUrl && (
                        <Link
                          href={error.helpUrl}
                          isExternal={true}
                          fontSize="small"
                          color="var(--amplify-colors-red-80)"
                        >
                          {t('validation.summary.learnMore', language)} →
                        </Link>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </Card>
            )}

            {/* Warning Messages */}
            {summary.warnings.length > 0 && (
              <Card variation="outlined" backgroundColor="var(--amplify-colors-orange-10)">
                <Flex direction="column" gap="small">
                  <Heading level={5} color="var(--amplify-colors-orange-80)">
                    {getSeverityLabel(Severity.WARNING)}
                  </Heading>
                  {summary.warnings.map((warning, index) => (
                    <Flex key={index} direction="column" gap="xs">
                      <Text fontWeight="bold" color="var(--amplify-colors-orange-80)">
                        {warning.message}
                      </Text>
                      {warning.description && (
                        <Text fontSize="small" color="var(--amplify-colors-orange-60)">
                          {warning.description}
                        </Text>
                      )}
                      {warning.codes && warning.codes.length > 0 && (
                        <Flex gap="xs">
                          <Text fontSize="xs" color="var(--amplify-colors-orange-60)">
                            {t('validation.summary.codes', language)}:
                          </Text>
                          {warning.codes.map((code, codeIndex) => (
                            <Badge key={codeIndex} variation="warning" size="small">
                              {code}
                            </Badge>
                          ))}
                        </Flex>
                      )}
                      {warning.helpUrl && (
                        <Link
                          href={warning.helpUrl}
                          isExternal={true}
                          fontSize="small"
                          color="var(--amplify-colors-orange-80)"
                        >
                          {t('validation.summary.learnMore', language)} →
                        </Link>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </Card>
            )}

            {/* Info Messages */}
            {summary.info.length > 0 && (
              <Card variation="outlined" backgroundColor="var(--amplify-colors-blue-10)">
                <Flex direction="column" gap="small">
                  <Heading level={5} color="var(--amplify-colors-blue-80)">
                    {getSeverityLabel(Severity.INFO)}
                  </Heading>
                  {summary.info.map((info, index) => (
                    <Flex key={index} direction="column" gap="xs">
                      <Text fontWeight="bold" color="var(--amplify-colors-blue-80)">
                        {info.message}
                      </Text>
                      {info.description && (
                        <Text fontSize="small" color="var(--amplify-colors-blue-60)">
                          {info.description}
                        </Text>
                      )}
                      {info.helpUrl && (
                        <Link
                          href={info.helpUrl}
                          isExternal={true}
                          fontSize="small"
                          color="var(--amplify-colors-blue-80)"
                        >
                          {t('validation.summary.learnMore', language)} →
                        </Link>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </Card>
            )}
          </Flex>
        )}

        {/* Overall Status */}
        <Flex justifyContent="center">
          {summary.errors.length === 0 ? (
            <Badge variation="success" size="large">
              {t('validation.summary.overallValid', language)}
            </Badge>
          ) : (
            <Badge variation="error" size="large">
              {t('validation.summary.overallInvalid', language)}
            </Badge>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export default ValidationSummary;
