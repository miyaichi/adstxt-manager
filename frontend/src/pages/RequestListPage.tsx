import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Flex,
  Heading,
  Card,
  Button,
  Text,
  Alert,
  Loader,
  Breadcrumbs,
  Badge,
  Divider,
  TextField,
} from '@aws-amplify/ui-react';
import apiClient from '../api';
import { Request } from '../models';
import RequestItem from '../components/requests/RequestItem';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const RequestListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role') as 'publisher' | 'requester' | null;
  const { language } = useApp();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!email) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.request.getRequestsByEmail(email, role || undefined);

        if (response.success) {
          setRequests(response.data);
        } else {
          setError(response.error?.message || t('requestListPage.errors.fetchError', language));
        }
      } catch (err) {
        setError(t('requestListPage.errors.fetchError', language));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [email, role, language]);

  if (!email) {
    return (
      <ErrorMessage
        title={t('requestListPage.errors.noEmail', language)}
        message={t('requestListPage.errors.noEmailDescription', language)}
      />
    );
  }

  // Filter requests based on search query
  const filteredRequests = requests.filter((request) => {
    const query = searchQuery.toLowerCase();
    return (
      request.id.toLowerCase().includes(query) ||
      request.publisher_email.toLowerCase().includes(query) ||
      request.requester_email.toLowerCase().includes(query) ||
      request.requester_name.toLowerCase().includes(query) ||
      (request.publisher_name && request.publisher_name.toLowerCase().includes(query)) ||
      (request.publisher_domain && request.publisher_domain.toLowerCase().includes(query)) ||
      request.status.toLowerCase().includes(query)
    );
  });

  // Group requests by status
  const pendingRequests = filteredRequests.filter((req) => req.status === 'pending');
  const approvedRequests = filteredRequests.filter((req) => req.status === 'approved');
  const rejectedRequests = filteredRequests.filter((req) => req.status === 'rejected');
  const updatedRequests = filteredRequests.filter((req) => req.status === 'updated');

  // Get role name based on current language
  const getRoleName = (roleType: 'publisher' | 'requester') => {
    return t(`common.role.${roleType}`, language);
  };

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: t('common.home', language), href: '/' },
          { label: t('requestListPage.breadcrumb', language), isCurrent: true },
        ]}
      />

      <Card variation="outlined" padding="1.5rem">
        <Flex direction="column" gap="1.5rem">
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="1rem">
            <Heading level={2}>{t('requestListPage.title', language)}</Heading>
            <Flex gap="0.5rem" alignItems="center">
              <Text>
                {t('requestListPage.emailLabel', language)} {email}
              </Text>
              {role && <Badge variation="info">{getRoleName(role)}</Badge>}
            </Flex>
          </Flex>

          {loading ? (
            <Flex justifyContent="center" padding="2rem">
              <Loader size="large" />
            </Flex>
          ) : error ? (
            <Alert variation="error">{error}</Alert>
          ) : (
            <Flex direction="column" gap="1.5rem">
              <TextField
                label={t('requestListPage.searchLabel', language)}
                placeholder={t('requestListPage.searchPlaceholder', language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {filteredRequests.length === 0 ? (
                <Alert variation="warning">
                  <Text>{t('requestListPage.noRequests', language)}</Text>
                  {searchQuery && <Text>{t('requestListPage.changeSearch', language)}</Text>}
                </Alert>
              ) : (
                <>
                  <Flex justifyContent="flex-end" gap="0.5rem">
                    <Text>
                      {t('requestListPage.totalRequests', language, {
                        count: filteredRequests.length,
                      })}
                    </Text>
                  </Flex>

                  {pendingRequests.length > 0 && (
                    <Flex direction="column" gap="1rem">
                      <Heading level={3}>
                        {t('requestListPage.pendingTitle', language, {
                          count: pendingRequests.length,
                        })}
                      </Heading>
                      <Divider />
                      {pendingRequests.map((request) => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}

                  {updatedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        {t('requestListPage.updatedTitle', language, {
                          count: updatedRequests.length,
                        })}
                      </Heading>
                      <Divider />
                      {updatedRequests.map((request) => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}

                  {approvedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        {t('requestListPage.approvedTitle', language, {
                          count: approvedRequests.length,
                        })}
                      </Heading>
                      <Divider />
                      {approvedRequests.map((request) => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}

                  {rejectedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        {t('requestListPage.rejectedTitle', language, {
                          count: rejectedRequests.length,
                        })}
                      </Heading>
                      <Divider />
                      {rejectedRequests.map((request) => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}
                </>
              )}
            </Flex>
          )}
        </Flex>
      </Card>
    </Flex>
  );
};

export default RequestListPage;
