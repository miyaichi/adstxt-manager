import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Heading,
  Loader,
  Text,
  useTheme,
  View
} from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import { adsTxtApi, messageApi, requestApi } from '../../api';
import { Message, RequestWithRecords } from '../../models';
import { createLogger } from '../../utils/logger';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';
import MessageForm from '../messages/MessageForm';
import MessageList from '../messages/MessageList';

interface RequestDetailProps {
  requestId: string;
  token: string;
}

// コンポーネント用のロガーを作成
const logger = createLogger('RequestDetail');

const RequestDetail: React.FC<RequestDetailProps> = ({ requestId, token }) => {
  logger.debug('Rendering with props:', { requestId, token });
  
  const [request, setRequest] = useState<RequestWithRecords | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adsTxtContent, setAdsTxtContent] = useState<string>('');
  const [showAdsTxtContent, setShowAdsTxtContent] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [messageTabSelected, setMessageTabSelected] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const { tokens } = useTheme();

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await requestApi.getRequest(requestId, token);
      
      if (response.success) {
        setRequest(response.data);
      } else {
        setError(response.error?.message || 'リクエストの取得中にエラーが発生しました');
      }
    } catch (err) {
      setError('リクエストの取得中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      logger.debug('fetchMessages starting for request:', requestId);
      setMessageLoading(true);
      
      const response = await messageApi.getMessagesByRequestId(requestId, token);
      if (response.success) {
        logger.debug('Messages fetched successfully:', response.data);
        setMessages(response.data);
      } else {
        logger.error('Error in response when fetching messages:', response.error);
      }
    } catch (err) {
      logger.error('Exception when fetching messages:', err);
    } finally {
      setMessageLoading(false);
    }
  };

  const generateAdsTxtContent = async () => {
    try {
      const content = await adsTxtApi.generateAdsTxtContent(requestId, token);
      setAdsTxtContent(content);
      setShowAdsTxtContent(true);
    } catch (err) {
      console.error('Ads.txtコンテンツの生成中にエラーが発生しました:', err);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!request) return;
    
    try {
      setLoading(true);
      
      const response = await requestApi.updateRequestStatus(requestId, newStatus, token);
      
      if (response.success) {
        // Update the local state with the new status
        setRequest(prev => prev ? {
          ...prev,
          request: {
            ...prev.request,
            status: newStatus
          }
        } : null);
      } else {
        setError(response.error?.message || 'ステータスの更新中にエラーが発生しました');
      }
    } catch (err) {
      setError('ステータスの更新中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordStatusChange = async (recordId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      setLoading(true);
      
      const response = await adsTxtApi.updateRecordStatus(recordId, status, token);
      
      if (response.success) {
        // Update the local state with the new record status
        setRequest(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            records: prev.records.map(record => 
              record.id === recordId 
                ? { ...record, status } 
                : record
            )
          };
        });
      } else {
        setError(response.error?.message || 'レコードステータスの更新中にエラーが発生しました');
      }
    } catch (err) {
      setError('レコードステータスの更新中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSent = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">承認済み</Badge>;
      case 'rejected':
        return <Badge variation="error">拒否</Badge>;
      case 'pending':
        return <Badge variation="warning">保留中</Badge>;
      case 'updated':
        return <Badge variation="info">更新済み</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // データの初期取得
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, token]);

  // メッセージタブが選択されたときにメッセージを取得
  useEffect(() => {
    logger.debug('messageTabSelected changed:', messageTabSelected);
    if (messageTabSelected) {
      logger.debug('Calling fetchMessages() due to messageTabSelected change');
      fetchMessages();
    }
  }, [messageTabSelected, requestId, token]);

  if (loading && !request) {
    return (
      <Flex justifyContent="center" padding="2rem">
        <Loader size="large" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert variation="error">
        {error}
      </Alert>
    );
  }

  if (!request) {
    return (
      <Alert variation="warning">
        リクエストが見つかりませんでした。IDとトークンを確認してください。
      </Alert>
    );
  }

  const approvedRecords = request.records.filter(record => record.status === 'approved');
  const pendingRecords = request.records.filter(record => record.status === 'pending');
  const rejectedRecords = request.records.filter(record => record.status === 'rejected');

  return (
    <Card padding="1.5rem" variation="outlined">
      <Flex direction="column" gap="1.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={2}>リクエスト詳細</Heading>
          {getStatusBadge(request.request.status)}
        </Flex>
        
        <Divider />
        
        <Flex direction="column" gap="1rem">
          <Heading level={3}>基本情報</Heading>
          
          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>パブリッシャー情報</Heading>
              <Text>
                <strong>メール:</strong> {request.request.publisher_email}
              </Text>
              {request.request.publisher_name && (
                <Text>
                  <strong>名前:</strong> {request.request.publisher_name}
                </Text>
              )}
              {request.request.publisher_domain && (
                <Text>
                  <strong>ドメイン:</strong> {request.request.publisher_domain}
                </Text>
              )}
            </Card>
            
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>リクエスト者情報</Heading>
              <Text>
                <strong>メール:</strong> {request.request.requester_email}
              </Text>
              <Text>
                <strong>名前:</strong> {request.request.requester_name}
              </Text>
            </Card>
          </Flex>
          
          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>リクエスト情報</Heading>
              <Text>
                <strong>リクエストID:</strong> {request.request.id}
              </Text>
              <Text>
                <strong>作成日:</strong> {new Date(request.request.created_at).toLocaleString()}
              </Text>
              <Text>
                <strong>更新日:</strong> {new Date(request.request.updated_at).toLocaleString()}
              </Text>
            </Card>
            
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>リクエスト統計</Heading>
              <Text>
                <strong>合計レコード数:</strong> {request.records.length}
              </Text>
              <Text>
                <strong>承認済み:</strong> {approvedRecords.length}
              </Text>
              <Text>
                <strong>保留中:</strong> {pendingRecords.length}
              </Text>
              <Text>
                <strong>拒否:</strong> {rejectedRecords.length}
              </Text>
            </Card>
          </Flex>
          
          {request.request.status === 'pending' && (
            <Flex gap="1rem" marginTop="1rem">
              <Button
                variation="primary"
                onClick={() => handleStatusChange('approved')}
                isLoading={loading}
                flex="1"
              >
                リクエストを承認
              </Button>
              <Button
                variation="destructive"
                onClick={() => handleStatusChange('rejected')}
                isLoading={loading}
                flex="1"
              >
                リクエストを拒否
              </Button>
            </Flex>
          )}
        </Flex>
        
        <Divider />
        
        <Flex direction="column" gap="1rem">
          <Flex className="custom-tabs">
            <Button 
              onClick={() => setActiveTab(0)}
              variation={activeTab === 0 ? "primary" : "link"}
              className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
            >
              Ads.txtレコード
            </Button>
            <Button 
              onClick={() => {
                setActiveTab(1);
                if (!messageTabSelected) {
                  logger.debug('Message tab selected via custom tabs');
                  setMessageTabSelected(true);
                }
              }}
              variation={activeTab === 1 ? "primary" : "link"}
              className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            >
              メッセージ
            </Button>
          </Flex>
          
          <Divider />
          
          <View padding="1rem">
            {activeTab === 0 ? (
              // Ads.txtレコードタブ
              <>
                <AdsTxtRecordList
                  records={request.records}
                  onStatusChange={handleRecordStatusChange}
                  isEditable={request.request.status === 'pending'}
                />
                
                {approvedRecords.length > 0 && (
                  <Button
                    onClick={generateAdsTxtContent}
                    marginTop="1rem"
                  >
                    Ads.txtコンテンツを生成
                  </Button>
                )}
                
                {showAdsTxtContent && (
                  <Card 
                    variation="outlined" 
                    padding="1rem" 
                    marginTop="1rem" 
                    backgroundColor={tokens.colors.background.secondary}
                  >
                    <Flex justifyContent="space-between" alignItems="center" marginBottom="0.5rem">
                      <Heading level={4}>生成されたAds.txtコンテンツ</Heading>
                      <Button
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(adsTxtContent);
                        }}
                      >
                        コピー
                      </Button>
                    </Flex>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {adsTxtContent}
                    </pre>
                  </Card>
                )}
              </>
            ) : (
              // メッセージタブ
              <>
                {logger.debug('Rendering message tab content', { 
                  messageTabSelected, 
                  messageLoading, 
                  messagesCount: messages.length 
                })}
                
                {messageTabSelected ? (
                  messageLoading ? (
                    <Flex direction="column" alignItems="center" padding="2rem">
                      <Text>メッセージを読み込み中...</Text>
                      <Loader size="large" />
                    </Flex>
                  ) : (
                    <Flex direction="column" gap="1rem">
                      <MessageList
                        messages={messages}
                        requestId={requestId}
                        token={token}
                      />
                      
                      <Divider marginBlock="1rem" />
                      
                      <MessageForm
                        requestId={requestId}
                        token={token}
                        onMessageSent={handleMessageSent}
                      />
                    </Flex>
                  )
                ) : (
                  <Flex direction="column" alignItems="center" padding="2rem">
                    <Text>タブを選択すると、メッセージが表示されます</Text>
                    <Button 
                      onClick={() => {
                        logger.debug('Manual message loading button clicked');
                        setMessageTabSelected(true);
                      }}
                      marginTop="1rem"
                    >
                      メッセージを読み込む
                    </Button>
                  </Flex>
                )}
              </>
            )}
          </View>
        </Flex>
      </Flex>
    </Card>
  );
};

export default RequestDetail;