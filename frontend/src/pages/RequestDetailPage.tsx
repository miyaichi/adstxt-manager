import { Breadcrumbs, Flex } from '@aws-amplify/ui-react';
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ErrorMessage from '../components/common/ErrorMessage';
import RequestDetail from '../components/requests/RequestDetail';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const role = searchParams.get('role');
  const langParam = searchParams.get('lang');
  const { language, setLanguage } = useApp();
  const translate = useTranslation();

  // If there's a lang parameter in the URL, use it to update the app language
  React.useEffect(() => {
    if (langParam && ['en', 'ja'].includes(langParam) && langParam !== language) {
      setLanguage(langParam);
    }
  }, [langParam, language, setLanguage]);

  if (!id) {
    return (
      <ErrorMessage
        title={translate('requestDetailPage.errors.noId')}
        message={translate('requestDetailPage.errors.noIdDescription')}
      />
    );
  }

  if (!token) {
    return (
      <ErrorMessage
        title={translate('requestDetailPage.errors.noToken')}
        message={translate('requestDetailPage.errors.noTokenDescription')}
      />
    );
  }

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: translate('common.home'), href: '/' },
          { label: translate('requestDetailPage.breadcrumb'), isCurrent: true },
        ]}
      />

      <RequestDetail
        requestId={id}
        token={token}
        initialRole={role as 'publisher' | 'requester' | undefined}
      />
    </Flex>
  );
};

export default RequestDetailPage;
