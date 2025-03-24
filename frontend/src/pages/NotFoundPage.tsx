import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Text, Button, Card } from '@aws-amplify/ui-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const NotFoundPage: React.FC = () => {
  const { language } = useApp();

  return (
    <Flex direction="column" justifyContent="center" alignItems="center" padding="2rem" gap="2rem">
      <Card variation="elevated" padding="2rem" textAlign="center">
        <Heading level={1} marginBottom="1rem">
          404
        </Heading>
        <Heading level={3} marginBottom="1rem">
          {t('notFoundPage.title', language)}
        </Heading>

        <Text marginBottom="2rem">{t('notFoundPage.description', language)}</Text>

        <Button as={Link} to="/" variation="primary">
          {t('notFoundPage.button', language)}
        </Button>
      </Card>
    </Flex>
  );
};

export default NotFoundPage;
