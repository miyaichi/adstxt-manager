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
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adsTxtApi, messageApi, requestApi } from '../../api';
import { useTranslation } from '../../hooks/useTranslation';
import { useApp } from '../../context/AppContext';
import { Message, RequestWithRecords } from '../../models';
import { createLogger } from '../../utils/logger';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';
import MessageForm from '../messages/MessageForm';
import MessageList from '../messages/MessageList';

interface RequestDetailProps {
  requestId: string;
  token: string;
  initialRole?: 'publisher' | 'requester';
}

// Create a logger for the component
const logger = createLogger('RequestDetail');

const RequestDetail: React.FC<RequestDetailProps> = ({ requestId, token, initialRole }) => {
  logger.debug('Rendering with props:', { requestId, token, initialRole });
  const translate = useTranslation();
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
  const [userRole, setUserRole] = useState<'publisher' | 'requester' | null>(initialRole || null);
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
        setError(response.error?.message || translate('requests.detail.error.fetchError'));
      }
    } catch (err) {
      setError(translate('requests.detail.error.fetchError'));
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
      console.error(translate('requests.detail.error.generateError'), err);
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
        setError(response.error?.message || translate('requests.detail.error.updateError'));
      }
    } catch (err) {
      setError(translate('requests.detail.error.updateError'));
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
        setError(response.error?.message || translate('requests.detail.error.updateError'));
      }
    } catch (err) {
      setError(translate('requests.detail.error.updateError'));
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
        return <Badge variation="success">{translate('common.status.approved')}</Badge>;
      case 'rejected':
        return <Badge variation="error">{translate('common.status.rejected')}</Badge>;
      case 'pending':
        return <Badge variation="warning">{translate('common.status.pending')}</Badge>;
      case 'updated':
        return <Badge variation="info">{translate('common.status.updated')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Determine the user's role based on API response or URL parameter
  const determineUserRole = useCallback(() => {
    // If we already have a role from the URL parameter, keep it
    if (userRole) {
      return;
    }

    // If API returned a role, use it
    if (request && request.role) {
      setUserRole(request.role);
      return;
    }

    if (request) {
      // Check sessionStorage email as a fallback
      const userEmail = sessionStorage.getItem('userEmail');
      if (userEmail) {
        if (userEmail === request.request.requester_email) {
          setUserRole('requester');
          return;
        } else if (userEmail === request.request.publisher_email) {
          setUserRole('publisher');
          return;
        }
      }

      // Default to publisher if we can't determine
      // This is a safe default since most actions require explicit permission
      setUserRole('publisher');
    }
  }, [request, userRole]);

  // Handle edit button click
  const handleEditRequest = () => {
    const roleParam = userRole ? `&role=${userRole}` : '';
    navigate(`/request/${requestId}/edit?token=${token}${roleParam}`);
  };

  // Fetch request details when the component mounts
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, token, fetchRequestDetails]);

  // Determine user role when request data changes
  useEffect(() => {
    determineUserRole();
  }, [request, determineUserRole]);

  // デバッグ用：userRoleの状態が変わったらログ出力
  useEffect(() => {
    console.log('DEBUG: userRole =', userRole);
    console.log('DEBUG: API role =', request?.role);
    console.log('DEBUG: request status =', request?.request.status);
    if (request) {
      console.log('DEBUG: requester_email =', request.request.requester_email);
      console.log('DEBUG: publisher_email =', request.request.publisher_email);
      console.log('DEBUG: sessionStorage email =', sessionStorage.getItem('userEmail'));
    }
  }, [userRole, request]);

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
    return <Alert variation="warning">{translate('requests.detail.error.fetchError')}</Alert>;
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
          <Heading level={2}>{translate('requests.detail.title')}</Heading>
          <Flex gap="1rem" alignItems="center">
            {userRole && (
              <Badge variation="info">
                {userRole === 'publisher'
                  ? translate('common.roles.publisher')
                  : translate('common.roles.requester')}
              </Badge>
            )}
            {getStatusBadge(request.request.status)}
          </Flex>
        </Flex>

        <Divider />

        <Flex direction="column" gap="1rem">
          <Heading level={3}>{translate('requests.form.basicInfo')}</Heading>

          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{translate('requests.detail.publisher.title')}</Heading>
              <Text>
                <strong>{translate('requests.detail.publisher.email')}</strong>{' '}
                {request.request.publisher_email}
              </Text>
              {request.request.publisher_name && (
                <Text>
                  <strong>{translate('requests.detail.publisher.name')}</strong>{' '}
                  {request.request.publisher_name}
                </Text>
              )}
              {request.request.publisher_domain && (
                <Text>
                  <strong>{translate('requests.detail.publisher.domain')}</strong>{' '}
                  {request.request.publisher_domain}
                </Text>
              )}
            </Card>

            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{translate('requests.detail.requester.title')}</Heading>
              <Text>
                <strong>{translate('requests.detail.requester.email')}</strong>{' '}
                {request.request.requester_email}
              </Text>
              <Text>
                <strong>{translate('requests.detail.requester.name')}</strong>{' '}
                {request.request.requester_name}
              </Text>
            </Card>
          </Flex>

          <Flex gap="1rem" wrap="wrap">
            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{translate('requests.detail.title')}</Heading>
              <Text>
                <strong>ID:</strong> {request.request.id}
              </Text>
              <Text>
                <strong>{translate('requests.detail.created')}</strong> {createdDate}
              </Text>
              <Text>
                <strong>{translate('requests.detail.updated')}</strong> {updatedDate}
              </Text>
            </Card>

            <Card variation="outlined" padding="1rem" flex="1" minWidth="250px">
              <Heading level={5}>{translate('requests.detail.records.title')}</Heading>
              <Text>
                <strong>
                  {translate('requests.item.recordCount', [request.records.length.toString()])}
                </strong>
              </Text>
              <Text>
                <strong>{translate('common.status.approved')}:</strong> {approvedRecords.length}
              </Text>
              <Text>
                <strong>{translate('common.status.pending')}:</strong> {pendingRecords.length}
              </Text>
              <Text>
                <strong>{translate('common.status.rejected')}:</strong> {rejectedRecords.length}
              </Text>
            </Card>
          </Flex>

          {/* Publisher-only actions */}
          {request.request.status === 'pending' && userRole === 'publisher' && (
            <Flex gap="1rem" marginTop="1rem">
              <Button
                variation="primary"
                onClick={() => {
                  if (window.confirm(translate('requests.detail.actions.approveConfirm'))) {
                    handleStatusChange('approved');
                  }
                }}
                isLoading={loading}
                flex="1"
              >
                {translate('requests.detail.actions.approve')}
              </Button>
              <Button
                variation="destructive"
                onClick={() => {
                  if (window.confirm(translate('requests.detail.actions.rejectConfirm'))) {
                    handleStatusChange('rejected');
                  }
                }}
                isLoading={loading}
                flex="1"
              >
                {translate('requests.detail.actions.reject')}
              </Button>
            </Flex>
          )}

          {/* Requester-only actions */}
          {userRole === 'requester' &&
            (request.request.status === 'pending' || request.request.status === 'rejected') && (
              <Flex gap="1rem" marginTop="1rem">
                <Button variation="primary" onClick={handleEditRequest} isLoading={loading}>
                  {translate('requests.detail.actions.edit')}
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
              {translate('requests.detail.records.title')}
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
              {translate('messages.list.title')}
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
                    <Heading level={4}>{translate('requests.detail.approvedContent')}</Heading>
                    <Text marginBottom="1rem">
                      {translate('requests.detail.approvedContentDescription')}
                    </Text>

                    <Flex gap="1rem" marginBottom="1rem">
                      <Button
                        onClick={generateAdsTxtContent}
                        variation="primary"
                        flex="1"
                        isDisabled={showAdsTxtContent}
                      >
                        {translate('requests.detail.actions.showContent')}
                      </Button>

                      {showAdsTxtContent && (
                        <>
                          <Button
                            onClick={() => {
                              if (adsTxtContent) {
                                navigator.clipboard.writeText(adsTxtContent);
                                // Show success toast or feedback here if needed
                                alert(
                                  translate('requests.detail.copySuccess') ||
                                    translate('common.copySuccess')
                                );
                              }
                            }}
                            variation="menu"
                            flex="1"
                          >
                            {translate('requests.detail.actions.copyToClipboard')}
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
                            {translate('requests.detail.actions.download')}
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
                          {translate('requests.detail.contentHelp')}
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
                      <Text>{translate('requests.detail.loading')}</Text>
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
                        request={request}
                      />
                    </Flex>
                  )
                ) : (
                  <Flex direction="column" alignItems="center" padding="2rem">
                    <Text>{translate('common.selectTabToViewMessages')}</Text>
                    <Button
                      onClick={() => {
                        logger.debug('Manual message loading button clicked');
                        setMessageTabSelected(true);
                      }}
                      marginTop="1rem"
                    >
                      {translate('common.loadMessages')}
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
