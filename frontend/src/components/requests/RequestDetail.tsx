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
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isRequester, setIsRequester] = useState(false); // リクエスターかどうかの状態
  const [editMode, setEditMode] = useState(false); // 編集モードの状態
  const { tokens } = useTheme();
  const navigate = useNavigate();

  const fetchRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await requestApi.getRequest(requestId, token);

      if (response.success) {
        setRequest(response.data);

        // If the request has a publisher domain, we should fetch the latest ads.txt
        // This ensures cross-checks are accurate for duplicate detection
        if (response.data.request.publisher_domain) {
          try {
            console.log(
              `Pre-fetching ads.txt for publisher domain: ${response.data.request.publisher_domain}`
            );
            await adsTxtApi.getAdsTxtFromDomain(response.data.request.publisher_domain, true); // Force refresh
          } catch (fetchErr) {
            console.error(`Error pre-fetching ads.txt: ${fetchErr}`);
            // Non-blocking error, we can continue
          }
        }
      } else {
        setError(response.error?.message || t('requests.detail.error.fetchError', language));
      }
    } catch (err) {
      setError(t('requests.detail.error.fetchError', language));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [requestId, token, language]);

  const fetchMessages = useCallback(async () => {
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
  }, [requestId, token]);

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

  // Check if current user is the requester
  const checkIfRequester = useCallback(() => {
    if (request) {
      // 1. Check localStorage email first
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail && userEmail === request.request.requester_email) {
        setIsRequester(true);
        return;
      }
      
      // 2. Ask user if they are the requester if they haven't been asked before
      const askedBefore = sessionStorage.getItem(`askedIfRequester_${requestId}`);
      if (!askedBefore) {
        // Only ask once per session
        sessionStorage.setItem(`askedIfRequester_${requestId}`, 'true');
        
        const isRequesterConfirm = window.confirm(
          t('common.areYouRequester', language, { email: request.request.requester_email })
        );
        
        if (isRequesterConfirm) {
          // Save email to localStorage for future checks
          localStorage.setItem('userEmail', request.request.requester_email);
          setIsRequester(true);
          return;
        }
      }
      
      // 3. Token-based heuristic - if token is available, and status is pending/rejected,
      // it's likely that this is the requester viewing the request
      if (token && (request.request.status === 'pending' || request.request.status === 'rejected')) {
        setIsRequester(true);
        return;
      }
      
      setIsRequester(false);
    }
  }, [request, requestId, token]);
  
  // Handle edit button click
  const handleEditRequest = () => {
    navigate(`/request/${requestId}/edit?token=${token}`);
  };
  
  // リクエスター確認ボタンのハンドラー
  const handleIdentifyAsRequester = () => {
    if (request) {
      localStorage.setItem('userEmail', request.request.requester_email);
      setIsRequester(true);
      alert(t('common.identifiedAsRequester', language, { email: request.request.requester_email }));
    }
  };
  
  // Fetch request details when the component mounts
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, token, fetchRequestDetails]);
  
  // Check if requester when request data changes
  useEffect(() => {
    checkIfRequester();
  }, [request, checkIfRequester]);
  
  // デバッグ用：isRequesterの状態が変わったらログ出力
  useEffect(() => {
    console.log('DEBUG: isRequester =', isRequester);
    console.log('DEBUG: request status =', request?.request.status);
    if (request) {
      console.log('DEBUG: requester_email =', request.request.requester_email);
      console.log('DEBUG: localStorage email =', localStorage.getItem('userEmail'));
    }
  }, [isRequester, request]);

  // Fetch messages when the message tab is selected
  useEffect(() => {
    logger.debug('messageTabSelected changed:', messageTabSelected);
    if (messageTabSelected) {
      logger.debug('Calling fetchMessages() due to messageTabSelected change');
      fetchMessages();
    }
  }, [messageTabSelected, requestId, token, fetchMessages]);

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
          <Flex gap="1rem" alignItems="center">
            {!isRequester && (
              <Button
                variation="link"
                size="small"
                onClick={handleIdentifyAsRequester}
              >
                {t('common.iAmRequester', language)}
              </Button>
            )}
            {getStatusBadge(request.request.status)}
          </Flex>
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

          {request.request.status === 'pending' && !isRequester && (
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

          {/* リクエスター向けの操作ボタン - 編集可能な状態（保留中または拒否）の場合のみ表示 */}
          {isRequester && (request.request.status === 'pending' || request.request.status === 'rejected') && (
            <Flex gap="1rem" marginTop="1rem">
              <Button
                variation="primary"
                onClick={handleEditRequest}
                isLoading={loading}
              >
                {t('requests.detail.actions.edit', language)}
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
                  showValidation={true}
                />

                {approvedRecords.length > 0 && (
                  <Card variation="outlined" padding="1rem" marginTop="1rem">
                    <Heading level={4}>
                      {t('requests.detail.approvedContent', language)}
                    </Heading>
                    <Text marginBottom="1rem">
                      {t('requests.detail.approvedContentDescription', language)}
                    </Text>

                    <Flex gap="1rem" marginBottom="1rem">
                      <Button
                        onClick={generateAdsTxtContent}
                        variation="primary"
                        flex="1"
                        isDisabled={showAdsTxtContent}
                      >
                        {t('requests.detail.actions.showContent', language)}
                      </Button>

                      {showAdsTxtContent && (
                        <>
                          <Button
                            onClick={() => {
                              if (adsTxtContent) {
                                navigator.clipboard.writeText(adsTxtContent);
                                // Show success toast or feedback here if needed
                                alert(
                                  t('requests.detail.copySuccess', language) || t('common.copySuccess', language)
                                );
                              }
                            }}
                            variation="menu"
                            flex="1"
                          >
                            {t('requests.detail.actions.copyToClipboard', language)}
                          </Button>

                          <Button
                            onClick={() => {
                              // Create a download link
                              const blob = new Blob([adsTxtContent], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'ads.txt';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            variation="menu"
                            flex="1"
                          >
                            {t('requests.detail.actions.download', language)}
                          </Button>
                        </>
                      )}
                    </Flex>

                    {showAdsTxtContent && (
                      <Card
                        variation="outlined"
                        padding="1rem"
                        backgroundColor={tokens.colors.background.secondary}
                      >
                        <pre
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            overflow: 'auto',
                            maxHeight: '400px',
                            padding: '0.5rem',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        >
                          {adsTxtContent}
                        </pre>
                        <Text
                          fontSize="small"
                          marginTop="0.5rem"
                          color={tokens.colors.font.tertiary}
                        >
                          {t('requests.detail.contentHelp', language)}
                        </Text>
                      </Card>
                    )}
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
                    <Text>{t('common.selectTabToViewMessages', language)}</Text>
                    <Button
                      onClick={() => {
                        logger.debug('Manual message loading button clicked');
                        setMessageTabSelected(true);
                      }}
                      marginTop="1rem"
                    >
                      {t('common.loadMessages', language)}
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
