import { Badge, Button, Card, Flex, Link, Loader, Text } from '@aws-amplify/ui-react';
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../api';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';
import { AdsTxtRecord, ParsedAdsTxtRecord, SellersJsonSellerResponse } from '../../models';
import WarningPopover from '../common/WarningPopover';
import { getRecordValidationMessage } from '../../services/messageService';

/**
 * 様々な形式のis_confidential値を評価する関数
 * sellers.jsonでは整数値0/1が規格だが、実装によっては文字列や真偽値で格納されている場合がある
 *
 * @param value is_confidentialの値
 * @returns true if confidential (value is 1, '1', or true), false otherwise
 */
function isConfidentialValue(value: any): boolean {
  // nullやundefinedの場合はfalse
  if (value == null) return false;

  // 文字列型の場合
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }

  // 数値型の場合
  if (typeof value === 'number') {
    return value === 1;
  }

  // 真偽値型の場合
  if (typeof value === 'boolean') {
    return value === true;
  }

  // その他の型はfalse
  return false;
}

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

  // Record is always assumed to have validation properties through our enhanced types

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
    if (record.is_valid === false) {
      console.log('Skipping seller.json lookup for invalid record');
      return;
    }

    // Skip seller.json lookup for records with noSellersJson validation key
    if (record.validation_key === 'noSellersJson') {
      console.log('Skipping seller.json lookup for record with noSellersJson validation_key');
      return;
    }

    const requestId = Math.random().toString(36).substring(2, 15);
    // 常にパブリッシャードメインからセラー情報を取得
    const domain = record.domain;

    console.log(
      `[${requestId}] Fetching seller information for ${record.account_id} from publisher domain ${domain}`
    );

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 1; // 最大1回のリトライを許可

    const fetchSellerInfo = () => {
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

              // パブリッシャードメインでセラーが見つからない場合は直接エラーとする
              setError(true);
              setSellerInfo(null);
              setLoading(false);
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

          // タイムアウトエラーの場合のみリトライ (ECONNABORTED はタイムアウトコード)
          const isTimeout = axios.isAxiosError(err) && err.code === 'ECONNABORTED';

          if (isTimeout && retryCount < MAX_RETRIES) {
            console.log(
              `[${requestId}] Timeout occurred, retrying (${retryCount + 1}/${MAX_RETRIES})...`
            );
            retryCount++;
            // 少し待ってからリトライ
            setTimeout(fetchSellerInfo, 1000);
            return;
          }

          setError(true);
          setSellerInfo(null);
          setLoading(false);
        });
    };

    // 初回の呼び出し
    fetchSellerInfo();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [record, getSellersDomain, language]);

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
                {/* Seller details - 型安全に様々な形式のis_confidentialを評価 */}
                {isConfidentialValue(sellerInfo.seller.is_confidential) ? (
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
              </Flex>
            </Card>
          )}
        </Flex>

        {/* Hide duplicate error message as we already show error inside seller info section */}

        {showValidation && (
          <Flex gap="0.5rem" alignItems="center" marginTop="0.5rem">
            {record.is_valid !== false ? (
              <Flex direction="column" width="100%">
                <Badge variation="success">{t('common.valid', language)}</Badge>

                {/* Display warning if record has one */}
                {record.has_warning && (
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
                            // Get enhanced validation message
                            const enhancedMessage = getRecordValidationMessage(
                              parsedRecord,
                              language
                            );

                            if (enhancedMessage) {
                              return (
                                <Flex direction="column" gap="xs">
                                  <Text color="orange" fontSize="0.875rem">
                                    {enhancedMessage.message}
                                  </Text>
                                  {enhancedMessage.description && (
                                    <Text
                                      fontSize="xs"
                                      color="var(--amplify-colors-font-secondary)"
                                    >
                                      {enhancedMessage.description}
                                    </Text>
                                  )}
                                  {enhancedMessage.helpUrl && (
                                    <Link
                                      href={enhancedMessage.helpUrl}
                                      fontSize="xs"
                                      color="var(--amplify-colors-brand-primary)"
                                      isExternal={true}
                                    >
                                      詳細を見る →
                                    </Link>
                                  )}
                                </Flex>
                              );
                            }

                            // Fallback to legacy format
                            const params = parsedRecord.warning_params || {};
                            if (!params.domain && record.domain) params.domain = record.domain;
                            if (!params.account_id && record.account_id)
                              params.account_id = record.account_id;

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
                                implimentedEntry: 'implimented-entry',
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
                {(() => {
                  const parsedRecord = record as ParsedAdsTxtRecord;

                  // Check for new validation_key format first
                  if (parsedRecord.validation_key) {
                    // Get enhanced validation message
                    const enhancedMessage = getRecordValidationMessage(parsedRecord, language);

                    if (enhancedMessage) {
                      return (
                        <Flex direction="column" gap="xs">
                          <Text color="red" fontSize="0.875rem">
                            {enhancedMessage.message}
                          </Text>
                          {enhancedMessage.description && (
                            <Text fontSize="xs" color="var(--amplify-colors-font-secondary)">
                              {enhancedMessage.description}
                            </Text>
                          )}
                          {enhancedMessage.helpUrl && (
                            <Link
                              href={enhancedMessage.helpUrl}
                              fontSize="xs"
                              color="var(--amplify-colors-brand-primary)"
                              isExternal={true}
                            >
                              詳細を見る →
                            </Link>
                          )}
                        </Flex>
                      );
                    }

                    // Fallback to legacy format
                    const params = parsedRecord.warning_params || {};
                    if (!params.domain && record.domain) params.domain = record.domain;
                    if (!params.account_id && record.account_id)
                      params.account_id = record.account_id;

                    return (
                      <Text color="red" fontSize="0.875rem">
                        {t(`warnings.${parsedRecord.validation_key}.title`, language, params)}
                      </Text>
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
                      (errType === 'directNotPublisher' || errType === 'resellerNotIntermediary') &&
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

                    return (
                      <Text color="red" fontSize="0.875rem">
                        {t(`warnings.${errType}.title`, language, params)}
                      </Text>
                    );
                  } else {
                    return (
                      <Text color="red" fontSize="0.875rem">
                        {errorMessage}
                      </Text>
                    );
                  }
                })()}
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
