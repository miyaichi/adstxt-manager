import { Breadcrumbs, Flex } from '@aws-amplify/ui-react';
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/common/ErrorMessage';
import RequestDetail from '../components/requests/RequestDetail';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { language } = useApp();

  if (!id) {
    return (
      <ErrorMessage
        title={t('requestDetailPage.errors.noId', language)}
        message={t('requestDetailPage.errors.noIdDescription', language)}
      />
    );
  }

  if (!token) {
    return (
      <ErrorMessage
        title={t('requestDetailPage.errors.noToken', language)}
        message={t('requestDetailPage.errors.noTokenDescription', language)}
      />
    );
  }

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: t('common.home', language), href: '/' },
          { label: t('requestDetailPage.breadcrumb', language), isCurrent: true },
        ]}
      />

      <RequestDetail requestId={id} token={token} />
    </Flex>
  );
};

export default RequestDetailPage;
