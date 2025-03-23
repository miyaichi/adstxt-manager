import { Alert, Divider, Flex, Heading, Loader, Text } from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import { messageApi } from '../../api';
import { Message } from '../../models';
import { createLogger } from '../../utils/logger';
import MessageItem from './MessageItem';

interface MessageListProps {
  requestId: string;
  token: string;
  messages?: Message[];
}

// Create a logger for the component
const logger = createLogger('MessageList');

const MessageList: React.FC<MessageListProps> = ({
  requestId,
  token,
  messages: initialMessages,
}) => {
  logger.debug('Rendered with props:', {
    requestId,
    token,
    initialMessagesLength: initialMessages?.length,
  });
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the provided messages if there are any
    if (initialMessages && initialMessages.length > 0) {
      logger.debug('Using provided messages:', initialMessages);
      setMessages(initialMessages);
      setLoading(false);
      return;
    }

    // If not, fetch messages from the API
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.debug('Fetching messages for request:', requestId);
        logger.debug('RequestID=', JSON.stringify(requestId));
        logger.debug('Token=', JSON.stringify(token));

        const response = await messageApi.getMessagesByRequestId(requestId, token);

        if (response.success) {
          logger.debug('Messages fetched successfully:', response.data);
          setMessages(response.data || []);
        } else {
          logger.error('Error fetching messages:', response.error);
          setError(response.error?.message || 'メッセージの取得中にエラーが発生しました');
        }
      } catch (err) {
        setError('メッセージの取得中にエラーが発生しました');
        logger.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [requestId, token, initialMessages]);

  if (loading) {
    return (
      <Flex justifyContent="center" padding="1rem">
        <Loader size="large" />
      </Flex>
    );
  }

  if (error) {
    return <Alert variation="error">{error}</Alert>;
  }

  return (
    <Flex direction="column" gap="1rem">
      <Heading level={4}>メッセージ履歴</Heading>
      <Divider />

      {messages.length === 0 ? (
        <Text>このリクエストにはまだメッセージがありません</Text>
      ) : (
        <Flex direction="column" gap="0.5rem">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default MessageList;
