import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Heading,
  Radio,
  RadioGroupField,
  Text,
  TextAreaField,
  TextField,
  View,
} from '@aws-amplify/ui-react';
import React, { useState } from 'react';
import { adsTxtApi } from '../api';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const OptimizerPage: React.FC = () => {
  const { language } = useApp();
  const [domain, setDomain] = useState<string>('');
  const [optimizationLevel, setOptimizationLevel] = useState<string>('level1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [optimizedContent, setOptimizedContent] = useState<string>('');
  const [stats, setStats] = useState<{
    beforeCount: number;
    afterCount: number;
    duplicatesRemoved: number;
    variablesOrganized: number;
  } | null>(null);
  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract the domain when the URL in entered
    const url =
      e.target.value.startsWith('http') || e.target.value.startsWith('https')
        ? new URL(e.target.value)
        : new URL(`https://${e.target.value}`);
    const domain = url.hostname;
    setDomain(domain);
    resetMessages();
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    resetMessages();
  };

  const fetchFromDomain = async () => {
    if (!domain) {
      setError(t('optimizerPage.errors.invalidDomain', language));
      return;
    }

    try {
      setIsLoading(true);
      resetMessages();

      // Fetch ads.txt from domain
      const response = await adsTxtApi.getAdsTxtFromDomain(domain, true);

      if (response.success && response.data.content) {
        return response.data.content;
      } else {
        setError(t('optimizerPage.errors.fetchFailed', language));
        return null;
      }
    } catch (err) {
      console.error(err);
      setError(t('optimizerPage.errors.fetchFailed', language));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (before: string, after: string) => {
    const beforeLines = before
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'));

    const afterLines = after
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'));

    // Count variables
    const afterVars = afterLines.filter((line) =>
      /^(CONTACT|SUBDOMAIN|INVENTORYPARTNERDOMAIN|OWNERDOMAIN|MANAGERDOMAIN)=/i.test(line.trim())
    ).length;

    return {
      beforeCount: beforeLines.length,
      afterCount: afterLines.length,
      duplicatesRemoved: Math.max(0, beforeLines.length - afterLines.length),
      variablesOrganized: afterVars,
    };
  };

  const handleOptimize = async () => {
    try {
      setIsLoading(true);
      resetMessages();

      // Fetch content from domain
      const fetchedContent = await fetchFromDomain();
      if (!fetchedContent) return;

      // Save original content
      setOriginalContent(fetchedContent);

      // Call the API to optimize
      const response = await adsTxtApi.optimizeAdsTxtContent(fetchedContent, domain);

      if (response.success) {
        setOptimizedContent(response.data.optimized_content);

        // Calculate stats
        const statsData = calculateStats(fetchedContent, response.data.optimized_content);
        setStats(statsData);

        setSuccess(t('optimizerPage.success.optimizeSuccess', language));
      } else {
        setError(t('optimizerPage.errors.optimizeFailed', language));
      }
    } catch (err) {
      console.error(err);
      setError(t('optimizerPage.errors.optimizeFailed', language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (optimizedContent) {
      // モダンなClipboard APIを使用
      navigator.clipboard
        .writeText(optimizedContent)
        .then(() => {
          setSuccess(t('optimizerPage.success.copySuccess', language));

          // 3秒後に成功メッセージを非表示
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        })
        .catch((err) => {
          console.error('クリップボードへのコピーに失敗しました:', err);
          setError('クリップボードへのコピーに失敗しました');
        });
    }
  };

  const handleDownload = () => {
    if (optimizedContent) {
      const element = document.createElement('a');
      const file = new Blob([optimizedContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'optimized_ads.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" gap="2rem">
        <Heading level={1}>{t('optimizerPage.title', language)}</Heading>
        <Text>{t('optimizerPage.description', language)}</Text>

        <Card variation="outlined">
          <Heading level={3}>{t('optimizerPage.inputSection.title', language)}</Heading>
          <Divider marginBlock="1rem" />

          <Flex direction="column" gap="1.5rem">
            <TextField
              label={t('optimizerPage.inputSection.urlLabel', language)}
              placeholder={t('optimizerPage.inputSection.urlPlaceholder', language)}
              value={domain}
              onChange={(e) => handleDomainChange(e)}
              marginBottom="1rem"
              descriptiveText={t('optimizerPage.inputSection.urlHelperText', language)}
            />

            <RadioGroupField
              label={t('optimizerPage.optimizationLevels.label', language)}
              name="optimizationLevel"
              value={optimizationLevel}
              onChange={handleLevelChange}
            >
              <Radio value="level1">
                <Flex direction="column">
                  <Text fontWeight="bold">
                    {t('optimizerPage.optimizationLevels.level1.title', language)}
                  </Text>
                  <Text fontSize="small">
                    {t('optimizerPage.optimizationLevels.level1.description', language)}
                  </Text>
                </Flex>
              </Radio>
              <Radio value="level2" isDisabled>
                <Flex direction="row" alignItems="center" gap="0.5rem">
                  <Flex direction="column">
                    <Text fontWeight="bold">
                      {t('optimizerPage.optimizationLevels.level2.title', language)}
                    </Text>
                    <Text fontSize="small">
                      {t('optimizerPage.optimizationLevels.level2.description', language)}
                    </Text>
                  </Flex>
                  <Badge variation="info">
                    {t('optimizerPage.optimizationLevels.level2.comingSoon', language)}
                  </Badge>
                </Flex>
              </Radio>
            </RadioGroupField>

            {error && <Alert variation="error">{error}</Alert>}

            {success && <Alert variation="success">{success}</Alert>}

            <Button
              variation="primary"
              onClick={handleOptimize}
              isLoading={isLoading}
              loadingText={t('common.loading', language)}
            >
              {t('optimizerPage.inputSection.optimizeButton', language)}
            </Button>
          </Flex>
        </Card>

        {optimizedContent && (
          <Card variation="outlined">
            <Heading level={3}>{t('optimizerPage.resultSection.title', language)}</Heading>
            <Divider marginBlock="1rem" />

            <Flex direction="column" gap="1rem">
              {stats && (
                <Card variation="outlined">
                  <Heading level={5}>
                    {t('optimizerPage.resultSection.statsLabel', language)}
                  </Heading>
                  <Flex gap="1rem" wrap="wrap">
                    <Badge variation="info">
                      {t('optimizerPage.resultSection.recordsBefore', language, {
                        count: stats.beforeCount,
                      })}
                    </Badge>
                    <Badge variation="success">
                      {t('optimizerPage.resultSection.recordsAfter', language, {
                        count: stats.afterCount,
                      })}
                    </Badge>
                    <Badge variation="warning">
                      {t('optimizerPage.resultSection.duplicatesRemoved', language, {
                        count: stats.duplicatesRemoved,
                      })}
                    </Badge>
                    <Badge variation="info">
                      {t('optimizerPage.resultSection.variablesOrganized', language, {
                        count: stats.variablesOrganized,
                      })}
                    </Badge>
                  </Flex>
                </Card>
              )}

              <Flex direction={{ base: 'column', large: 'row' }} gap="1rem">
                <View flex="1">
                  <Heading level={5}>
                    {t('optimizerPage.resultSection.beforeLabel', language)}
                  </Heading>
                  <TextAreaField
                    label=""
                    labelHidden={true}
                    rows={15}
                    isReadOnly
                    value={originalContent}
                    width="100%"
                  />
                </View>

                <View flex="1">
                  <Heading level={5}>
                    {t('optimizerPage.resultSection.afterLabel', language)}
                  </Heading>
                  <TextAreaField
                    label=""
                    labelHidden={true}
                    rows={15}
                    isReadOnly
                    value={optimizedContent}
                    width="100%"
                  />
                </View>
              </Flex>

              <Flex gap="1rem">
                <Button onClick={handleCopyToClipboard}>
                  {t('optimizerPage.inputSection.copyButton', language)}
                </Button>
                <Button variation="primary" onClick={handleDownload}>
                  {t('optimizerPage.inputSection.downloadButton', language)}
                </Button>
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>
    </View>
  );
};

export default OptimizerPage;
