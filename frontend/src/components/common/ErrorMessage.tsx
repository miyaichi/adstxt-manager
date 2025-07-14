import { Alert, Button, Flex, Text } from '@aws-amplify/ui-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface ErrorMessageProps {
  title?: string;
  message: string;
  showHomeButton?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ title, message, showHomeButton = true }) => {
  const translate = useTranslation();
  const defaultTitle = translate('errorMessage.defaultTitle');

  return (
    <Alert variation="error" isDismissible={false} hasIcon={true} heading={title || defaultTitle}>
      <Flex direction="column" gap="1rem">
        <Text>{message}</Text>

        {showHomeButton && (
          <Button as={Link} to="/" variation="primary">
            {translate('common.backToHome')}
          </Button>
        )}
      </Flex>
    </Alert>
  );
};

export default ErrorMessage;
