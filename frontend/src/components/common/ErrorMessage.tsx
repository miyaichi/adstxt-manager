import React from 'react';
import { Alert, Heading, Text, Flex, Button } from '@aws-amplify/ui-react';
import { Link } from 'react-router-dom';

interface ErrorMessageProps {
  title?: string;
  message: string;
  showHomeButton?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  title = 'エラーが発生しました', 
  message, 
  showHomeButton = true 
}) => {
  return (
    <Alert
      variation="error"
      isDismissible={false}
      hasIcon={true}
      heading={title}
    >
      <Flex direction="column" gap="1rem">
        <Text>{message}</Text>
        
        {showHomeButton && (
          <Button as={Link} to="/" variation="primary">
            ホームに戻る
          </Button>
        )}
      </Flex>
    </Alert>
  );
};

export default ErrorMessage;