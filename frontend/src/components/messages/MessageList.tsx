import React, { useState, useEffect } from 'react';
import { 
  Flex, 
  Heading, 
  Text, 
  Alert, 
  Loader,
  Divider
} from '@aws-amplify/ui-react';
import { messageApi } from '../../api';
import { Message } from '../../models';
import MessageItem from './MessageItem';

interface MessageListProps {
  requestId: string;
  token: string;
  messages?: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ requestId, token, messages: initialMessages }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [loading, setLoading] = useState(!initialMessages);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
      return;
    }
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await messageApi.getMessagesByRequestId(requestId, token);
        
        if (response.success) {
          setMessages(response.data);
        } else {
          setError(response.error?.message || 'メッセージの取得中にエラーが発生しました');
        }
      } catch (err) {
        setError('メッセージの取得中にエラーが発生しました');
        console.error(err);
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
    return (
      <Alert variation="error">
        {error}
      </Alert>
    );
  }

  return (
    <Flex direction="column" gap="1rem">
      <Heading level={4}>メッセージ履歴</Heading>
      <Divider />
      
      {messages.length === 0 ? (
        <Text>このリクエストにはまだメッセージがありません</Text>
      ) : (
        <Flex direction="column" gap="0.5rem">
          {messages.map(message => (
            <MessageItem key={message.id} message={message} />
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default MessageList;