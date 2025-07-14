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
import { useTranslation } from '../hooks/useTranslation';
import { useApp } from '../context/AppContext';

const SiteAnalysisPage: React.FC = () => {
  const translate = useTranslation();
  const { language } = useApp();
  const [searchType, setSearchType] = useState<'domain' | 'publisherId'>('domain');
  const [domain, setDomain] = useState<string>('');
  const [publisherId, setPublisherId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [publisherData, setPublisherData] = useState<PublisherMetadata | null>(null);

  // バリデーション関数
  const validateDomain = (value: string): boolean => {
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(value);
  };

  // 検索実行
  const handleSearch = async () => {
    setError(null);
    setPublisherData(null);

    // バリデーション
    if (searchType === 'domain') {
      if (!domain.trim()) {
        setError(translate('siteAnalysis.errors.searchRequired'));
        return;
      }
      if (!validateDomain(domain.trim())) {
        setError(translate('siteAnalysis.errors.invalidDomain'));
        return;
      }
    } else {
      if (!publisherId.trim()) {
        setError(translate('siteAnalysis.errors.searchRequired'));
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
        setError(translate('siteAnalysis.results.noResults'));
      }
    } catch (err: any) {
      console.error('Search error:', err);

      if (err.response?.status === 404) {
        setError(translate('siteAnalysis.results.noResults'));
      } else if (err.response?.status === 429) {
        setError(translate('siteAnalysis.errors.apiError', ['Rate limit exceeded']));
      } else if (err.message?.includes('Network Error')) {
        setError(translate('siteAnalysis.errors.networkError'));
      } else {
        setError(translate('siteAnalysis.errors.searchFailed'));
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
            label: translate('common.home'),
          },
          {
            href: '/site-analysis',
            label: translate('siteAnalysis.pageTitle'),
            isCurrent: true,
          },
        ]}
        marginBottom="1rem"
      />

      {/* ページヘッダー */}
      <Heading level={1} marginBottom="0.5rem">
        {translate('siteAnalysis.pageTitle')}
      </Heading>
      <Text color="font.secondary" marginBottom="2rem">
        {translate('siteAnalysis.subtitle')}
      </Text>

      {/* 検索フォーム */}
      <Card marginBottom="2rem">
        <Heading level={3} marginBottom="1rem">
          {translate('siteAnalysis.searchForm.title')}
        </Heading>

        {/* 検索タイプ選択 */}
        <RadioGroupField
          label={translate('siteAnalysis.searchForm.searchType')}
          name="searchType"
          value={searchType}
          onChange={(e) => {
            setSearchType(e.target.value as 'domain' | 'publisherId');
            setError(null);
          }}
          marginBottom="1rem"
        >
          <Radio value="domain">{translate('siteAnalysis.searchForm.searchByDomain')}</Radio>
          <Radio value="publisherId">
            {translate('siteAnalysis.searchForm.searchByPublisherId')}
          </Radio>
        </RadioGroupField>

        {/* 検索入力フィールド */}
        <Flex direction="row" gap="1rem" alignItems="end">
          {searchType === 'domain' ? (
            <TextField
              label={translate('siteAnalysis.searchForm.domainLabel')}
              placeholder={translate('siteAnalysis.searchForm.domainPlaceholder')}
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
              label={translate('siteAnalysis.searchForm.publisherIdLabel')}
              placeholder={translate('siteAnalysis.searchForm.publisherIdPlaceholder')}
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
            loadingText={translate('siteAnalysis.loading.searching')}
            variation="primary"
          >
            {translate('siteAnalysis.searchForm.searchButton')}
          </Button>

          <Button onClick={handleClear} variation="link" isDisabled={isLoading}>
            {translate('siteAnalysis.searchForm.clearButton')}
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
            {translate('siteAnalysis.results.title')}
          </Heading>

          <Table caption="" marginBottom="2rem">
            <TableHead>
              <TableRow>
                <TableCell as="th">{translate('common.details')}</TableCell>
                <TableCell as="th">{translate('common.value')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">{translate('siteAnalysis.results.publisherId')}</Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.publisherId')}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherId}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">{translate('siteAnalysis.results.publisherName')}</Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.publisherName')}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherName}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {translate('siteAnalysis.results.publisherDomain')}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.publisherDomain')}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text>{publisherData.publisherDomain}</Text>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">{translate('siteAnalysis.results.status')}</Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.status')}
                  </Text>
                </TableCell>
                <TableCell>
                  <Flex direction="column" gap="0.5rem">
                    <Badge variation={getStatusBadgeVariation(publisherData.status)}>
                      {translate(`siteAnalysis.statusValues.${publisherData.status}`)}
                    </Badge>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {translate(`siteAnalysis.statusDescriptions.${publisherData.status}`)}
                    </Text>
                  </Flex>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">
                    {translate('siteAnalysis.results.verificationStatus')}
                  </Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.verificationStatus')}
                  </Text>
                </TableCell>
                <TableCell>
                  <Flex direction="column" gap="0.5rem">
                    <Badge
                      variation={getVerificationBadgeVariation(publisherData.verificationStatus)}
                    >
                      {translate(`siteAnalysis.verificationValues.${publisherData.verificationStatus}`)}
                    </Badge>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {translate(`siteAnalysis.verificationDescriptions.${publisherData.verificationStatus}`)}
                    </Text>
                  </Flex>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>
                  <Text fontWeight="bold">{translate('siteAnalysis.results.lastUpdated')}</Text>
                  <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                    {translate('siteAnalysis.fieldDescriptions.lastUpdated')}
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
                      {translate('siteAnalysis.results.contactEmail')}
                    </Text>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {translate('siteAnalysis.fieldDescriptions.contactEmail')}
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
                    <Text fontWeight="bold">{translate('siteAnalysis.results.categories')}</Text>
                    <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                      {translate('siteAnalysis.fieldDescriptions.categories')}
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
                {translate('siteAnalysis.results.additionalMetadata')}
              </Heading>

              <Table caption="">
                <TableHead>
                  <TableRow>
                    <TableCell as="th">{translate('common.details')}</TableCell>
                    <TableCell as="th">{translate('common.value')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(publisherData.metadata).map(([key, value]) => {
                    // 翻訳キーとしてキーをマップ
                    const translationKey = `siteAnalysis.metadataDescriptions.${key}`;
                    const hasDescription = translate(translationKey) !== translationKey;

                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Text fontWeight="bold" textTransform="capitalize">
                            {key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())}
                          </Text>
                          {hasDescription && (
                            <Text fontSize="small" color="font.secondary" whiteSpace="pre-line">
                              {translate(translationKey)}
                            </Text>
                          )}
                        </TableCell>
                        <TableCell>
                          <Text>{value !== null && value !== undefined ? String(value) : '-'}</Text>
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
