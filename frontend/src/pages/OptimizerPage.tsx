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
import { useTranslation } from '../hooks/useTranslation';

const OptimizerPage: React.FC = () => {
  const translate = useTranslation();
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
      setError(translate('optimizerPage.errors.invalidDomain'));
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
        setError(translate('optimizerPage.errors.fetchFailed'));
        return null;
      }
    } catch (err) {
      if (signal?.aborted) {
        console.log('Fetch operation was aborted');
        return null;
      }

      console.error(err);
      setError(translate('optimizerPage.errors.fetchFailed'));
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
    setSuccess(translate('optimizerPage.success.operationCancelled'));
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
        setSuccess(translate('optimizerPage.success.optimizeSuccess'));
      } else {
        console.error('Optimization failed:', response.error);
        setError(translate('optimizerPage.errors.optimizeFailed'));
      }
    } catch (err) {
      console.error('Error during optimization:', err);
      setError(translate('optimizerPage.errors.optimizeFailed'));
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
          setSuccess(translate('optimizerPage.success.copySuccess'));

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
        return translate('optimizerPage.phase.fetchingAdsTxt');
      case phases.parsingAdsTxt:
        return translate('optimizerPage.phase.parsingAdsTxt');
      case phases.fetchingSellersJson:
        return translate('optimizerPage.phase.fetchingSellersJson');
      case phases.optimizingAdsTxt:
        return translate('optimizerPage.phase.optimizingAdsTxt');
      case phases.completed:
        return translate('optimizerPage.phase.completed');
      default:
        return translate('optimizerPage.loadingMessage');
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" gap="2rem">
        <Breadcrumbs
          items={[
            { label: translate('common.home'), href: '/' },
            {
              label: translate('optimizerPage.breadcrumb'),
              isCurrent: true,
            },
          ]}
        />

        <Heading level={1}>{translate('optimizerPage.title')}</Heading>
        <Text>{translate('optimizerPage.description')}</Text>

        <Card variation="outlined">
          <Heading level={3}>{translate('optimizerPage.inputSection.title')}</Heading>
          <Divider marginBlock="1rem" />

          <Flex direction="column" gap="1.5rem">
            <TextField
              label={translate('optimizerPage.inputSection.urlLabel')}
              placeholder={translate('optimizerPage.inputSection.urlPlaceholder')}
              value={domain}
              onChange={(e) => handleDomainChange(e)}
              marginBottom="1rem"
              descriptiveText={translate('optimizerPage.inputSection.urlHelperText')}
              isDisabled={isLoading} // Input field is disabled while loading
              isRequired={true}
            />

            <RadioGroupField
              label={translate('optimizerPage.optimizationLevels.label')}
              name="optimizationLevel"
              value={optimizationLevel}
              onChange={handleLevelChange}
              isDisabled={isLoading} // Radio group is disabled while loading
            >
              <Radio value="level1">
                <Flex direction="column">
                  <Text fontWeight="bold">
                    {translate('optimizerPage.optimizationLevels.level1.title')}
                  </Text>
                  <Text fontSize="small">
                    {translate('optimizerPage.optimizationLevels.level1.description')}
                  </Text>
                </Flex>
              </Radio>
              <Radio value="level2">
                <Flex direction="row" alignItems="center" gap="0.5rem">
                  <Flex direction="column">
                    <Text fontWeight="bold">
                      {translate('optimizerPage.optimizationLevels.level2.title')}
                    </Text>
                    <Text fontSize="small">
                      {translate('optimizerPage.optimizationLevels.level2.description')}
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
                  {translate('optimizerPage.inputSection.optimizeButton')}
                </Button>
              ) : (
                <Button variation="warning" onClick={handleCancelOptimize}>
                  {translate('optimizerPage.inputSection.cancelButton')}
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {optimizedContent && (
          <Card variation="outlined">
            <Heading level={3}>{translate('optimizerPage.resultSection.title')}</Heading>
            <Divider marginBlock="1rem" />

            <Flex direction="column" gap="1rem">
              {/* 基本統計情報 */}
              {stats && (
                <Card variation="outlined">
                  <Heading level={5}>{translate('optimizerPage.resultSection.statsLabel')}</Heading>
                  <Flex gap="1rem" wrap="wrap">
                    <Badge variation="info">
                      {translate('optimizerPage.resultSection.recordsBefore', [
                        stats.beforeCount.toString(),
                      ])}
                    </Badge>
                    <Badge variation="success">
                      {translate('optimizerPage.resultSection.recordsAfter', [
                        stats.afterCount.toString(),
                      ])}
                    </Badge>
                    <Badge variation="warning">
                      {translate('optimizerPage.resultSection.duplicatesRemoved', [
                        stats.duplicatesRemoved.toString(),
                      ])}
                    </Badge>
                    <Badge variation="info">
                      {translate('optimizerPage.resultSection.variablesOrganized', [
                        stats.variablesOrganized.toString(),
                      ])}
                    </Badge>
                  </Flex>
                </Card>
              )}

              {/* レベル2の場合のカテゴリ統計情報 */}
              {categories && (
                <Card variation="outlined">
                  <Heading level={5}>
                    {translate('optimizerPage.resultSection.categoriesLabel')}
                  </Heading>
                  <Flex gap="1rem" wrap="wrap">
                    <Badge variation="success">
                      {translate('optimizerPage.resultSection.categoryOther', [
                        categories.other.toString(),
                      ])}
                    </Badge>
                    <Badge variation="info">
                      {translate('optimizerPage.resultSection.categoryConfidential', [
                        categories.confidential.toString(),
                      ])}
                    </Badge>
                    <Badge variation="warning">
                      {translate('optimizerPage.resultSection.categoryMissingSellerId', [
                        categories.missing_seller_id.toString(),
                      ])}
                    </Badge>
                    <Badge variation="warning">
                      {translate('optimizerPage.resultSection.categoryNoSellerJson', [
                        categories.no_seller_json.toString(),
                      ])}
                    </Badge>
                  </Flex>
                </Card>
              )}

              {/* 変換前/後の内容表示 */}
              <Flex direction={{ base: 'column', large: 'row' }} gap="1rem">
                <View flex="1">
                  <Heading level={5}>
                    {translate('optimizerPage.resultSection.beforeLabel')}
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
                  <Heading level={5}>{translate('optimizerPage.resultSection.afterLabel')}</Heading>
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
                  {translate('optimizerPage.inputSection.copyButton')}
                </Button>
                <Button variation="primary" onClick={handleDownload} isDisabled={isLoading}>
                  {translate('optimizerPage.inputSection.downloadButton')}
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
