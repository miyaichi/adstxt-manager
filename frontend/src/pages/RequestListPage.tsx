import {
  Alert,
  Badge,
  Breadcrumbs,
  Card,
  Divider,
  Flex,
  Heading,
  Loader,
  Text,
  TextField,
} from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { requestApi } from '../api';
import ErrorMessage from '../components/common/ErrorMessage';
import RequestItem from '../components/requests/RequestItem';
import { useTranslation } from '../hooks/useTranslation';
import { useApp } from '../context/AppContext';
import { Request } from '../models';

const RequestListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role') as 'publisher' | 'requester' | null;
  const token = searchParams.get('token');
  const translate = useTranslation();
  const { language } = useApp();

  // Email検証が必要かどうかを示す状態
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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
        setNeedsVerification(false);

        // トークンがある場合は検証付きでリクエスト
        const response = await requestApi.getRequestsByEmail(
          email,
          role || undefined,
          token || undefined
        );

        if (response.success) {
          setRequests(response.data);
          setVerificationSent(false);
        } else if (response.needsVerification) {
          // 検証が必要な場合（202ステータス）
          console.log('Email verification required, verification email sent');
          setNeedsVerification(true);
          setVerificationSent(true);
          setError(null);
        } else {
          setError(response.error?.message || translate('requestListPage.errors.fetchError'));
        }
      } catch (err: any) {
        console.error('Error fetching requests:', err);

        // APIエラーの場合は、エラーメッセージを表示
        if (err.response?.status === 401) {
          // トークンが無効または期限切れの場合
          setError(translate('requestListPage.errors.authRequired'));
        } else {
          setError(translate('requestListPage.errors.fetchError'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [email, role, token, language]);

  if (!email) {
    return (
      <ErrorMessage
        title={translate('requestListPage.errors.noEmail')}
        message={translate('requestListPage.errors.noEmailDescription')}
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
    return translate(`common.role.${roleType}`);
  };

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: translate('common.home'), href: '/' },
          { label: translate('requestListPage.breadcrumb'), isCurrent: true },
        ]}
      />

      <Card variation="outlined" padding="1.5rem">
        <Flex direction="column" gap="1.5rem">
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="1rem">
            <Heading level={2}>{translate('requestListPage.title')}</Heading>
            <Flex gap="0.5rem" alignItems="center">
              <Text>
                {translate('requestListPage.emailLabel')} {email}
              </Text>
              {role && <Badge variation="info">{getRoleName(role)}</Badge>}
            </Flex>
          </Flex>

          {loading ? (
            <Flex justifyContent="center" padding="2rem">
              <Loader size="large" />
            </Flex>
          ) : needsVerification ? (
            <Alert variation="info">
              <Heading level={3}>
                {translate('requestListPage.verification.title') || '認証が必要です'}
              </Heading>
              <Text>
                {translate('requestListPage.verification.description') ||
                  'アクセスするためにはメールアドレスの認証が必要です。'}
              </Text>
              {verificationSent && (
                <Text fontWeight="bold" marginTop="1rem">
                  {translate('requestListPage.verification.emailSent') ||
                    '認証メールを送信しました。メールを確認して、リンクをクリックしてください。'}
                </Text>
              )}
            </Alert>
          ) : error ? (
            <Alert variation="error">{error}</Alert>
          ) : (
            <Flex direction="column" gap="1.5rem">
              <TextField
                label={translate('requestListPage.searchLabel')}
                placeholder={translate('requestListPage.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {filteredRequests.length === 0 ? (
                <Alert variation="warning">
                  <Text>{translate('requestListPage.noRequests')}</Text>
                  {searchQuery && <Text>{translate('requestListPage.changeSearch')}</Text>}
                </Alert>
              ) : (
                <>
                  <Flex justifyContent="flex-end" gap="0.5rem">
                    <Text>
                      {translate('requestListPage.totalRequests', [filteredRequests.length.toString()])}
                    </Text>
                  </Flex>

                  {pendingRequests.length > 0 && (
                    <Flex direction="column" gap="1rem">
                      <Heading level={3}>
                        {translate('requestListPage.pendingTitle', [pendingRequests.length.toString()])}
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
                        {translate('requestListPage.updatedTitle', [updatedRequests.length.toString()])}
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
                        {translate('requestListPage.approvedTitle', [approvedRequests.length.toString()])}
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
                        {translate('requestListPage.rejectedTitle', [rejectedRequests.length.toString()])}
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
