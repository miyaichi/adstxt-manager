import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Flex, Breadcrumbs, Alert } from '@aws-amplify/ui-react';
import RequestDetail from '../components/requests/RequestDetail';
import ErrorMessage from '../components/common/ErrorMessage';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!id) {
    return (
      <ErrorMessage
        title="リクエストIDがありません"
        message="リクエストIDが指定されていません。URLを確認してください"
      />
    );
  }

  if (!token) {
    return (
      <ErrorMessage
        title="トークンがありません"
        message="アクセストークンが指定されていません。URLを確認してください"
      />
    );
  }

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: 'ホーム', href: '/' },
          { label: 'リクエスト詳細', isCurrent: true },
        ]}
      />

      <RequestDetail requestId={id} token={token} />
    </Flex>
  );
};

export default RequestDetailPage;
