import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Text,
  Flex,
  Loader,
  Alert,
  Heading,
  TextAreaField,
} from '@aws-amplify/ui-react';
import { adsTxtApi } from '../../api';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';
import AdsTxtRecordList from './AdsTxtRecordList';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface AdsTxtTextInputProps {
  onRecordsSelected: (records: AdsTxtRecord[]) => void;
  onHasInvalidRecords?: (hasInvalid: boolean) => void;
  initialRecords?: AdsTxtRecord[]; // 初期レコードのプロパティを追加
}

const AdsTxtTextInput: React.FC<AdsTxtTextInputProps> = ({
  onRecordsSelected,
  onHasInvalidRecords,
  initialRecords,
}) => {
  const { language } = useApp();
  const [adsTxtContent, setAdsTxtContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedAdsTxtRecord[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdsTxtContent(e.target.value);
    setError(null);
  };

  // Get publisher domain from the parent component
  const [publisherDomain, setPublisherDomain] = useState<string>('');

  // 初期レコードがあれば設定
  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      // 初期レコードを表示形式に変換
      setParsedRecords(
        initialRecords.map((record, index) => ({
          ...record,
          // ParsedAdsTxtRecord 用のプロパティを追加
          is_valid: true,
          line_number: index + 1, // 必須の line_number プロパティを追加
          raw_line: `${record.domain}, ${record.account_id}, ${record.account_type}, ${record.relationship}${record.certification_authority_id ? `, ${record.certification_authority_id}` : ''}`,
          has_warning: false,
        }))
      );

      // 親コンポーネントにレコードを渡す
      onRecordsSelected(initialRecords);

      // テキストエリアに変換
      const content = initialRecords
        .map(
          (record) =>
            `${record.domain}, ${record.account_id}, ${record.account_type}, ${record.relationship}${record.certification_authority_id ? `, ${record.certification_authority_id}` : ''}`
        )
        .join('\n');

      setAdsTxtContent(content);

      // 統計情報を設定
      setStats({
        total: initialRecords.length,
        valid: initialRecords.length,
        invalid: 0,
      });
    }
  }, [initialRecords, onRecordsSelected]);

  // Update publisher domain when passed from parent
  useEffect(() => {
    // Check if it's a RequestForm component context by looking for certain props
    const requestForm = document.querySelector(
      'form [name="publisher_domain"]'
    ) as HTMLInputElement;
    if (requestForm && requestForm.value) {
      setPublisherDomain(requestForm.value);
      console.log('Found publisher domain in form:', requestForm.value);
    }
  }, []);

  // Add a listener for domain input changes
  useEffect(() => {
    const handleDomainChange = () => {
      const domainInput = document.querySelector(
        'form [name="publisher_domain"]'
      ) as HTMLInputElement;
      if (domainInput && domainInput.value !== publisherDomain) {
        console.log('Publisher domain changed to:', domainInput.value);
        setPublisherDomain(domainInput.value);
      }
    };

    const domainInput = document.querySelector(
      'form [name="publisher_domain"]'
    ) as HTMLInputElement;
    if (domainInput) {
      domainInput.addEventListener('input', handleDomainChange);
      return () => domainInput.removeEventListener('input', handleDomainChange);
    }
  }, [publisherDomain]);

  const handleProcess = async () => {
    if (!adsTxtContent.trim()) {
      setError(t('common.contentRequired', language));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Read current publisher domain value from the parent form if available
      const publisherDomainInput = document.querySelector(
        'form [name="publisher_domain"]'
      ) as HTMLInputElement;
      const currentDomain = publisherDomainInput ? publisherDomainInput.value : publisherDomain;

      console.log('Processing ads.txt content with publisher domain:', currentDomain);
      const response = await adsTxtApi.processAdsTxtFile(adsTxtContent, currentDomain);

      if (response.success) {
        setParsedRecords(response.data.records);
        const hasInvalid = response.data.invalidRecords > 0;

        setStats({
          total: response.data.totalRecords,
          valid: response.data.validRecords,
          invalid: response.data.invalidRecords,
        });

        // Notify parent component if there are invalid records
        if (onHasInvalidRecords) {
          onHasInvalidRecords(hasInvalid);
        }

        // Convert valid parsed records to AdsTxtRecord format for the parent component
        const validRecords = response.data.records
          .filter((record) => record.is_valid)
          .map((record) => ({
            id: '', // Will be generated by the server
            request_id: '', // Will be assigned by the server
            domain: record.domain,
            account_id: record.account_id,
            account_type: record.account_type,
            certification_authority_id: record.certification_authority_id,
            relationship: record.relationship,
            status: 'pending' as const,
            created_at: '',
            updated_at: '',
          }));

        onRecordsSelected(validRecords);
      } else {
        setError(response.error?.message || t('common.parseError', language));
      }
    } catch (err) {
      setError(t('common.parseError', language));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setAdsTxtContent('');
    setParsedRecords([]);
    setStats(null);
    setError(null);

    // Notify parent that there are no invalid records anymore
    if (onHasInvalidRecords) {
      onHasInvalidRecords(false);
    }
  };

  const handlePasteExample = () => {
    // Add common Ads.txt format example
    const example = `# Ads.txt example format
example.com, pub-id123456789, DIRECT, f08c47fec0942fa0
google.com, pub-1234567891234567, RESELLER, f08c47fec0942fa0
openx.com, 123456789, RESELLER
appnexus.com, 1234, DIRECT
`;
    setAdsTxtContent(example);
    setError(null);
  };

  const handleOptimize = async () => {
    if (!adsTxtContent.trim()) {
      setError(t('common.contentRequired', language));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Read current publisher domain value from the parent form if available
      const publisherDomainInput = document.querySelector(
        'form [name="publisher_domain"]'
      ) as HTMLInputElement;
      const currentDomain = publisherDomainInput ? publisherDomainInput.value : publisherDomain;

      console.log('Optimizing ads.txt content with publisher domain:', currentDomain);
      const response = await adsTxtApi.optimizeAdsTxtContent(adsTxtContent, currentDomain);

      if (response.success) {
        // Update the text area with optimized content
        setAdsTxtContent(response.data.optimized_content);

        // Process the optimized content to update the record list
        await handleProcess();
      } else {
        setError(
          response.error?.message ||
            t('common.optimizeError', language) ||
            'Error optimizing content'
        );
      }
    } catch (err) {
      setError(t('common.optimizeError', language) || 'Error optimizing content');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variation="outlined" padding="1.5rem">
      <Heading level={3} marginBottom="1rem">
        {t('adsTxt.input.title', language) || 'Ads.txt Input'}
      </Heading>

      <TextAreaField
        label={t('adsTxt.input.label', language) || 'Ads.txt Content'}
        placeholder={t('adsTxt.input.placeholder', language) || 'Enter Ads.txt content here...'}
        rows={10}
        value={adsTxtContent}
        onChange={handleInputChange}
        marginBottom="1rem"
      />

      <Flex direction="row" gap="0.5rem" marginBottom="1rem">
        <Button
          variation="primary"
          isDisabled={!adsTxtContent.trim() || isLoading}
          onClick={handleProcess}
          flex="1"
        >
          {isLoading ? <Loader size="small" /> : t('common.process', language) || 'Process'}
        </Button>
        <Button
          variation="warning"
          isDisabled={!adsTxtContent.trim() || isLoading}
          onClick={handleOptimize}
          flex="1"
        >
          {isLoading ? <Loader size="small" /> : t('adsTxt.input.optimize', language) || 'Optimize'}
        </Button>
        <Button
          variation="destructive"
          isDisabled={!adsTxtContent.trim() || isLoading}
          onClick={handleClear}
          flex="1"
        >
          {t('common.clear', language) || 'Clear'}
        </Button>
        <Button variation="link" onClick={handlePasteExample} isDisabled={isLoading}>
          {t('adsTxt.input.example', language) || 'Example'}
        </Button>
      </Flex>

      {error && (
        <Alert variation="error" marginBottom="1rem">
          {error}
        </Alert>
      )}

      {stats && (
        <Flex direction="column" marginBottom="1rem">
          <Text>
            {t('adsTxt.textInput.stats', language, {
              total: stats.total,
              valid: stats.valid,
              invalid: stats.invalid,
            }) || `Total: ${stats.total}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`}
          </Text>
        </Flex>
      )}

      {parsedRecords.length > 0 && (
        <>
          {stats && stats.invalid > 0 && (
            <Alert variation="warning" marginBottom="1rem">
              {t('adsTxt.textInput.invalidRecordsWarning', language, { invalid: stats.invalid })}
            </Alert>
          )}
          <AdsTxtRecordList
            records={parsedRecords.map((record) => ({
              ...record,
              id: `temp-${Math.random().toString(36).substr(2, 9)}`,
              status: record.is_valid ? 'pending' : 'rejected',
            }))}
            showValidation={true}
          />
        </>
      )}
    </Card>
  );
};

export default AdsTxtTextInput;
