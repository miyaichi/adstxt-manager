import { Breadcrumbs, Flex } from '@aws-amplify/ui-react';
import React from 'react';
import RequestForm from '../components/requests/RequestForm';
import { useTranslation } from '../hooks/useTranslation';

const NewRequestPage: React.FC = () => {
  const translate = useTranslation();

  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: translate('common.home'), href: '/' },
          { label: translate('newRequestPage.breadcrumb'), isCurrent: true },
        ]}
      />

      <RequestForm />
    </Flex>
  );
};

export default NewRequestPage;
