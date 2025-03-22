import React, { useState, useRef } from 'react';
import {
  Card,
  Button,
  Text,
  Flex,
  Loader,
  Alert,
  Heading
} from '@aws-amplify/ui-react';
import { adsTxtApi } from '../../api';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';
import AdsTxtRecordList from './AdsTxtRecordList';

interface AdsTxtFileUploadProps {
  onRecordsSelected: (records: AdsTxtRecord[]) => void;
}

const AdsTxtFileUpload: React.FC<AdsTxtFileUploadProps> = ({ onRecordsSelected }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedAdsTxtRecord[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await adsTxtApi.processAdsTxtFile(file);
      
      if (response.success) {
        setParsedRecords(response.data.records);
        setStats({
          total: response.data.totalRecords,
          valid: response.data.validRecords,
          invalid: response.data.invalidRecords,
        });

        // Convert valid parsed records to AdsTxtRecord format for the parent component
        const validRecords = response.data.records
          .filter(record => record.is_valid)
          .map(record => ({
            id: '', // Will be generated by the server
            request_id: '', // Will be assigned by the server
            domain: record.domain,
            account_id: record.account_id,
            account_type: record.account_type,
            certification_authority_id: record.certification_authority_id,
            relationship: record.relationship,
            status: 'pending' as const,
            created_at: '',
            updated_at: ''
          }));

        onRecordsSelected(validRecords);
      } else {
        setError(response.error?.message || 'ファイルの解析中にエラーが発生しました');
      }
    } catch (err) {
      setError('ファイルの解析中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setFileName('');
    setParsedRecords([]);
    setStats(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card variation="outlined" padding="1.5rem">
      <Heading level={3} marginBottom="1rem">Ads.txtファイルアップロード</Heading>
      
      <div
        style={{
          border: '2px dashed #ccc',
          borderRadius: '4px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1rem',
          backgroundColor: '#f8f8f8',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.csv"
          style={{ display: 'none' }}
        />
        <Text>
          ファイルをクリックまたはドラッグ＆ドロップしてください
        </Text>
        {fileName && (
          <Text fontWeight="bold" marginTop="0.5rem">
            選択ファイル: {fileName}
          </Text>
        )}
      </div>

      <Flex direction="row" gap="1rem" marginBottom="1rem">
        <Button
          variation="primary"
          isDisabled={!file || isLoading}
          onClick={handleUpload}
          flex="1"
        >
          {isLoading ? <Loader size="small" /> : 'アップロード'}
        </Button>
        <Button
          variation="destructive"
          isDisabled={!file || isLoading}
          onClick={handleClear}
          flex="1"
        >
          クリア
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
            レコード数: {stats.total} | 有効: {stats.valid} | 無効: {stats.invalid}
          </Text>
        </Flex>
      )}

      {parsedRecords.length > 0 && (
        <AdsTxtRecordList
          records={parsedRecords.map(record => ({
            ...record,
            id: `temp-${Math.random().toString(36).substr(2, 9)}`,
            status: record.is_valid ? 'pending' : 'rejected'
          }))}
          showValidation={true}
        />
      )}
    </Card>
  );
};

export default AdsTxtFileUpload;