import React, { useState } from 'react';
import { 
  Card,
  Flex,
  TextField,
  Button,
  Alert,
  Heading
} from '@aws-amplify/ui-react';
import { messageApi } from '../../api';
import { Message } from '../../models';

interface MessageFormProps {
  requestId: string;
  token: string;
  onMessageSent?: (message: Message) => void;
}

const MessageForm: React.FC<MessageFormProps> = ({ requestId, token, onMessageSent }) => {
  const [content, setContent] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content || !senderEmail) {
      setError('メッセージ内容とメールアドレスは必須です');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      
      const response = await messageApi.createMessage({
        request_id: requestId,
        sender_email: senderEmail,
        content,
        token
      });
      
      if (response.success) {
        setContent('');
        setSuccess(true);
        
        if (onMessageSent) {
          onMessageSent(response.data);
        }
      } else {
        setError(response.error?.message || 'メッセージの送信中にエラーが発生しました');
      }
    } catch (err) {
      setError('メッセージの送信中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variation="outlined" padding="1rem">
      <Heading level={4}>新規メッセージ</Heading>
      
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1rem" marginTop="1rem">
          {error && (
            <Alert variation="error">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variation="success">
              メッセージが送信されました
            </Alert>
          )}
          
          <TextField
            label="メールアドレス"
            value={senderEmail}
            onChange={e => setSenderEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
            isRequired
          />
          
          <TextField
            label="メッセージ"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="メッセージ内容を入力してください..."
            isRequired
            as="textarea"
            rows={4}
          />
          
          <Button
            type="submit"
            variation="primary"
            isLoading={isLoading}
            isDisabled={!content || !senderEmail}
          >
            送信
          </Button>
        </Flex>
      </form>
    </Card>
  );
};

export default MessageForm;