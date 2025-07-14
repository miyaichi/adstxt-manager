import { Breadcrumbs, Card, Flex, Heading, Loader, Text } from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/common/ErrorMessage';
import AdsTxtTextInput from '../components/adsTxt/AdsTxtTextInput';
import { useTranslation } from '../hooks/useTranslation';
import { useApp } from '../context/AppContext';
import { requestApi } from '../api';
import { AdsTxtRecord, RequestWithRecords } from '../models';

const EditRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const translate = useTranslation();
  const { language } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<RequestWithRecords | null>(null);
  const [hasInvalidRecords, setHasInvalidRecords] = useState(false);
  const [records, setRecords] = useState<AdsTxtRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 初期データの取得
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!id || !token) return;

      try {
        setLoading(true);
        setError(null);

        const response = await requestApi.getRequest(id, token);

        if (response.success) {
          setRequest(response.data);
          // 既存のレコードを編集用にフォーマット
          setRecords(
            response.data.records.map((record) => ({
              ...record,
              id: record.id,
              status: record.status,
            }))
          );
        } else {
          setError(response.error?.message || translate('editRequest.error.fetchFailed'));
        }
      } catch (err) {
        console.error('Error fetching request for editing:', err);
        setError(translate('editRequest.error.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [id, token, language]);

  // レコードが選択されたときのハンドラー
  const handleRecordsSelected = (selectedRecords: AdsTxtRecord[]) => {
    setRecords(selectedRecords);
  };

  // リクエスト更新時のハンドラー
  const handleUpdateRequest = async () => {
    if (!id || !token || !request) return;

    if (records.length === 0) {
      setError(translate('editRequest.error.noRecords'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // リクエストの更新
      const response = await requestApi.updateRequest(id, {
        token,
        records,
        requester_name: request.request.requester_name,
        publisher_name: request.request.publisher_name,
        publisher_domain: request.request.publisher_domain,
      });

      if (response.success) {
        setSuccessMessage(translate('editRequest.success'));
        // 成功後、少し待ってからリクエスト詳細ページに戻る
        setTimeout(() => {
          navigate(`/request/${id}?token=${token}`);
        }, 2000);
      } else {
        setError(response.error?.message || translate('editRequest.error.updateFailed'));
      }
    } catch (err) {
      console.error('Error updating request:', err);
      setError(translate('editRequest.error.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // バリデーションエラーがあるか確認
  const isFormValid = () => {
    return !hasInvalidRecords && records.length > 0;
  };

  // エラー表示
  if (!id || !token) {
    return (
      <ErrorMessage
        title={translate('editRequest.error.missingParams')}
        message={translate('editRequest.error.missingParamsDescription')}
      />
    );
  }

  // ローディング表示
  if (loading) {
    return (
      <Flex direction="column" alignItems="center" padding="2rem">
        <Loader size="large" />
        <Text marginTop="1rem">{translate('common.loading')}</Text>
      </Flex>
    );
  }

  // リクエストが見つからない場合
  if (!request) {
    return (
      <ErrorMessage
        title={translate('editRequest.error.notFound')}
        message={translate('editRequest.error.notFoundDescription')}
      />
    );
  }

  // 編集不可能な状態の場合
  if (request.request.status !== 'pending' && request.request.status !== 'rejected') {
    return (
      <ErrorMessage
        title={translate('editRequest.error.cannotEdit')}
        message={translate('editRequest.error.cannotEditDescription')}
      />
    );
  }

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: translate('common.home'), href: '/' },
          {
            label: translate('requestDetailPage.breadcrumb'),
            href: `/request/${id}?token=${token}`,
          },
          { label: translate('editRequest.breadcrumb'), isCurrent: true },
        ]}
      />

      <Card padding="1.5rem" variation="outlined">
        <Flex direction="column" gap="1.5rem">
          <Heading level={2}>{translate('editRequest.title')}</Heading>

          {error && (
            <Text color="red" fontWeight="bold">
              {error}
            </Text>
          )}

          {successMessage && (
            <Text color="green" fontWeight="bold">
              {successMessage}
            </Text>
          )}

          <Flex direction="column" gap="1rem">
            <Card variation="outlined" padding="1rem">
              <Heading level={4}>{translate('editRequest.publisherInfo')}</Heading>
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

            <Card variation="outlined" padding="1rem">
              <Heading level={4}>{translate('editRequest.requesterInfo')}</Heading>
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

          <Heading level={3}>{translate('editRequest.records')}</Heading>

          <AdsTxtTextInput
            onRecordsSelected={handleRecordsSelected}
            onHasInvalidRecords={(hasInvalid) => setHasInvalidRecords(hasInvalid)}
            initialRecords={records}
          />

          <Flex justifyContent="space-between" marginTop="1rem">
            <Flex gap="1rem">
              <button
                onClick={() => navigate(`/request/${id}?token=${token}`)}
                className="amplify-button amplify-button--link"
              >
                {translate('common.cancel')}
              </button>

              <button
                onClick={handleUpdateRequest}
                className="amplify-button amplify-button--primary"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting
                  ? translate('common.updating')
                  : translate('editRequest.submitButton')}
              </button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

export default EditRequestPage;
