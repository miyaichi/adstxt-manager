import { Badge, Button, Card, Flex, Loader, Text } from '@aws-amplify/ui-react';
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';
import { AdsTxtRecord, ParsedAdsTxtRecord, SellersJsonSellerResponse } from '../../models';
import WarningPopover from '../common/WarningPopover';

interface AdsTxtRecordItemProps {
  record: AdsTxtRecord | (ParsedAdsTxtRecord & { id: string; status: string });
  showValidation?: boolean;
  onStatusChange?: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  isEditable?: boolean;
}

const AdsTxtRecordItem: React.FC<AdsTxtRecordItemProps> = ({
  record,
  showValidation = false,
  onStatusChange,
  isEditable = false,
}) => {
  const { language } = useApp();
  const [sellerInfo, setSellerInfo] = useState<SellersJsonSellerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Check if the record is a parsed record with validation data
  const isParsedRecord = 'is_valid' in record;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">{t('common.status.approved', language)}</Badge>;
      case 'rejected':
        return <Badge variation="error">{t('common.status.rejected', language)}</Badge>;
      case 'pending':
        return <Badge variation="warning">{t('common.status.pending', language)}</Badge>;
      default:
        return <Badge variation="info">{status}</Badge>;
    }
  };

  const handleApprove = () => {
    if (onStatusChange) {
      onStatusChange(record.id, 'approved');
    }
  };

  const handleReject = () => {
    if (onStatusChange) {
      onStatusChange(record.id, 'rejected');
    }
  };

  // Determine sellers.json domain from account_type
  const getSellersDomain = useCallback(
    (accountType: string): string => {
      const lowerAccountType = accountType.toLowerCase();

      // Extract domain pattern if account_type contains domain format
      const domainMatch = lowerAccountType.match(/([a-z0-9-]+\.[a-z0-9-]+(\.[a-z0-9-]+)*)/);
      if (domainMatch && domainMatch[0]) {
        return domainMatch[0];
      }

      // Fallback to record.domain if not a domain format
      if (!lowerAccountType.includes('.')) {
        return record.domain;
      }

      // Last resort: use account_type but ensure it has a TLD
      return lowerAccountType.includes('.') ? accountType : `${accountType}.com`;
    },
    [record.domain]
  );

  // Fetch seller information on component mount
  useEffect(() => {
    // Skip seller.json lookup for invalid records
    if (isParsedRecord && !(record as ParsedAdsTxtRecord).is_valid) {
      console.log('Skipping seller.json lookup for invalid record');
      return;
    }

    // Skip seller.json lookup if record is invalid
    const parsedRecord = record as ParsedAdsTxtRecord;
    if (isParsedRecord && parsedRecord.validation_key === 'noSellersJson') {
      console.log('Skipping seller.json lookup for record with noSellersJson validation_key');
      return;
    }

    const requestId = Math.random().toString(36).substring(2, 15);
    const domain = getSellersDomain(record.account_type);

    console.log(
      `[${requestId}] Fetching seller information for ${record.account_id} from ${domain}`
    );

    let isMounted = true;
    setLoading(true);
    setError(false);

    // Direct API call to backend
    api.sellersJson
      .getSellerById(domain, record.account_id)
      .then((response) => {
        if (!isMounted) return;

        if (response.success && response.data) {
          if (response.error || (response.data.key && !response.data.found)) {
            // API succeeded but returned an error
            const errorKey = response.error?.key || response.data.key;
            console.warn(
              `[${requestId}] Error for Seller ID ${record.account_id} from ${domain}:`,
              errorKey
            );
            setError(true);
            setSellerInfo(null);
            setLoading(false);
          } else if (!response.data.found) {
            // sellers.json file found but seller_id doesn't exist
            console.warn(`[${requestId}] Seller ID ${record.account_id} not found in ${domain}`);

            // Try with record's domain as fallback if different
            if (domain !== record.domain) {
              console.log(`[${requestId}] Trying fallback with record.domain: ${record.domain}`);

              api.sellersJson
                .getSellerById(record.domain, record.account_id)
                .then((fallbackResponse) => {
                  if (!isMounted) return;

                  if (fallbackResponse.success && fallbackResponse.data) {
                    if (
                      fallbackResponse.error ||
                      (fallbackResponse.data.key && !fallbackResponse.data.found)
                    ) {
                      // API succeeded but returned an error
                      const errorKey = fallbackResponse.error?.key || fallbackResponse.data.key;
                      console.warn(`[${requestId}] Error for fallback domain:`, errorKey);
                      setError(true);
                      setSellerInfo(null);
                    } else if (fallbackResponse.data.found && fallbackResponse.data.seller) {
                      console.log(
                        `[${requestId}] Found seller info in fallback domain ${record.domain}`
                      );
                      setSellerInfo(fallbackResponse.data);
                      setError(false);
                    } else {
                      console.warn(`[${requestId}] Seller not found in fallback domain either`);
                      setError(true);
                      setSellerInfo(null);
                    }
                  } else {
                    console.warn(
                      `[${requestId}] API failure for fallback domain:`,
                      fallbackResponse.error
                    );
                    setError(true);
                    setSellerInfo(null);
                  }
                  setLoading(false);
                })
                .catch((err) => {
                  if (!isMounted) return;
                  console.error(`[${requestId}] Fallback attempt failed:`, err);
                  setError(true);
                  setSellerInfo(null);
                  setLoading(false);
                });
            } else {
              setError(true);
              setSellerInfo(null);
              setLoading(false);
            }
          } else if (response.data.seller) {
            // Seller info found
            console.log(
              `[${requestId}] Found seller information for ${record.account_id} from ${domain}`
            );
            setSellerInfo(response.data);
            setError(false);
            setLoading(false);
          } else {
            // Data returned but no seller info
            console.warn(
              `[${requestId}] No seller information found for ${record.account_id} from ${domain}`
            );
            setError(true);
            setSellerInfo(null);
            setLoading(false);
          }
        } else {
          // API returned failure
          console.warn(
            `[${requestId}] API failure for ${record.account_id} from ${domain}:`,
            response.error
          );
          setError(true);
          setSellerInfo(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(`[${requestId}] Error fetching seller info:`, err);
        setError(true);
        setSellerInfo(null);
        setLoading(false);
      });

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [record, getSellersDomain, isParsedRecord, language]);

  return (
    <Card variation="outlined" padding="1rem" marginBottom="0.5rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">{record.domain}</Text>
          {getStatusBadge(record.status)}
        </Flex>

        {/* Record Information */}
        <Flex gap="1rem" wrap="wrap">
          <Text>
            <strong>{t('adsTxt.recordItem.accountId', language)}: </strong>
            {record.account_id}
          </Text>
          <Text>
            <strong>{t('adsTxt.recordItem.relationship', language)}: </strong>
            {record.relationship}
          </Text>
          {record.certification_authority_id && (
            <Text>
              <strong>{t('adsTxt.recordItem.certificationAuthorityId', language)}: </strong>
              {record.certification_authority_id}
            </Text>
          )}
        </Flex>

        {/* Seller Information Section */}
        <Flex direction="column" gap="0.5rem" marginTop="0.5rem">
          {loading && (
            <Flex direction="row" gap="0.25rem" alignItems="center">
              <Loader size="small" />
              <Text fontSize="0.875rem" color="gray">
                {t('adsTxt.recordItem.fetchingSellerInfo', language)}
              </Text>
            </Flex>
          )}

          {!loading && (!sellerInfo || !sellerInfo.seller || error) && (
            <Text color="var(--amplify-colors-font-warning)">
              {t('adsTxt.recordItem.noSellerInfo', language)}
            </Text>
          )}

          {!loading && sellerInfo && sellerInfo.seller && (
            <Card variation="elevated" padding="0.75rem" backgroundColor="#f8f8f8">
              <Flex direction="column" gap="0.5rem">
                {/* Cached indicator */}
                {sellerInfo.cache.is_cached && (
                  <Flex justifyContent="flex-end">
                    <Badge variation="info" size="small">
                      {t('adsTxt.recordItem.cached', language)}
                    </Badge>
                  </Flex>
                )}

                {/* Seller details */}
                {sellerInfo.seller.is_confidential ? (
                  <Text>{t('adsTxt.recordItem.confidentialInfo', language)}</Text>
                ) : (
                  <>
                    {sellerInfo.seller.name && (
                      <Text fontWeight="bold">{sellerInfo.seller.name}</Text>
                    )}

                    <Flex gap="1rem" wrap="wrap">
                      {sellerInfo.seller.domain && (
                        <Text>
                          <strong>{t('adsTxt.recordItem.sellerDomain', language)}: </strong>
                          {sellerInfo.seller.domain}
                        </Text>
                      )}
                      <Text>
                        <strong>{t('adsTxt.recordItem.sellerType', language)}: </strong>
                        {sellerInfo.seller.seller_type}
                      </Text>
                    </Flex>
                  </>
                )}

                {/* Metadata display (simplified) */}
                {sellerInfo.metadata && sellerInfo.metadata.seller_count > 0 && (
                  <Text fontSize="0.75rem" color="gray">
                    {t('adsTxt.recordItem.sellersCount', language, {
                      count: sellerInfo.metadata.seller_count,
                    })}
                    {sellerInfo.metadata.version &&
                      ` (${t('adsTxt.recordItem.version', language)}: ${sellerInfo.metadata.version})`}
                  </Text>
                )}
              </Flex>
            </Card>
          )}
        </Flex>

        {/* Hide duplicate error message as we already show error inside seller info section */}

        {isParsedRecord && showValidation && (
          <Flex gap="0.5rem" alignItems="center" marginTop="0.5rem">
            {(record as ParsedAdsTxtRecord).is_valid ? (
              <Flex direction="column" width="100%">
                <Badge variation="success">{t('common.valid', language)}</Badge>

                {/* Display warning if record has one */}
                {(record as ParsedAdsTxtRecord).has_warning && (
                  <>
                    <Flex
                      gap="0.5rem"
                      alignItems="center"
                      marginTop="0.5rem"
                      style={{ position: 'relative' }}
                    >
                      <div className="warning-text-container" style={{ position: 'relative' }}>
                        {(() => {
                          const parsedRecord = record as ParsedAdsTxtRecord;

                          // Check for new validation_key format first
                          if (parsedRecord.validation_key) {
                            // Use new validation_key and severity format
                            const params = parsedRecord.warning_params || {};

                            // Add standard parameters that might be needed
                            if (!params.domain && record.domain) {
                              params.domain = record.domain;
                            }

                            if (!params.account_id && record.account_id) {
                              params.account_id = record.account_id;
                            }

                            // Convert the validation_key to warningId format
                            // 1. Replace dots with dashes
                            // 2. Convert camelCase to kebab-case (e.g. directAccountId -> direct-account-id)
                            const warningId = parsedRecord.validation_key
                              .replace(/\./g, '-')
                              .replace(/([a-z])([A-Z])/g, '$1-$2')
                              .toLowerCase();

                            return (
                              <WarningPopover
                                warningId={warningId}
                                params={params}
                                severity={parsedRecord.severity}
                              />
                            );
                          }

                          // Fall back to legacy format
                          const warningMessage = parsedRecord.warning;
                          if (!warningMessage) return '';

                          // Process all warning messages that start with errors: or warnings:
                          if (
                            warningMessage.startsWith('errors:') ||
                            warningMessage.startsWith('warnings:')
                          ) {
                            // Extract parameters from warning_params if available
                            const params = parsedRecord.warning_params || {};

                            // Add standard parameters that might be needed
                            if (!params.domain && record.domain) {
                              params.domain = record.domain;
                            }

                            if (!params.account_id && record.account_id) {
                              params.account_id = record.account_id;
                            }

                            // Get the warning type to map to a warning ID
                            let warningId = '';
                            if (
                              warningMessage.startsWith('errors:adsTxtValidation.') ||
                              warningMessage.startsWith('errors.adsTxtValidation.')
                            ) {
                              // Map specific error types to warning IDs based on warnings.ts
                              const errorType = warningMessage
                                .replace('errors:adsTxtValidation.', '')
                                .replace('errors.adsTxtValidation.', '');

                              // Map to the correct warning ID format
                              const errorTypeMap: Record<string, string> = {
                                invalidFormat: 'invalid-format',
                                missingFields: 'missing-fields',
                                invalidRelationship: 'invalid-relationship',
                                invalidDomain: 'invalid-domain',
                                emptyAccountId: 'empty-account-id',
                                duplicateEntry: 'duplicate-entry',
                                noSellersJson: 'no-sellers-json',
                                directAccountIdNotInSellersJson:
                                  'direct-account-id-not-in-sellers-json',
                                resellerAccountIdNotInSellersJson:
                                  'reseller-account-id-not-in-sellers-json',
                                domainMismatch: 'domain-mismatch',
                                directNotPublisher: 'direct-not-publisher',
                                sellerIdNotUnique: 'seller-id-not-unique',
                                resellerNotIntermediary: 'reseller-not-intermediary',
                                sellersJsonValidationError: 'sellers-json-validation-error',
                              };

                              warningId = errorTypeMap[errorType] || '';
                            }

                            if (warningId) {
                              return <WarningPopover warningId={warningId} params={params} />;
                            } else {
                              return (
                                <Text color="orange" fontSize="0.875rem">
                                  {t(warningMessage, language, params)}
                                </Text>
                              );
                            }
                          } else {
                            return (
                              <Text color="orange" fontSize="0.875rem">
                                {warningMessage}
                              </Text>
                            );
                          }
                        })()}
                      </div>
                    </Flex>
                  </>
                )}
              </Flex>
            ) : (
              <Flex direction="column" width="100%">
                <Badge variation="error">{t('common.invalid', language)}</Badge>
                <Text color="red" fontSize="0.875rem">
                  {(() => {
                    const parsedRecord = record as ParsedAdsTxtRecord;

                    // Check for new validation_key format first
                    if (parsedRecord.validation_key) {
                      const params = parsedRecord.warning_params || {};

                      // Add standard parameters that might be needed
                      if (!params.domain && record.domain) {
                        params.domain = record.domain;
                      }

                      if (!params.account_id && record.account_id) {
                        params.account_id = record.account_id;
                      }

                      // Get the translated error message directly using validation_key
                      return t(
                        `errors.adsTxtValidation.${parsedRecord.validation_key}`,
                        language,
                        params
                      );
                    }

                    // Fall back to legacy error format
                    const errorMessage = parsedRecord.error;
                    if (!errorMessage) return '';

                    if (
                      errorMessage.startsWith('errors:adsTxtValidation.') ||
                      errorMessage.startsWith('errors.adsTxtValidation.')
                    ) {
                      // Handle specific error messages
                      const errType = errorMessage
                        .replace('errors:adsTxtValidation.', '')
                        .replace('errors.adsTxtValidation.', '');
                      // Get possible parameter values from record
                      const params: Record<string, any> = {};

                      // Extract domain from record for all messages that need it
                      params.domain = record.domain;

                      // Extract account_id
                      params.account_id = record.account_id;

                      // Extract relationship
                      params.relationship = record.relationship;

                      // For misspelled relationship
                      if (errType === 'misspelledRelationship') {
                        params.value =
                          (record as ParsedAdsTxtRecord).raw_line?.split(',')[3]?.trim() || '';
                      }

                      // For domain mismatch
                      if (errType === 'domainMismatch' && (record as any).warning_params) {
                        const wParams = (record as any).warning_params;
                        params.seller_domain = wParams.seller_domain;
                        params.publisher_domain = wParams.publisher_domain;
                      }

                      // For seller type warnings
                      if (
                        (errType === 'directNotPublisher' ||
                          errType === 'resellerNotIntermediary') &&
                        (record as any).warning_params
                      ) {
                        params.seller_type = (record as any).warning_params.seller_type;
                      }

                      // For sellers.json validation error
                      if (
                        errType === 'sellersJsonValidationError' &&
                        (record as any).warning_params
                      ) {
                        params.message = (record as any).warning_params.message;
                      }

                      return t('errors:adsTxtValidation.' + errType, language, params);
                    } else {
                      return errorMessage;
                    }
                  })()}
                </Text>
              </Flex>
            )}
          </Flex>
        )}

        {/* Loading indicator is now shown inside the seller info section */}

        {isEditable && (
          <Flex justifyContent="flex-end" gap="0.5rem" marginTop="0.5rem">
            {record.status !== 'approved' && (
              <Button size="small" variation="primary" onClick={handleApprove}>
                {t('common.approve', language)}
              </Button>
            )}
            {record.status !== 'rejected' && (
              <Button size="small" variation="destructive" onClick={handleReject}>
                {t('common.reject', language)}
              </Button>
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default AdsTxtRecordItem;
