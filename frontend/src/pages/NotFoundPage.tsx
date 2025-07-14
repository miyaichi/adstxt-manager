import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Text, Button, Card } from '@aws-amplify/ui-react';
import { useTranslation } from '../hooks/useTranslation';

const NotFoundPage: React.FC = () => {
  const translate = useTranslation();

  return (
    <Flex direction="column" justifyContent="center" alignItems="center" padding="2rem" gap="2rem">
      <Card variation="elevated" padding="2rem" textAlign="center">
        <Heading level={1} marginBottom="1rem">
          404
        </Heading>
        <Heading level={3} marginBottom="1rem">
          {translate('notFoundPage.title')}
        </Heading>

        <Text marginBottom="2rem">{translate('notFoundPage.description')}</Text>

        <Button as={Link} to="/" variation="primary">
          {translate('notFoundPage.button')}
        </Button>
      </Card>
    </Flex>
  );
};

export default NotFoundPage;
