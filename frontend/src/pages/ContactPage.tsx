import {
  Alert,
  Button,
  Flex,
  Heading,
  Text,
  TextAreaField,
  TextField,
  View,
} from '@aws-amplify/ui-react';
import axios from 'axios';
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const ContactPage: React.FC = () => {
  const translate = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email.trim()) {
      setError(translate('contact.form.emailRequired'));
      return false;
    }

    if (!message.trim()) {
      setError(translate('contact.form.messageRequired'));
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(translate('contact.form.invalidEmail'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use relative API path - the proxy will handle it
      await axios.post('/api/contact', {
        email,
        message,
      });

      setSuccess(true);
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Error sending contact form:', err);
      setError(translate('contact.form.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View padding="2rem">
        <Alert
          variation="success"
          isDismissible={false}
          hasIcon={true}
          heading={translate('contact.success.title')}
        >
          <Text>{translate('contact.success.message')}</Text>
          <Button onClick={() => setSuccess(false)} marginTop="1rem">
            {translate('contact.success.newMessage')}
          </Button>
        </Alert>
      </View>
    );
  }

  return (
    <Flex as="main" direction="column" padding="2rem" maxWidth="800px" margin="0 auto">
      <Heading level={1} marginBottom="1rem">
        {translate('contact.title')}
      </Heading>

      <Text marginBottom="2rem">{translate('contact.description')}</Text>

      {error && (
        <Alert
          variation="error"
          isDismissible={true}
          hasIcon={true}
          heading={translate('common.error')}
          onDismiss={() => setError(null)}
          marginBottom="1rem"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          label={translate('contact.form.emailLabel')}
          placeholder={translate('contact.form.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isRequired
          marginBottom="1rem"
        />

        <TextAreaField
          label={translate('contact.form.messageLabel')}
          placeholder={translate('contact.form.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          isRequired
          rows={8}
          marginBottom="1.5rem"
        />

        <Button
          type="submit"
          variation="primary"
          isFullWidth
          isLoading={isSubmitting}
          loadingText={translate('common.sending')}
        >
          {translate('contact.form.submitButton')}
        </Button>
      </form>
    </Flex>
  );
};

export default ContactPage;
