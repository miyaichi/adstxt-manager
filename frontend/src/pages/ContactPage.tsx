import React, { useState } from 'react';
import {
  Flex,
  Heading,
  TextField,
  TextAreaField,
  Button,
  Text,
  Alert,
  View,
} from '@aws-amplify/ui-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const ContactPage: React.FC = () => {
  const { language } = useApp();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('contact.form.emailRequired', language));
      return false;
    }
    
    if (!message.trim()) {
      setError(t('contact.form.messageRequired', language));
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('contact.form.invalidEmail', language));
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
      await axios.post(`${API_BASE_URL}/contact`, {
        email,
        message
      });
      
      setSuccess(true);
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Error sending contact form:', err);
      setError(t('contact.form.submitError', language));
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
          heading={t('contact.success.title', language)}
        >
          <Text>{t('contact.success.message', language)}</Text>
          <Button
            onClick={() => setSuccess(false)}
            marginTop="1rem"
          >
            {t('contact.success.newMessage', language)}
          </Button>
        </Alert>
      </View>
    );
  }

  return (
    <Flex
      as="main"
      direction="column"
      padding="2rem"
      maxWidth="800px"
      margin="0 auto"
    >
      <Heading level={1} marginBottom="1rem">
        {t('contact.title', language)}
      </Heading>
      
      <Text marginBottom="2rem">
        {t('contact.description', language)}
      </Text>

      {error && (
        <Alert
          variation="error"
          isDismissible={true}
          hasIcon={true}
          heading={t('common.error', language)}
          onDismiss={() => setError(null)}
          marginBottom="1rem"
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          label={t('contact.form.emailLabel', language)}
          placeholder={t('contact.form.emailPlaceholder', language)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isRequired
          marginBottom="1rem"
        />
        
        <TextAreaField
          label={t('contact.form.messageLabel', language)}
          placeholder={t('contact.form.messagePlaceholder', language)}
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
          loadingText={t('common.sending', language)}
        >
          {t('contact.form.submitButton', language)}
        </Button>
      </form>
    </Flex>
  );
};

export default ContactPage;</string">
</invoke>