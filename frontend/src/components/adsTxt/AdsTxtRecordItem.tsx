import { Badge, Button, Card, Flex, Loader, Text } from '@aws-amplify/ui-react';
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';

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
  const getSellersDomain = (accountType: string): string => {
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
  };

  // Function to fetch seller information
  const fetchSellerInfo = useCallback(async () => {
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
            setSellerInfo(response.data);
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
              setSellerInfo(fallbackResponse.data);
              setError(null);
              return; // 成功したら終了
            } else if (fallbackResponse.success && fallbackResponse.data) {
              // セラー情報が見つからない場合
              setError(t('adsTxt.recordItem.noSellerInfo', language));
              setSellerInfo(null);
              return;
            }
          } catch (fallbackError) {
            console.error('Fallback attempt also failed:', fallbackError);
          }
        }

        // 両方の試行が失敗した場合
        console.error('Error fetching seller info:', apiError);
        setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
        setSellerInfo(null);
      }
    } catch (err: any) {
      console.error('Error fetching seller info:', err);
      setError(t('adsTxt.recordItem.errorFetchingSellerInfo', language));
      setSellerInfo(null);
    } finally {
      setLoading(false);
    }
  }, [record.account_id, record.account_type, record.domain, language]);

  // 特定のアカウントIDに対する手動マッピング
  const getHardcodedSellerInfo = (domain: string, accountId: string): any => {
    return null;
  };

  // コンポーネントマウント時に自動的にセラー情報を取得
  useEffect(() => {
    // ハードコードされたマッピングをまず確認
    const hardcodedInfo = getHardcodedSellerInfo(record.domain, record.account_id);
    if (hardcodedInfo) {
      // ハードコードされたマッピングがある場合はそれを使用
      setSellerInfo(hardcodedInfo);
    } else {
      // APIで取得を試みる
      fetchSellerInfo();
    }
  }, [record.domain, record.account_id, fetchSellerInfo]);

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
            <strong>{t('adsTxt.recordItem.accountId', language)}:</strong> {record.account_id}
          </Text>
          <Text>
            <strong>{t('adsTxt.recordItem.accountType', language)}:</strong> {record.account_type}
          </Text>
          <Text>
            <strong>{t('adsTxt.recordItem.relationship', language)}:</strong> {record.relationship}
          </Text>
          {record.certification_authority_id && (
            <Text>
              <strong>{t('adsTxt.recordItem.certificationAuthorityId', language)}:</strong>{' '}
              {record.certification_authority_id}
            </Text>
          )}
        </Flex>

        {/* Sellers.json Information */}
        {sellerInfo && !loading && sellerInfo.seller && (
          <Flex gap="1rem" wrap="wrap" marginTop="0.5rem">
            <Text>
              <strong>{t('adsTxt.recordItem.sellerInfo', language)}:</strong>{' '}
            </Text>
            {sellerInfo.seller.is_confidential ? (
              <Badge variation="warning">{t('adsTxt.recordItem.confidential', language)}</Badge>
            ) : (
              <>
                <Text>{sellerInfo.seller.name || ''}</Text>
                {sellerInfo.seller.domain ? (
                  <Text>
                    <strong>{t('adsTxt.recordItem.sellerDomain', language)}:</strong>{' '}
                    {sellerInfo.seller.domain}
                  </Text>
                ) : null}
                {sellerInfo.seller.seller_type ? (
                  <Text>
                    <strong>{t('adsTxt.recordItem.sellerType', language)}:</strong>{' '}
                    {sellerInfo.seller.seller_type}
                  </Text>
                ) : null}
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
              <Badge variation="success">{t('common.valid', language)}</Badge>
            ) : (
              <Flex direction="column" width="100%">
                <Badge variation="error">{t('common.invalid', language)}</Badge>
                <Text color="red" fontSize="0.875rem">
                  {(record as ParsedAdsTxtRecord).error}
                </Text>
              </Flex>
            )}
          </Flex>
        )}

        {/* ローディング中の表示 */}
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
