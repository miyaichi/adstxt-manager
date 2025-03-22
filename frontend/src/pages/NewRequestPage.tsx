import React from 'react';
import RequestForm from '../components/requests/RequestForm';
import { Flex, Heading, Breadcrumbs } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';

const NewRequestPage: React.FC = () => {
  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: 'ホーム', href: '/' },
          { label: '新規リクエスト', isCurrent: true }
        ]}
      />
      
      <RequestForm />
    </Flex>
  );
};

export default NewRequestPage;