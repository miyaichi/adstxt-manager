import { Breadcrumbs, Flex } from '@aws-amplify/ui-react';
import React from 'react';
import RequestForm from '../components/requests/RequestForm';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const NewRequestPage: React.FC = () => {
  const { language } = useApp();

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: t('common.home', language), href: '/' },
          { label: t('newRequestPage.breadcrumb', language), isCurrent: true },
        ]}
      />

      <RequestForm />
    </Flex>
  );
};

export default NewRequestPage;
