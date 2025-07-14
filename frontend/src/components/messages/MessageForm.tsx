import React, { useState } from 'react';
import { Card, Flex, TextField, Button, Alert, Heading } from '@aws-amplify/ui-react';
import { messageApi } from '../../api';
import { Message, RequestWithRecords } from '../../models';
import { useTranslation } from '../../hooks/useTranslation';

interface MessageFormProps {
  requestId: string;
  token: string;
  onMessageSent?: (message: Message) => void;
  request?: RequestWithRecords | null;
}

const MessageForm: React.FC<MessageFormProps> = ({ requestId, token, onMessageSent, request }) => {
  const translate = useTranslation();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content) {
      setError(translate('messages.form.requiredFields'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      // The sender email will be determined on the server side based on the token
      const response = await messageApi.createMessage({
        request_id: requestId,
        // We don't need to send sender_email anymore as it will be determined from the token
        sender_email: '', // Sending empty string, will be ignored by backend
        content,
        token,
      });

      if (response.success) {
        setContent('');
        setSuccess(true);

        if (onMessageSent) {
          onMessageSent(response.data);
        }
      } else {
        setError(response.error?.message || translate('messages.form.sendError'));
      }
    } catch (err) {
      setError(translate('messages.form.sendError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variation="outlined" padding="1rem">
      <Heading level={4}>{translate('messages.form.title')}</Heading>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1rem" marginTop="1rem">
          {error && <Alert variation="error">{error}</Alert>}

          {success && <Alert variation="success">{translate('messages.form.sendSuccess')}</Alert>}

          <TextField
            label={translate('messages.form.messageLabel')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={translate('messages.form.messagePlaceholder')}
            isRequired
            as="textarea"
            rows={4}
          />

          <Button type="submit" variation="primary" isLoading={isLoading} isDisabled={!content}>
            {translate('common.send')}
          </Button>
        </Flex>
      </form>
    </Card>
  );
};

export default MessageForm;
