import React, { useState } from 'react';
import { Card, Flex, TextField, Button, Alert, Heading } from '@aws-amplify/ui-react';
import apiClient from '../../api';
import { Message } from '../../models';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface MessageFormProps {
  requestId: string;
  token: string;
  onMessageSent?: (message: Message) => void;
}

const MessageForm: React.FC<MessageFormProps> = ({ requestId, token, onMessageSent }) => {
  const { language } = useApp();
  const [content, setContent] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content || !senderEmail) {
      setError(t('messages.form.requiredFields', language));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      const response = await apiClient.message.createMessage({
        request_id: requestId,
        sender_email: senderEmail,
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
        setError(response.error?.message || t('messages.form.sendError', language));
      }
    } catch (err) {
      setError(t('messages.form.sendError', language));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variation="outlined" padding="1rem">
      <Heading level={4}>{t('messages.form.title', language)}</Heading>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1rem" marginTop="1rem">
          {error && <Alert variation="error">{error}</Alert>}

          {success && <Alert variation="success">{t('messages.form.sendSuccess', language)}</Alert>}

          <TextField
            label={t('messages.form.emailLabel', language)}
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
            isRequired
          />

          <TextField
            label={t('messages.form.messageLabel', language)}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('messages.form.messagePlaceholder', language)}
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
            {t('common.send', language)}
          </Button>
        </Flex>
      </form>
    </Card>
  );
};

export default MessageForm;
