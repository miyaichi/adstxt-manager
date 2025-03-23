import React from 'react';
import { Card, Flex, Text, useTheme } from '@aws-amplify/ui-react';
import { Message } from '../../models';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { tokens } = useTheme();

  // Format date to locale string
  const formattedDate = new Date(message.created_at).toLocaleString();

  return (
    <Card variation="outlined" padding="1rem" marginBottom="0.5rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">{message.sender_email}</Text>
          <Text fontSize="0.875rem" color={tokens.colors.font.secondary}>
            {formattedDate}
          </Text>
        </Flex>

        <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>
      </Flex>
    </Card>
  );
};

export default MessageItem;
