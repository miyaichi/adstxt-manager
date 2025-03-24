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
  View,
} from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import { adsTxtApi, messageApi, requestApi } from '../../api';
import { Message, RequestWithRecords } from '../../models';
import { createLogger } from '../../utils/logger';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';
import MessageForm from '../messages/MessageForm';
import MessageList from '../messages/MessageList';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface RequestDetailProps {
  requestId: string;
  token: string;
}

// Create a logger for the component
const logger = createLogger('RequestDetail');

const RequestDetail: React.FC<RequestDetailProps> = ({ requestId, token }) => {
  logger.debug('Rendering with props:', { requestId, token });
  const { language } = useApp();

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
        setError(response.error?.message || t('requests.detail.error.fetchError', language));
      }
    } catch (err) {
      setError(t('requests.detail.error.fetchError', language));
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
      console.error(t('requests.detail.error.generateError', language), err);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!request) return;

    try {
      setLoading(true);

      const response = await requestApi.updateRequestStatus(requestId, newStatus, token);

      if (response.success) {
        // Update the local state with the new status
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                request: {
                  ...prev.request,
                  status: newStatus,
                },
              }
            : null
        );
      } else {
        setError(response.error?.message || t('requests.detail.error.updateError', language));
      }
    } catch (err) {
      setError(t('requests.detail.error.updateError', language));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordStatusChange = async (
    recordId: string,
    status: 'pending' | 'approved' | 'rejected'
  ) => {
    try {
      setLoading(true);

      const response = await adsTxtApi.updateRecordStatus(recordId, status, token);

      if (response.success) {
        // Update the local state with the new record status
        setRequest((prev) => {
          if (!prev) return null;

          return {
            ...prev,
            records: prev.records.map((record) =>
              record.id === recordId ? { ...record, status } : record
            ),
          };
        });
      } else {
        setError(response.error?.message || t('requests.detail.error.updateError', language));
      }
    } catch (err) {
      setError(t('requests.detail.error.updateError', language));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageSent = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">{t('common.status.approved', language)}</Badge>;
      case 'rejected':
        return <Badge variation="error">{t('common.status.rejected', language)}</Badge>;
      case 'pending':
        return <Badge variation="warning">{t('common.status.pending', language)}</Badge>;
      case 'updated':
        return <Badge variation="info">{t('common.status.updated', language)}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Fetch request details when the component mounts
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, token]);

  // Fetch messages when the message tab is selected
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
    return <Alert variation="error">{error}</Alert>;
  }

  if (!request) {
    return <Alert variation="warning">{t('requests.detail.error.fetchError', language)}</Alert>;
  }

  const approvedRecords = request.records.filter((record) => record.status === 'approved');
  const pendingRecords = request.records.filter((record) => record.status === 'pending');
  const rejectedRecords = request.records.filter((record) => record.status === 'rejected');

  const createdDate = new Date(request.request.created_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );
  const updatedDate = new Date(request.request.updated_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );

  return (
    <Card padding="1.5rem" variation="outlined">
      <Flex direction="column" gap="1.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={2}>{t('requests.detail.title', language)}</Heading>
          {getStatusBadge(request.request.status)}
        </Flex>

        <Divider />

        <Flex direction="column" gap="1rem">
          <Heading level={3}>{t('requests.form.basicInfo', language)}</Heading>

          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{t('requests.detail.publisher.title', language)}</Heading>
              <Text>
                <strong>{t('requests.detail.publisher.email', language)}</strong>{' '}
                {request.request.publisher_email}
              </Text>
              {request.request.publisher_name && (
                <Text>
                  <strong>{t('requests.detail.publisher.name', language)}</strong>{' '}
                  {request.request.publisher_name}
                </Text>
              )}
              {request.request.publisher_domain && (
                <Text>
                  <strong>{t('requests.detail.publisher.domain', language)}</strong>{' '}
                  {request.request.publisher_domain}
                </Text>
              )}
            </Card>

            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{t('requests.detail.requester.title', language)}</Heading>
              <Text>
                <strong>{t('requests.detail.requester.email', language)}</strong>{' '}
                {request.request.requester_email}
              </Text>
              <Text>
                <strong>{t('requests.detail.requester.name', language)}</strong>{' '}
                {request.request.requester_name}
              </Text>
            </Card>
          </Flex>

          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{t('requests.detail.title', language)}</Heading>
              <Text>
                <strong>ID:</strong> {request.request.id}
              </Text>
              <Text>
                <strong>{t('requests.detail.created', language)}</strong> {createdDate}
              </Text>
              <Text>
                <strong>{t('requests.detail.updated', language)}</strong> {updatedDate}
              </Text>
            </Card>

            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{t('requests.detail.records.title', language)}</Heading>
              <Text>
                <strong>
                  {t('requests.item.recordCount', language, { count: request.records.length })}
                </strong>
              </Text>
              <Text>
                <strong>{t('common.status.approved', language)}:</strong> {approvedRecords.length}
              </Text>
              <Text>
                <strong>{t('common.status.pending', language)}:</strong> {pendingRecords.length}
              </Text>
              <Text>
                <strong>{t('common.status.rejected', language)}:</strong> {rejectedRecords.length}
              </Text>
            </Card>
          </Flex>

          {request.request.status === 'pending' && (
            <Flex gap="1rem" marginTop="1rem">
              <Button
                variation="primary"
                onClick={() => {
                  if (window.confirm(t('requests.detail.actions.approveConfirm', language))) {
                    handleStatusChange('approved');
                  }
                }}
                isLoading={loading}
                flex="1"
              >
                {t('requests.detail.actions.approve', language)}
              </Button>
              <Button
                variation="destructive"
                onClick={() => {
                  if (window.confirm(t('requests.detail.actions.rejectConfirm', language))) {
                    handleStatusChange('rejected');
                  }
                }}
                isLoading={loading}
                flex="1"
              >
                {t('requests.detail.actions.reject', language)}
              </Button>
            </Flex>
          )}
        </Flex>

        <Divider />

        <Flex direction="column" gap="1rem">
          <Flex className="custom-tabs">
            <Button
              onClick={() => setActiveTab(0)}
              variation={activeTab === 0 ? 'primary' : 'link'}
              className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
            >
              {t('requests.detail.records.title', language)}
            </Button>
            <Button
              onClick={() => {
                setActiveTab(1);
                if (!messageTabSelected) {
                  logger.debug('Message tab selected via custom tabs');
                  setMessageTabSelected(true);
                }
              }}
              variation={activeTab === 1 ? 'primary' : 'link'}
              className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            >
              {t('messages.list.title', language)}
            </Button>
          </Flex>

          <Divider />

          <View padding="1rem">
            {activeTab === 0 ? (
              // Ads.txt Record tab
              <>
                <AdsTxtRecordList
                  records={request.records}
                  onStatusChange={handleRecordStatusChange}
                  isEditable={request.request.status === 'pending'}
                />

                {approvedRecords.length > 0 && (
                  <Button onClick={generateAdsTxtContent} marginTop="1rem">
                    {t('requests.detail.actions.download', language)}
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
                      <Heading level={4}>Ads.txt Content</Heading>
                      <Button
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(adsTxtContent);
                        }}
                      >
                        Copy
                      </Button>
                    </Flex>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        maxHeight: '300px',
                      }}
                    >
                      {adsTxtContent}
                    </pre>
                  </Card>
                )}
              </>
            ) : (
              // Message tab
              <>
                {logger.debug('Rendering message tab content', {
                  messageTabSelected,
                  messageLoading,
                  messagesCount: messages.length,
                })}

                {messageTabSelected ? (
                  messageLoading ? (
                    <Flex direction="column" alignItems="center" padding="2rem">
                      <Text>{t('requests.detail.loading', language)}</Text>
                      <Loader size="large" />
                    </Flex>
                  ) : (
                    <Flex direction="column" gap="1rem">
                      <MessageList messages={messages} requestId={requestId} token={token} />

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
                    <Text>Select tab to view messages</Text>
                    <Button
                      onClick={() => {
                        logger.debug('Manual message loading button clicked');
                        setMessageTabSelected(true);
                      }}
                      marginTop="1rem"
                    >
                      Load Messages
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
