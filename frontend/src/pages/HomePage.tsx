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
import { useTranslation } from '../hooks/useTranslation';

const HomePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const translate = useTranslation();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(translate('homePage.errors.emailRequired'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 検証が必要ない場合はリダイレクト
      navigate(`/requests?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(translate('homePage.errors.fetchError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" alignItems="center" gap="2rem">
        <Heading level={1} textAlign="center">
          {translate('homePage.title')}
        </Heading>

        <Text textAlign="center" maxWidth="800px">
          {translate('homePage.description')}
        </Text>

        <Flex direction="column" gap="2rem" width="100%" maxWidth="1000px" padding="1rem">
          {/* First row: Two original cards side by side */}
          <Flex direction={{ base: 'column', medium: 'row' }} gap="2rem" width="100%">
            <Card variation="outlined" flex="1">
              <Heading level={3}>{translate('homePage.createRequest.title')}</Heading>
              <Divider marginBlock="1rem" />
              <Text>{translate('homePage.createRequest.description')}</Text>
              <Button as={Link} to="/new-request" variation="primary" width="100%" marginTop="1rem">
                {translate('homePage.createRequest.button')}
              </Button>
            </Card>

            <Card variation="outlined" flex="1">
              <Heading level={3}>{translate('homePage.checkRequest.title')}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{translate('homePage.checkRequest.description')}</Text>

              <form onSubmit={handleEmailSubmit}>
                <Flex direction="column" gap="0.5rem">
                  <TextField
                    label={translate('common.email')}
                    name="email"
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                  />
                  {error && <Alert variation="error">{error}</Alert>}
                  <Button type="submit" variation="primary" width="100%" isLoading={isLoading}>
                    {translate('homePage.checkRequest.button')}
                  </Button>
                </Flex>
              </form>
            </Card>
          </Flex>

          {/* Second row: Tool cards side by side */}
          <Flex direction={{ base: 'column', medium: 'row' }} gap="2rem" width="100%">
            <Card variation="outlined" flex="1">
              <Heading level={3}>{translate('homePage.optimizeAdsTxt.title')}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{translate('homePage.optimizeAdsTxt.description')}</Text>
              <Button as={Link} to="/optimizer" variation="primary" width="auto">
                {translate('homePage.optimizeAdsTxt.button')}
              </Button>
            </Card>

            <Card variation="outlined" flex="1">
              <Heading level={3}>{translate('homePage.siteAnalysis.title')}</Heading>
              <Divider marginBlock="1rem" />
              <Text marginBottom="1rem">{translate('homePage.siteAnalysis.description')}</Text>
              <Button as={Link} to="/site-analysis" variation="primary" width="auto">
                {translate('homePage.siteAnalysis.button')}
              </Button>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </View>
  );
};

export default HomePage;
