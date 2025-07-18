import React from 'react';
import { Card, Flex, Text, useTheme } from '@aws-amplify/ui-react';
import { Message } from '../../models';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { tokens } = useTheme();
  const { language } = useApp();
  const translate = useTranslation();

  // Format date to locale string according to the current language
  const formattedDate = new Date(message.created_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );

  return (
    <Card variation="outlined" padding="1rem" marginBottom="0.5rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">
            <Text as="span">{translate('messages.item.sender')} </Text>
            {message.sender_email}
          </Text>
          <Text fontSize="0.875rem" color={tokens.colors.font.secondary}>
            <Text as="span">{translate('messages.item.sentAt')} </Text>
            {formattedDate}
          </Text>
        </Flex>

        <Text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Text>
      </Flex>
    </Card>
  );
};

export default MessageItem;
