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

// Create a static object as global cache (persists until page reload)
const globalSellerInfoCache: Record<string, any> = {};

// Function to also save to localStorage
const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(`seller_info_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

// Function to load from localStorage
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

  // Check if the record has error property (which means it's a ParsedAdsTxtRecord)
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

  // Function to determine the sellers.json domain based on account_type
  const getSellersDomain = useCallback((accountType: string): string => {
    const lowerAccountType = accountType.toLowerCase();

    // Try to extract domain pattern if account_type contains domain.com format
    const domainMatch = lowerAccountType.match(/([a-z0-9-]+\.[a-z0-9-]+(\.[a-z0-9-]+)*)/);
    if (domainMatch && domainMatch[0]) {
      return domainMatch[0];
    }

    // Fall back to record.domain instead of account_type if it doesn't look like a domain
    if (!lowerAccountType.includes('.')) {
      return record.domain;
    }

    // Last resort: use account_type but ensure it has a TLD
    return lowerAccountType.includes('.') ? accountType : `${accountType}.com`;
  }, [record.domain]);

  // Function to fetch seller information - returns the result for caching
  const fetchSellerInfo = useCallback(async () => {
    let result = null;
    
    try {
      setLoading(true);
      setError(null);

      const domain = getSellersDomain(record.account_type);

      try {
        console.log(`Fetching seller information for ${record.account_id} from domain ${domain}`);
        // account_id (ads.txtのフィールド2) を使って、特定のseller_idを持つレコードを取得
        const response = await api.sellersJson.getSellerById(domain, record.account_id);

        if (response.success && response.data) {
          if (response.data.error) {
            // APIは成功したが、実際のデータにはエラー情報が含まれている場合
            console.warn(
              `Error for Seller ID ${record.account_id} from ${domain}:`,
              response.data.error
            );
            setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
            setSellerInfo(null);
          } else if (response.data.found === false) {
            // sellers.jsonファイルは正常に取得できたが、該当するseller_idが存在しない場合
            console.warn(`Seller ID ${record.account_id} not found in ${domain}`);
            setError(t('adsTxt.recordItem.noSellerInfo', language)); // セラー情報がないことを表示
            setSellerInfo(null);
          } else if (response.data.seller) {
            // セラー情報が見つかり、seller_idがads.txtのaccount_idと一致
            console.log(
              `Found seller information for ${record.account_id} from ${domain}:`,
              response.data.seller
            );
            result = response.data;
            setSellerInfo(result);
            setError(null);
          } else {
            // データは返ってきたがセラー情報がない（sellers.jsonは存在するがエントリがない）
            console.warn(`No seller information found for ${record.account_id} from ${domain}`);
            setError(t('adsTxt.recordItem.noSellerInfo', language)); // セラー情報がないことを表示
            setSellerInfo(null);
          }
        } else {
          // APIが失敗を返した場合（sellers.jsonの取得自体に失敗）
          console.warn(`API failure for ${record.account_id} from ${domain}:`, response.error);
          setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language)); // エラーメッセージを設定
          setSellerInfo(null);
        }
      } catch (apiError) {
        // 最初のドメインでの取得に失敗した場合、レコードのドメインでも試してみる
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
              // セラー情報が見つからない場合
              setError(t('adsTxt.recordItem.noSellerInfo', language));
              setSellerInfo(null);
            }
          } catch (fallbackError) {
            console.error('Fallback attempt also failed:', fallbackError);
            // 両方の試行が失敗した場合
            console.error('Error fetching seller info:', apiError);
            setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
            setSellerInfo(null);
          }
        } else {
          // 両方の試行が失敗した場合
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

  // 特定のアカウントIDに対する手動マッピング
  const getHardcodedSellerInfo = (domain: string, accountId: string): any => {
    return null;
  };

  // コンポーネント内のキャッシュは使用しない（グローバルキャッシュを使用）

  // コンポーネントマウント時に自動的にセラー情報を取得（キャッシュを使用）
  useEffect(() => {
    // 入力されたレコードが無効な場合は、sellers.json情報を取得しない
    if (isParsedRecord && !(record as ParsedAdsTxtRecord).is_valid) {
      console.log('Skipping seller.json lookup for invalid record');
      return;
    }
  
    // ユニークなキーを作成（ドメインとアカウントIDの組み合わせ）
    const domain = getSellersDomain(record.account_type);
    const cacheKey = `${domain}-${record.account_id}`;
    
    // ハードコードされたマッピングをまず確認
    const hardcodedInfo = getHardcodedSellerInfo(record.domain, record.account_id);
    
    if (hardcodedInfo) {
      // ハードコードされたマッピングがある場合はそれを使用
      setSellerInfo(hardcodedInfo);
    } 
    // モジュールレベルのキャッシュをチェック
    else if (globalSellerInfoCache[cacheKey]) {
      // キャッシュに保存されているデータがあればそれを使用
      console.log(`Using module-level cached seller info for ${cacheKey}`);
      setSellerInfo(globalSellerInfoCache[cacheKey]);
      
      // 見つからなかった場合のエラーメッセージもキャッシュから復元
      if (globalSellerInfoCache[cacheKey] === null && globalSellerInfoCache[`${cacheKey}_error`]) {
        setError(globalSellerInfoCache[`${cacheKey}_error`]);
      }
    } 
    // LocalStorage キャッシュをチェック
    else if (loadFromLocalStorage(cacheKey)) {
      const cachedData = loadFromLocalStorage(cacheKey);
      const cachedError = loadFromLocalStorage(`${cacheKey}_error`);
      
      console.log(`Using localStorage cached seller info for ${cacheKey}`);
      setSellerInfo(cachedData);
      
      // モジュールレベルのキャッシュにも保存
      globalSellerInfoCache[cacheKey] = cachedData;
      
      // エラーメッセージも復元
      if (cachedData === null && cachedError) {
        setError(cachedError);
        globalSellerInfoCache[`${cacheKey}_error`] = cachedError;
      }
    }
    // ウィンドウレベルのキャッシュをチェック（後方互換性のため）
    else if (window.__SELLER_INFO_CACHE__ && window.__SELLER_INFO_CACHE__[cacheKey]) {
      // キャッシュに保存されているデータがあればそれを使用
      console.log(`Using window-level cached seller info for ${cacheKey}`);
      setSellerInfo(window.__SELLER_INFO_CACHE__[cacheKey]);
      
      // モジュールレベルのキャッシュにも保存
      globalSellerInfoCache[cacheKey] = window.__SELLER_INFO_CACHE__[cacheKey];
      
      // LocalStorage にも保存
      saveToLocalStorage(cacheKey, window.__SELLER_INFO_CACHE__[cacheKey]);
    } 
    else {
      // APIで取得を試みる
      console.log(`No cache found for ${cacheKey}, fetching from API`);
      fetchSellerInfo().then(result => {
        if (result) {
          // モジュールレベルのキャッシュに保存
          globalSellerInfoCache[cacheKey] = result;
          
          // LocalStorage にも保存
          saveToLocalStorage(cacheKey, result);
          
          // 後方互換性のため、ウィンドウレベルのキャッシュにも保存
          if (!window.__SELLER_INFO_CACHE__) {
            window.__SELLER_INFO_CACHE__ = {};
          }
          window.__SELLER_INFO_CACHE__[cacheKey] = result;
        } else {
          // エラーメッセージもキャッシュ
          globalSellerInfoCache[cacheKey] = null;
          saveToLocalStorage(cacheKey, null);
          
          if (error) {
            globalSellerInfoCache[`${cacheKey}_error`] = error;
            saveToLocalStorage(`${cacheKey}_error`, error);
          }
        }
      });
    }
  }, [record.domain, record.account_id, record.account_type, fetchSellerInfo, error, getSellersDomain, isParsedRecord]);

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
                    {console.log(`Displaying warning: ${(record as ParsedAdsTxtRecord).warning}, has duplicate_domain: ${!!(record as ParsedAdsTxtRecord).duplicate_domain}`)}
                    <Flex gap="0.5rem" alignItems="center" marginTop="0.5rem">
                      <Badge variation="warning">{t('common.warning', language)}</Badge>
                      <Text color="orange" fontSize="0.875rem">
                        {(() => {
                        const warningMessage = (record as ParsedAdsTxtRecord).warning;
                        if (!warningMessage) return '';
                        
                        // 固定された警告メッセージに対して直接対応する
                        if (warningMessage === 'errors:adsTxtValidation.duplicateEntry') {
                          const domain = (record as ParsedAdsTxtRecord).duplicate_domain || '';
                          const translatedMessage = language === 'ja' 
                            ? `パブリッシャーのads.txt（${domain}）に重複エントリが見つかりました` 
                            : `Duplicate entry found in publisher's ads.txt (${domain})`;
                          return translatedMessage;
                        } else if (warningMessage === 'errors:adsTxtValidation.duplicateEntryCaseInsensitive') {
                          const domain = (record as ParsedAdsTxtRecord).duplicate_domain || '';
                          const translatedMessage = language === 'ja'
                            ? `パブリッシャーのads.txt（${domain}）に大文字小文字の違いを除いて重複するエントリが見つかりました`
                            : `Duplicate entry found in publisher's ads.txt with different case formatting (${domain})`;
                          return translatedMessage;
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
                      // エラーメッセージに応じて直接翻訳を返す
                      const errType = errorMessage.replace('errors:adsTxtValidation.', '');
                      const domain = (record as ParsedAdsTxtRecord).domain || '';
                      const value = (record as ParsedAdsTxtRecord).raw_line?.split(',')[3]?.trim() || '';
                      
                      switch (errType) {
                        case 'invalidFormat':
                          return language === 'ja' ? '無効な形式です。カンマ区切りの値が必要です' : 'Invalid format. Expected comma-separated values';
                        case 'missingFields':
                          return language === 'ja' ? 'ラインには少なくともドメイン、アカウントID、アカウントタイプが必要です' : 'Line must contain at least domain, account ID, and account type';
                        case 'invalidRelationship':
                          return language === 'ja' ? '関係タイプはDIRECTまたはRESELLERのいずれかである必要があります' : 'Relationship type must be either DIRECT or RESELLER';
                        case 'misspelledRelationship':
                          return language === 'ja' ? `「${value}」は関係タイプのスペルミスと思われます。DIRECTまたはRESELLERが必要です` : `"${value}" appears to be a misspelled relationship type. Must be either DIRECT or RESELLER`;
                        case 'invalidRootDomain':
                          return language === 'ja' ? 'ドメインは有効なルートドメインである必要があります（例：example.com、sub.example.comではない）' : 'Domain must be a valid root domain (e.g., example.com, not sub.example.com)';
                        case 'emptyAccountId':
                          return language === 'ja' ? 'アカウントIDは空であってはなりません' : 'Account ID must not be empty';
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
