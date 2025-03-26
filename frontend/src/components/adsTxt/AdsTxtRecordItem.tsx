import { Badge, Button, Card, Flex, Loader, Text } from '@aws-amplify/ui-react';
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';

// Type definition for global cache
declare global {
  interface Window {
    __SELLER_INFO_CACHE__?: Record<string, any>;
  }
}

// Module-level cache (persists until page reload)
const globalSellerInfoCache: Record<string, any> = {};

// Save to localStorage
const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(`seller_info_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

// Load from localStorage
const loadFromLocalStorage = (key: string): any | null => {
  try {
    const item = localStorage.getItem(`seller_info_${key}`);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
};

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
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch seller information
  const fetchSellerInfo = useCallback(async () => {
    let result = null;

    try {
      setLoading(true);
      setError(null);

      const domain = getSellersDomain(record.account_type);

      try {
        console.log(`Fetching seller information for ${record.account_id} from domain ${domain}`);
        const response = await api.sellersJson.getSellerById(domain, record.account_id);

        if (response.success && response.data) {
          if (response.data.error) {
            // API succeeded but returned an error
            console.warn(
              `Error for Seller ID ${record.account_id} from ${domain}:`,
              response.data.error
            );
            setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
            setSellerInfo(null);
          } else if (response.data.found === false) {
            // sellers.json file found but seller_id doesn't exist
            console.warn(`Seller ID ${record.account_id} not found in ${domain}`);
            setError(t('adsTxt.recordItem.noSellerInfo', language));
            setSellerInfo(null);
          } else if (response.data.seller) {
            // Seller info found and matches ads.txt account_id
            console.log(
              `Found seller information for ${record.account_id} from ${domain}:`,
              response.data.seller
            );
            result = response.data;
            setSellerInfo(result);
            setError(null);
          } else {
            // Data returned but no seller info
            console.warn(`No seller information found for ${record.account_id} from ${domain}`);
            setError(t('adsTxt.recordItem.noSellerInfo', language));
            setSellerInfo(null);
          }
        } else {
          // API returned failure
          console.warn(`API failure for ${record.account_id} from ${domain}:`, response.error);
          setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
          setSellerInfo(null);
        }
      } catch (apiError) {
        // Try with record's domain as fallback
        console.warn(
          `Failed to fetch from ${domain}, trying record domain ${record.domain} instead`
        );

        if (domain !== record.domain) {
          try {
            const fallbackResponse = await api.sellersJson.getSellerById(
              record.domain,
              record.account_id
            );

            if (fallbackResponse.success && fallbackResponse.data && fallbackResponse.data.seller) {
              result = fallbackResponse.data;
              setSellerInfo(result);
              setError(null);
            } else if (fallbackResponse.success && fallbackResponse.data) {
              setError(t('adsTxt.recordItem.noSellerInfo', language));
              setSellerInfo(null);
            }
          } catch (fallbackError) {
            console.error('Fallback attempt also failed:', fallbackError);
            console.error('Error fetching seller info:', apiError);
            setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
            setSellerInfo(null);
          }
        } else {
          console.error('Error fetching seller info:', apiError);
          setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
          setSellerInfo(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching seller info:', err);
      setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
      setSellerInfo(null);
    } finally {
      setLoading(false);
    }

    return result;
  }, [record.account_id, record.account_type, record.domain, language, getSellersDomain]);

  // Fetch seller information on component mount with caching
  useEffect(() => {
    // Skip seller.json lookup for invalid records
    if (isParsedRecord && !(record as ParsedAdsTxtRecord).is_valid) {
      console.log('Skipping seller.json lookup for invalid record');
      return;
    }

    // Create unique cache key
    const domain = getSellersDomain(record.account_type);
    const cacheKey = `${domain}-${record.account_id}`;

    // Check module-level cache
    if (globalSellerInfoCache[cacheKey]) {
      console.log(`Using module-level cached seller info for ${cacheKey}`);
      setSellerInfo(globalSellerInfoCache[cacheKey]);

      // Restore error message from cache
      if (globalSellerInfoCache[cacheKey] === null && globalSellerInfoCache[`${cacheKey}_error`]) {
        setError(globalSellerInfoCache[`${cacheKey}_error`]);
      }
    }
    // Check localStorage cache
    else if (loadFromLocalStorage(cacheKey)) {
      const cachedData = loadFromLocalStorage(cacheKey);
      const cachedError = loadFromLocalStorage(`${cacheKey}_error`);

      console.log(`Using localStorage cached seller info for ${cacheKey}`);
      setSellerInfo(cachedData);

      // Also save to module-level cache
      globalSellerInfoCache[cacheKey] = cachedData;

      // Restore error message
      if (cachedData === null && cachedError) {
        setError(cachedError);
        globalSellerInfoCache[`${cacheKey}_error`] = cachedError;
      }
    }
    // Check window-level cache (for backward compatibility)
    else if (window.__SELLER_INFO_CACHE__ && window.__SELLER_INFO_CACHE__[cacheKey]) {
      console.log(`Using window-level cached seller info for ${cacheKey}`);
      setSellerInfo(window.__SELLER_INFO_CACHE__[cacheKey]);

      // Also save to module-level cache
      globalSellerInfoCache[cacheKey] = window.__SELLER_INFO_CACHE__[cacheKey];

      // Save to localStorage
      saveToLocalStorage(cacheKey, window.__SELLER_INFO_CACHE__[cacheKey]);
    } else {
      // Fetch from API
      console.log(`No cache found for ${cacheKey}, fetching from API`);
      fetchSellerInfo().then((result) => {
        if (result) {
          // Save to module-level cache
          globalSellerInfoCache[cacheKey] = result;

          // Save to localStorage
          saveToLocalStorage(cacheKey, result);

          // Save to window-level cache for backward compatibility
          if (!window.__SELLER_INFO_CACHE__) {
            window.__SELLER_INFO_CACHE__ = {};
          }
          window.__SELLER_INFO_CACHE__[cacheKey] = result;
        } else {
          // Cache null result
          globalSellerInfoCache[cacheKey] = null;
          saveToLocalStorage(cacheKey, null);

          // Use local copy of error state to avoid dependency issues
          const currentError = error;
          if (currentError) {
            globalSellerInfoCache[`${cacheKey}_error`] = currentError;
            saveToLocalStorage(`${cacheKey}_error`, currentError);
          }
        }
      });
    }
    // Removed error from dependency array to avoid potential infinite loop
  }, [record, fetchSellerInfo, getSellersDomain, isParsedRecord]);

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
            <strong>{t('adsTxt.recordItem.accountType', language)}: </strong>
            {record.account_type}
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

        {/* Sellers.json Information */}
        {sellerInfo && !loading && sellerInfo.seller && (
          <Flex gap="1rem" wrap="wrap" marginTop="0.5rem">
            <Text>
              <strong>{t('adsTxt.recordItem.sellerInfo', language)}: </strong>
            </Text>
            {sellerInfo.seller.is_confidential ? (
              <Badge variation="warning">{t('adsTxt.recordItem.confidential', language)}</Badge>
            ) : (
              <>
                <Text>{sellerInfo.seller.name || ''}</Text>
                {sellerInfo.seller.domain ? (
                  <Text>
                    <strong>{t('adsTxt.recordItem.sellerDomain', language)}: </strong>
                    {sellerInfo.seller.domain}
                  </Text>
                ) : null}
                <Text>
                  <strong>{t('adsTxt.recordItem.sellerType', language)}: </strong>
                  {sellerInfo.seller.seller_type}
                </Text>
              </>
            )}
          </Flex>
        )}

        {/* Error Message */}
        {!loading && error && (
          <Flex gap="1rem" wrap="wrap" marginTop="0.5rem">
            <Text color="var(--amplify-colors-font-warning)">{error}</Text>
          </Flex>
        )}

        {isParsedRecord && showValidation && (
          <Flex gap="0.5rem" alignItems="center" marginTop="0.5rem">
            {(record as ParsedAdsTxtRecord).is_valid ? (
              <Flex direction="column" width="100%">
                <Badge variation="success">{t('common.valid', language)}</Badge>

                {/* Display warning if record has one */}
                {(record as ParsedAdsTxtRecord).has_warning && (
                  <>
                    <Flex gap="0.5rem" alignItems="center" marginTop="0.5rem">
                      <Badge variation="warning">{t('common.warning', language)}</Badge>
                      <Text color="orange" fontSize="0.875rem">
                        {(() => {
                          const warningMessage = (record as ParsedAdsTxtRecord).warning;
                          if (!warningMessage) return '';

                          // Handle specific warning messages
                          if (warningMessage === 'errors:adsTxtValidation.duplicateEntry') {
                            const domain = (record as ParsedAdsTxtRecord).duplicate_domain || '';
                            return t('errors:adsTxtValidation.duplicateEntry', language, {
                              domain,
                            });
                          } else if (
                            warningMessage ===
                            'errors:adsTxtValidation.duplicateEntryCaseInsensitive'
                          ) {
                            const domain = (record as ParsedAdsTxtRecord).duplicate_domain || '';
                            return t(
                              'errors:adsTxtValidation.duplicateEntryCaseInsensitive',
                              language,
                              { domain }
                            );
                          } else {
                            return warningMessage;
                          }
                        })()}
                      </Text>
                    </Flex>
                  </>
                )}
              </Flex>
            ) : (
              <Flex direction="column" width="100%">
                <Badge variation="error">{t('common.invalid', language)}</Badge>
                <Text color="red" fontSize="0.875rem">
                  {(() => {
                    const errorMessage = (record as ParsedAdsTxtRecord).error;
                    if (!errorMessage) return '';

                    if (errorMessage.startsWith('errors:adsTxtValidation.')) {
                      // Handle specific error messages
                      const errType = errorMessage.replace('errors:adsTxtValidation.', '');
                      const value =
                        (record as ParsedAdsTxtRecord).raw_line?.split(',')[3]?.trim() || '';

                      switch (errType) {
                        case 'invalidFormat':
                          return t('errors:adsTxtValidation.invalidFormat', language);
                        case 'missingFields':
                          return t('errors:adsTxtValidation.missingFields', language);
                        case 'invalidRelationship':
                          return t('errors:adsTxtValidation.invalidRelationship', language);
                        case 'misspelledRelationship':
                          return t('errors:adsTxtValidation.misspelledRelationship', language, {
                            value,
                          });
                        case 'invalidRootDomain':
                          return t('errors:adsTxtValidation.invalidRootDomain', language);
                        case 'emptyAccountId':
                          return t('errors:adsTxtValidation.emptyAccountId', language);
                        default:
                          return errorMessage;
                      }
                    } else {
                      return errorMessage;
                    }
                  })()}
                </Text>
              </Flex>
            )}
          </Flex>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Flex direction="row" gap="0.25rem" alignItems="center" marginTop="0.25rem">
            <Loader size="small" />
            <Text fontSize="0.75rem" color="gray">
              {t('adsTxt.recordItem.fetchingSellerInfo', language)}
            </Text>
          </Flex>
        )}

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
