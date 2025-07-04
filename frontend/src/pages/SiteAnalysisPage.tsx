import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Flex,
  Heading,
  Radio,
  RadioGroupField,
  Text,
  TextField,
  View,
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
} from '@aws-amplify/ui-react';
import React, { useState } from 'react';
import { openSinceraApi } from '../api';
import { PublisherMetadata } from '../models';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const SiteAnalysisPage: React.FC = () => {
  const { language } = useApp();
  const [searchType, setSearchType] = useState<'domain' | 'publisherId'>('domain');
  const [domain, setDomain] = useState<string>('');
  const [publisherId, setPublisherId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [publisherData, setPublisherData] = useState<PublisherMetadata | null>(null);

  // バリデーション関数
  const validateDomain = (value: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(value);
  };

  // 検索実行
  const handleSearch = async () => {
    setError(null);
    setPublisherData(null);

    // バリデーション
    if (searchType === 'domain') {
      if (!domain.trim()) {
        setError(t('siteAnalysis.errors.searchRequired', language));
        return;
      }
      if (!validateDomain(domain.trim())) {
        setError(t('siteAnalysis.errors.invalidDomain', language));
        return;
      }
    } else {
      if (!publisherId.trim()) {
        setError(t('siteAnalysis.errors.searchRequired', language));
        return;
      }
    }

    setIsLoading(true);

    try {
      let response;
      if (searchType === 'domain') {
        response = await openSinceraApi.getPublisherByDomain(domain.trim());
      } else {
        response = await openSinceraApi.getPublisherById(publisherId.trim());
      }

      if (response.success && response.data) {
        setPublisherData(response.data);
      } else {
        setError(t('siteAnalysis.results.noResults', language));
      }
    } catch (err: any) {
      console.error('Search error:', err);
      
      if (err.response?.status === 404) {
        setError(t('siteAnalysis.results.noResults', language));
      } else if (err.response?.status === 429) {
        setError(t('siteAnalysis.errors.apiError', language, { message: 'Rate limit exceeded' }));
      } else if (err.message?.includes('Network Error')) {
        setError(t('siteAnalysis.errors.networkError', language));
      } else {
        setError(t('siteAnalysis.errors.searchFailed', language));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // クリア機能
  const handleClear = () => {
    setDomain('');
    setPublisherId('');
    setError(null);
    setPublisherData(null);
  };

  // ステータスバッジの色を決定
  const getStatusBadgeVariation = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'info';
    }
  };

  // 認証ステータスバッジの色を決定
  const getVerificationBadgeVariation = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'unverified':
        return 'error';
      default:
        return 'info';
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US');
    } catch {
      return dateString;
    }
  };

  return (
    <View padding="1rem">
      {/* パンくずナビ */}
      <Breadcrumbs
        items={[
          {
            href: '/',
            label: t('common.home', language),
          },
          {
            href: '/site-analysis',
            label: t('siteAnalysis.pageTitle', language),
            isCurrent: true,
          },
        ]}
        marginBottom="1rem"
      />

      {/* ページヘッダー */}
      <Heading level={1} marginBottom="0.5rem">
        {t('siteAnalysis.pageTitle', language)}
      </Heading>
      <Text color="font.secondary" marginBottom="2rem">
        {t('siteAnalysis.subtitle', language)}
      </Text>

      {/* 検索フォーム */}
      <Card marginBottom="2rem">
        <Heading level={3} marginBottom="1rem">
          {t('siteAnalysis.searchForm.title', language)}
        </Heading>

        {/* 検索タイプ選択 */}
        <RadioGroupField
          label={t('siteAnalysis.searchForm.searchType', language)}
          name="searchType"
          value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value as 'domain' | 'publisherId');
            setError(null);
          }}
          marginBottom="1rem"
        >
          <Radio value="domain">
            {t('siteAnalysis.searchForm.searchByDomain', language)}
          </Radio>
          <Radio value="publisherId">
            {t('siteAnalysis.searchForm.searchByPublisherId', language)}
          </Radio>
        </RadioGroupField>

        {/* 検索入力フィールド */}
        <Flex direction="row" gap="1rem" alignItems="end">
          {searchType === 'domain' ? (
            <TextField
              label={t('siteAnalysis.searchForm.domainLabel', language)}
              placeholder={t('siteAnalysis.searchForm.domainPlaceholder', language)}
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setError(null);
              }}
              flex="1"
              isDisabled={isLoading}
            />
          ) : (
            <TextField
              label={t('siteAnalysis.searchForm.publisherIdLabel', language)}
              placeholder={t('siteAnalysis.searchForm.publisherIdPlaceholder', language)}
              value={publisherId}
              onChange={(e) => {
                setPublisherId(e.target.value);
                setError(null);
              }}
              flex="1"
              isDisabled={isLoading}
            />
          )}

          <Button
            onClick={handleSearch}
            isLoading={isLoading}
            loadingText={t('siteAnalysis.loading.searching', language)}
            variation="primary"
          >
            {t('siteAnalysis.searchForm.searchButton', language)}
          </Button>

          <Button
            onClick={handleClear}
            variation="link"
            isDisabled={isLoading}
          >
            {t('siteAnalysis.searchForm.clearButton', language)}
          </Button>
        </Flex>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variation="error" marginBottom="2rem">
          {error}
        </Alert>
      )}

      {/* 検索結果 */}
      {publisherData && (
        <Card>
          <Heading level={3} marginBottom="1rem">
            {t('siteAnalysis.results.title', language)}
          </Heading>

          <Table caption="" marginBottom="2rem">
            <TableHead>
              <TableRow>
                <TableCell as="th">{t('common.details', language)}</TableCell>
                <TableCell as="th">{t('common.value', language)}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.publisherId', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.publisherId', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherId}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.publisherName', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.publisherName', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherName}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.publisherDomain', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.publisherDomain', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherDomain}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.status', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.status', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Flex direction="column" gap="0.5rem">
                    <Badge variation={getStatusBadgeVariation(publisherData.status)}>
                      {t(`siteAnalysis.statusValues.${publisherData.status}`, language)}
                    </Badge>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {t(`siteAnalysis.statusDescriptions.${publisherData.status}`, language)}
                    </Text>
                  </Flex>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.verificationStatus', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.verificationStatus', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Flex direction="column" gap="0.5rem">
                    <Badge variation={getVerificationBadgeVariation(publisherData.verificationStatus)}>
                      {t(`siteAnalysis.verificationValues.${publisherData.verificationStatus}`, language)}
                    </Badge>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {t(`siteAnalysis.verificationDescriptions.${publisherData.verificationStatus}`, language)}
                    </Text>
                  </Flex>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {t('siteAnalysis.results.lastUpdated', language)}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {t('siteAnalysis.fieldDescriptions.lastUpdated', language)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{formatDate(publisherData.lastUpdated)}</Text>
                </TableCell>
              </TableRow>

              {publisherData.contactEmail && (
                <TableRow>
                  <TableCell>
                    <Text fontWeight="bold">
                      {t('siteAnalysis.results.contactEmail', language)}
                    </Text>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {t('siteAnalysis.fieldDescriptions.contactEmail', language)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{publisherData.contactEmail}</Text>
                  </TableCell>
                </TableRow>
              )}

              {publisherData.categories && publisherData.categories.length > 0 && (
                <TableRow>
                  <TableCell>
                    <Text fontWeight="bold">
                      {t('siteAnalysis.results.categories', language)}
                    </Text>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {t('siteAnalysis.fieldDescriptions.categories', language)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Flex direction="row" gap="0.5rem" wrap="wrap">
                      {publisherData.categories.map((category, index) => (
                        <Badge key={index} variation="info">
                          {category}
                        </Badge>
                      ))}
                    </Flex>
                  </TableCell>
                </TableRow>
              )}

            </TableBody>
          </Table>

          {/* 追加メタデータセクション */}
          {publisherData.metadata && Object.keys(publisherData.metadata).length > 0 && (
            <>
              <Heading level={4} marginTop="2rem" marginBottom="1rem">
                {t('siteAnalysis.results.additionalMetadata', language)}
              </Heading>
              
              <Table caption="">
                <TableHead>
                  <TableRow>
                    <TableCell as="th">{t('common.details', language)}</TableCell>
                    <TableCell as="th">{t('common.value', language)}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(publisherData.metadata).map(([key, value]) => {
                    // 翻訳キーとしてキーをマップ
                    const translationKey = `siteAnalysis.metadataDescriptions.${key}`;
                    const hasDescription = t(translationKey, language) !== translationKey;
                    
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Text fontWeight="bold" textTransform="capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Text>
                          {hasDescription && (
                            <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                              {t(translationKey, language)}
                            </Text>
                          )}
                        </TableCell>
                        <TableCell>
                          <Text>
                            {value !== null && value !== undefined ? String(value) : '-'}
                          </Text>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </Card>
      )}
    </View>
  );
};

export default SiteAnalysisPage;