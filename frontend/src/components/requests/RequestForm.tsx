import React, { useState } from 'react';
import {
  Card,
  Flex,
  TextField,
  Button,
  Text,
  Alert,
  Tabs,
  TabItem,
  Divider,
  Heading,
  View,
  useTheme
} from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';
import { AdsTxtRecord, CreateRequestData } from '../../models';
import { requestApi } from '../../api';
import AdsTxtFileUpload from '../adsTxt/AdsTxtFileUpload';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';

const RequestForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateRequestData>({
    publisher_email: '',
    requester_email: '',
    requester_name: '',
    publisher_name: '',
    publisher_domain: '',
  });
  
  const [adsTxtFile, setAdsTxtFile] = useState<File | null>(null);
  const [records, setRecords] = useState<AdsTxtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    requestId: string;
    token: string;
  } | null>(null);
  
  const navigate = useNavigate();
  const { tokens } = useTheme();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRecordsSelected = (selectedRecords: AdsTxtRecord[]) => {
    setRecords(selectedRecords);
  };

  const validateForm = () => {
    if (!formData.publisher_email || !formData.requester_email || !formData.requester_name) {
      setError('パブリッシャーのメールアドレス、リクエスターのメールアドレス、リクエスター名は必須です');
      return false;
    }

    if (records.length === 0) {
      setError('少なくとも1つのAds.txtレコードを選択してください');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const requestData: CreateRequestData = {
        ...formData,
        records: records
      };

      const response = await requestApi.createRequest(requestData);
      
      if (response.success) {
        setSuccess({
          requestId: response.data.request_id,
          token: response.data.token
        });
        // Clear form
        setFormData({
          publisher_email: '',
          requester_email: '',
          requester_name: '',
          publisher_name: '',
          publisher_domain: '',
        });
        setRecords([]);
      } else {
        setError(response.error?.message || 'リクエスト処理中にエラーが発生しました');
      }
    } catch (err) {
      setError('リクエスト処理中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewRequest = () => {
    if (success) {
      navigate(`/request/${success.requestId}?token=${success.token}`);
    }
  };

  if (success) {
    return (
      <Card padding="2rem" variation="elevated">
        <Flex direction="column" gap="1rem" alignItems="center">
          <Heading level={2}>リクエスト送信完了</Heading>
          <Alert variation="success">
            リクエストがパブリッシャーに送信されました。リクエストIDとトークンを保存してください。
          </Alert>
          
          <Flex direction="column" padding="1rem" width="100%" backgroundColor={tokens.colors.background.secondary}>
            <Text fontWeight="bold">リクエストID:</Text>
            <Text fontFamily="monospace">{success.requestId}</Text>
            <Divider marginBlock="1rem" />
            <Text fontWeight="bold">アクセストークン:</Text>
            <Text fontFamily="monospace">{success.token}</Text>
          </Flex>
          
          <Text>
            リクエストの確認や更新のためにこの情報が必要になります。
          </Text>
          
          <Button onClick={handleViewRequest} variation="primary">
            リクエストを表示
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card padding="1.5rem" variation="outlined">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1.5rem">
          <Heading level={2}>新規リクエスト作成</Heading>
          
          <Text>
            このフォームはAds.txtファイル更新のリクエストを作成します。
            パブリッシャーにリクエストが送信され、確認されます。
          </Text>
          
          {error && (
            <Alert variation="error">
              {error}
            </Alert>
          )}
          
          <Divider />
          
          <Heading level={3}>基本情報</Heading>
          
          <Flex direction="column" gap="1rem">
            <TextField
              name="publisher_email"
              label="パブリッシャーのメールアドレス *"
              placeholder="publisher@example.com"
              value={formData.publisher_email}
              onChange={handleInputChange}
              isRequired
            />
            
            <TextField
              name="publisher_name"
              label="パブリッシャー名"
              placeholder="Example Media Inc."
              value={formData.publisher_name}
              onChange={handleInputChange}
            />
            
            <TextField
              name="publisher_domain"
              label="パブリッシャードメイン"
              placeholder="example.com"
              value={formData.publisher_domain}
              onChange={handleInputChange}
            />
            
            <TextField
              name="requester_email"
              label="リクエスターのメールアドレス *"
              placeholder="requester@adnetwork.com"
              value={formData.requester_email}
              onChange={handleInputChange}
              isRequired
            />
            
            <TextField
              name="requester_name"
              label="リクエスター名 *"
              placeholder="Ad Network Inc."
              value={formData.requester_name}
              onChange={handleInputChange}
              isRequired
            />
          </Flex>
          
          <Divider />
          
          <Heading level={3}>Ads.txtレコード</Heading>
          
          <Tabs>
            <TabItem title="ファイルアップロード">
              <AdsTxtFileUpload onRecordsSelected={handleRecordsSelected} />
            </TabItem>
            
            <TabItem title="選択したレコード">
              <View padding="1rem">
                <AdsTxtRecordList
                  records={records}
                  title="選択レコード"
                />
                
                {records.length === 0 && (
                  <Text>
                    レコードが選択されていません。ファイルアップロードしてレコードを選択してください。
                  </Text>
                )}
              </View>
            </TabItem>
          </Tabs>
          
          <Divider />
          
          <Button
            type="submit"
            variation="primary"
            isLoading={isLoading}
            isDisabled={records.length === 0}
          >
            リクエスト送信
          </Button>
        </Flex>
      </form>
    </Card>
  );
};

export default RequestForm;