import { Alert, Button, Flex, Text } from '@aws-amplify/ui-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface ErrorMessageProps {
  title?: string;
  message: string;
  showHomeButton?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ title, message, showHomeButton = true }) => {
  const { language } = useApp();
  const defaultTitle = t('errorMessage.defaultTitle', language);

  return (
    <Alert variation="error" isDismissible={false} hasIcon={true} heading={title || defaultTitle}>
      <Flex direction="column" gap="1rem">
        <Text>{message}</Text>

        {showHomeButton && (
          <Button as={Link} to="/" variation="primary">
            {t('common.backToHome', language)}
          </Button>
        )}
      </Flex>
    </Alert>
  );
};

export default ErrorMessage;
