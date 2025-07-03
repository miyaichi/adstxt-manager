import {
  Alert,
  Badge,
  Breadcrumbs,
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
  const [currentPhase, setCurrentPhase] = useState<string>('idle');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [progressValue, setProgressValue] = useState<number>(0);

  // 処理のフェーズ
  const phases = {
    idle: 'idle',
    fetchingAdsTxt: 'fetchingAdsTxt',
    parsingAdsTxt: 'parsingAdsTxt',
    fetchingSellersJson: 'fetchingSellersJson',
    optimizingAdsTxt: 'optimizingAdsTxt',
    completed: 'completed',
  };

  // カテゴリごとの統計情報
  const [categories, setCategories] = useState<{
    other: number;
    confidential: number;
    missing_seller_id: number;
    no_seller_json: number;
  } | null>(null);

  // 一般的な統計情報
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

  const resetState = () => {
    setOriginalContent('');
    setOptimizedContent('');
    setStats(null);
    setCategories(null);
    setCurrentPhase(phases.idle);
    setProgressValue(0);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptimizationLevel(e.target.value);
    resetMessages();
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // Extract the domain when the URL in entered
      const url =
        e.target.value.startsWith('http') || e.target.value.startsWith('https')
          ? new URL(e.target.value)
          : new URL(`https://${e.target.value}`);
      const domain = url.hostname;
      setDomain(domain);
      resetMessages();
    } catch (error) {
      // 無効なURLの場合は入力値をそのまま使用
      setDomain(e.target.value);
    }
  };

  const fetchFromDomain = async (signal?: AbortSignal) => {
    if (!domain) {
      setError(t('optimizerPage.errors.invalidDomain', language));
      return null;
    }

    try {
      setCurrentPhase(phases.fetchingAdsTxt);
      setProgressValue(20);

      // Fetch ads.txt from domain
      const response = await adsTxtApi.getAdsTxtFromDomain(domain, true);

      if (signal?.aborted) {
        console.log('Fetch operation was aborted');
        return null;
      }

      if (response.success && response.data.content) {
        return response.data.content;
      } else {
        setError(t('optimizerPage.errors.fetchFailed', language));
        return null;
      }
    } catch (err) {
      if (signal?.aborted) {
        console.log('Fetch operation was aborted');
        return null;
      }

      console.error(err);
      setError(t('optimizerPage.errors.fetchFailed', language));
      return null;
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

  const handleCancelOptimize = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setCurrentPhase(phases.idle);
    setProgressValue(0);
    setSuccess(
      t('optimizerPage.success.operationCancelled', language, {
        defaultValue: 'Operation cancelled',
      })
    );
  };

  const handleOptimize = async () => {
    try {
      // 新しいAbortControllerを作成
      const controller = new AbortController();
      setAbortController(controller);
      const signal = controller.signal;

      setIsLoading(true);
      resetMessages();
      resetState();

      // フェーズ1: ads.txtを取得
      const fetchedContent = await fetchFromDomain(signal);
      if (!fetchedContent || signal.aborted) {
        return;
      }

      // 元のコンテンツを保存
      setOriginalContent(fetchedContent);

      // フェーズ2: ads.txtを解析
      setCurrentPhase(phases.parsingAdsTxt);
      setProgressValue(40);

      // 少し遅延してUIの更新を表示
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (signal.aborted) return;

      // フェーズ3: 最適化レベルに応じてsellers.jsonを取得（レベル2のみ）
      if (optimizationLevel === 'level2') {
        setCurrentPhase(phases.fetchingSellersJson);
        setProgressValue(60);
        // 少し遅延してUIの更新を表示
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (signal.aborted) return;
      }

      // フェーズ4: ads.txtを最適化
      setCurrentPhase(phases.optimizingAdsTxt);
      setProgressValue(80);

      // APIを呼び出して最適化
      const response = await adsTxtApi.optimizeAdsTxtContent(
        fetchedContent,
        domain,
        optimizationLevel as 'level1' | 'level2'
      );

      if (signal.aborted) return;

      if (response.success) {
        setOptimizedContent(response.data.optimized_content);

        // レベル2の場合、カテゴリ情報を設定
        if (response.data.categories) {
          setCategories(response.data.categories);
        }

        // 統計を計算して設定
        if (response.data.original_length && response.data.optimized_length) {
          // APIから提供される統計情報を使用
          const statsData = calculateStats(fetchedContent, response.data.optimized_content);
          setStats(statsData);
        } else {
          // バックアップ方法として手動計算
          const statsData = calculateStats(fetchedContent, response.data.optimized_content);
          setStats(statsData);
        }

        setCurrentPhase(phases.completed);
        setProgressValue(100);
        setSuccess(t('optimizerPage.success.optimizeSuccess', language));
      } else {
        console.error('Optimization failed:', response.error);
        setError(t('optimizerPage.errors.optimizeFailed', language));
      }
    } catch (err) {
      console.error('Error during optimization:', err);
      setError(t('optimizerPage.errors.optimizeFailed', language));
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleCopyToClipboard = () => {
    if (optimizedContent) {
      navigator.clipboard
        .writeText(optimizedContent)
        .then(() => {
          setSuccess(t('optimizerPage.success.copySuccess', language));

          // Disable the success message after 3 seconds
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        })
        .catch((err) => {
          console.error('Failed to copy to the clipboard:', err);
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

  // フェーズに応じたローディングメッセージを取得
  const getPhaseMessage = () => {
    switch (currentPhase) {
      case phases.fetchingAdsTxt:
        return t('optimizerPage.phase.fetchingAdsTxt', language, {
          defaultValue: 'Fetching ads.txt from domain...',
        });
      case phases.parsingAdsTxt:
        return t('optimizerPage.phase.parsingAdsTxt', language, {
          defaultValue: 'Parsing ads.txt content...',
        });
      case phases.fetchingSellersJson:
        return t('optimizerPage.phase.fetchingSellersJson', language, {
          defaultValue: 'Fetching sellers.json data...',
        });
      case phases.optimizingAdsTxt:
        return t('optimizerPage.phase.optimizingAdsTxt', language, {
          defaultValue: 'Optimizing ads.txt content...',
        });
      case phases.completed:
        return t('optimizerPage.phase.completed', language, {
          defaultValue: 'Optimization completed!',
        });
      default:
        return t('optimizerPage.loadingMessage', language, {
          defaultValue: 'Processing...',
        });
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" gap="2rem">
        <Breadcrumbs
          items={[
            { label: t('common.home', language), href: '/' },
            {
              label: t('optimizerPage.breadcrumb', language, { defaultValue: 'Ads.txt Optimizer' }),
              isCurrent: true,
            },
          ]}
        />

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
              isDisabled={isLoading} // Input field is disabled while loading
              isRequired={true}
            />

            <RadioGroupField
              label={t('optimizerPage.optimizationLevels.label', language)}
              name="optimizationLevel"
              value={optimizationLevel}
              onChange={handleLevelChange}
              isDisabled={isLoading} // Radio group is disabled while loading
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
              <Radio value="level2">
                <Flex direction="row" alignItems="center" gap="0.5rem">
                  <Flex direction="column">
                    <Text fontWeight="bold">
                      {t('optimizerPage.optimizationLevels.level2.title', language)}
                    </Text>
                    <Text fontSize="small">
                      {t('optimizerPage.optimizationLevels.level2.description', language)}
                    </Text>
                  </Flex>
                </Flex>
              </Radio>
            </RadioGroupField>

            {error && <Alert variation="error">{error}</Alert>}

            {success && <Alert variation="success">{success}</Alert>}

            {isLoading && (
              <Card variation="outlined">
                <Flex direction="column" gap="1rem">
                  <Heading level={5}>{getPhaseMessage()}</Heading>
                  <Text>{progressValue}% 完了</Text>
                  <div
                    style={{
                      height: '8px',
                      width: '100%',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressValue}%`,
                        backgroundColor: '#0972d3',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </Flex>
              </Card>
            )}

            <Flex direction="column" gap="1rem">
              {!isLoading ? (
                <Button
                  variation="primary"
                  onClick={handleOptimize}
                  isDisabled={!domain} // Disable button if domain is empty
                >
                  {t('optimizerPage.inputSection.optimizeButton', language)}
                </Button>
              ) : (
                <Button variation="warning" onClick={handleCancelOptimize}>
                  {t('optimizerPage.inputSection.cancelButton', language, {
                    defaultValue: 'Cancel',
                  })}
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {optimizedContent && (
          <Card variation="outlined">
            <Heading level={3}>{t('optimizerPage.resultSection.title', language)}</Heading>
            <Divider marginBlock="1rem" />

            <Flex direction="column" gap="1rem">
              {/* 基本統計情報 */}
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

              {/* レベル2の場合のカテゴリ統計情報 */}
              {categories && (
                <Card variation="outlined">
                  <Heading level={5}>
                    {t('optimizerPage.resultSection.categoriesLabel', language, {
                      defaultValue: 'Category Breakdown',
                    })}
                  </Heading>
                  <Flex gap="1rem" wrap="wrap">
                    <Badge variation="success">
                      {t('optimizerPage.resultSection.categoryOther', language, {
                        defaultValue: 'Standard Records: {count}',
                        count: categories.other,
                      })}
                    </Badge>
                    <Badge variation="info">
                      {t('optimizerPage.resultSection.categoryConfidential', language, {
                        defaultValue: 'Confidential Sellers: {count}',
                        count: categories.confidential,
                      })}
                    </Badge>
                    <Badge variation="warning">
                      {t('optimizerPage.resultSection.categoryMissingSellerId', language, {
                        defaultValue: 'Not in Sellers.json: {count}',
                        count: categories.missing_seller_id,
                      })}
                    </Badge>
                    <Badge variation="warning">
                      {t('optimizerPage.resultSection.categoryNoSellerJson', language, {
                        defaultValue: 'No Sellers.json: {count}',
                        count: categories.no_seller_json,
                      })}
                    </Badge>
                  </Flex>
                </Card>
              )}

              {/* 変換前/後の内容表示 */}
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

              {/* コピー/ダウンロードボタン */}
              <Flex gap="1rem">
                <Button onClick={handleCopyToClipboard} isDisabled={isLoading}>
                  {t('optimizerPage.inputSection.copyButton', language)}
                </Button>
                <Button variation="primary" onClick={handleDownload} isDisabled={isLoading}>
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
