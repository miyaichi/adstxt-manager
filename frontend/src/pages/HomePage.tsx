import {
  Alert,
  Button,
  Card,
  Divider,
  Flex,
  Heading,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const HomePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { language } = useApp();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t('homePage.errors.emailRequired', language));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 検証が必要ない場合はリダイレクト
      navigate(`/requests?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(t('homePage.errors.fetchError', language));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" alignItems="center" gap="2rem">
        <Heading level={1} textAlign="center">
          {t('homePage.title', language)}
        </Heading>

        <Text textAlign="center" maxWidth="800px">
          {t('homePage.description', language)}
        </Text>

        <Flex direction="column" gap="2rem" width="100%" maxWidth="1000px" padding="1rem">
          {/* First row: Two original cards side by side */}
          <Flex direction={{ base: 'column', medium: 'row' }} gap="2rem" width="100%">
            <Card variation="outlined" flex="1">
              <Heading level={3}>{t('homePage.createRequest.title', language)}</Heading>
              <Divider marginBlock="1rem" />
              <Text>{t('homePage.createRequest.description', language)}</Text>
              <Button as={Link} to="/new-request" variation="primary" width="100%" marginTop="1rem">
                {t('homePage.createRequest.button', language)}
              </Button>
            </Card>

            <Card variation="outlined" flex="1">
              <Heading level={3}>{t('homePage.checkRequest.title', language)}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{t('homePage.checkRequest.description', language)}</Text>

              <form onSubmit={handleEmailSubmit}>
                <Flex direction="column" gap="0.5rem">
                  <TextField
                    label={t('common.email', language)}
                    name="email"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                  />
                  {error && <Alert variation="error">{error}</Alert>}
                  <Button type="submit" variation="primary" width="100%" isLoading={isLoading}>
                    {t('homePage.checkRequest.button', language)}
                  </Button>
                </Flex>
              </form>
            </Card>
          </Flex>

          {/* Second row: Tool cards side by side */}
          <Flex direction={{ base: 'column', medium: 'row' }} gap="2rem" width="100%">
            <Card variation="outlined" flex="1">
              <Heading level={3}>{t('homePage.optimizeAdsTxt.title', language)}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{t('homePage.optimizeAdsTxt.description', language)}</Text>
              <Button as={Link} to="/optimizer" variation="primary" width="auto">
                {t('homePage.optimizeAdsTxt.button', language)}
              </Button>
            </Card>

            <Card variation="outlined" flex="1">
              <Heading level={3}>{t('homePage.siteAnalysis.title', language)}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{t('homePage.siteAnalysis.description', language)}</Text>
              <Button as={Link} to="/site-analysis" variation="primary" width="auto">
                {t('homePage.siteAnalysis.button', language)}
              </Button>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </View>
  );
};

export default HomePage;
