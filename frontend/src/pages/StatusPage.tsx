import { Badge, Card, Divider, Flex, Heading, Loader, Text, View } from '@aws-amplify/ui-react';
import React, { useEffect, useState } from 'react';
import apiClient from '../api';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { createLogger } from '../utils/logger';

const logger = createLogger('StatusPage');

interface StatusData {
  frontend: {
    status: string;
    environment: Record<string, string>;
  };
  backend: {
    status: string;
    database: {
      connected: boolean;
    };
    environment: Record<string, string>;
    time: string;
    error?: string;
  } | null;
}

const StatusPage: React.FC = () => {
  const { language } = useApp();
  const translate = useTranslation();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<StatusData>({
    frontend: {
      status: 'OK',
      environment: {},
    },
    backend: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Get filtered environment variables - exclude any containing secrets
  const getFilteredEnvVars = () => {
    const filtered: Record<string, string> = {};
    const secretKeywords = ['key', 'secret', 'password', 'token', 'auth', 'credential'];

    Object.keys(process.env).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (!secretKeywords.some((secretWord) => lowerKey.includes(secretWord))) {
        filtered[key] = process.env[key] as string;
      }
    });

    // Add public URL
    filtered['PUBLIC_URL'] = window.location.origin;
    filtered['NODE_ENV'] = process.env.NODE_ENV || 'development';

    return filtered;
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Get frontend environment variables
        const frontendEnv = getFilteredEnvVars();

        // Add additional frontend information
        frontendEnv['BROWSER'] = navigator.userAgent;
        frontendEnv['BASE_URL'] = window.location.origin;
        // In development, the backend is at localhost:3001, but accessed via proxy
        frontendEnv['BACKEND_URL'] =
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : process.env.REACT_APP_BACKEND_URL || window.location.origin;

        console.log('Attempting to fetch backend status...');
        // Get backend status
        const backendStatus = await apiClient.status.getStatus();
        console.log('Backend status fetch successful:', backendStatus);

        // Details of the backend response structure
        console.log('Backend response type:', typeof backendStatus);
        if (backendStatus) {
          console.log('Backend response keys:', Object.keys(backendStatus));
        }

        // Check if backend status is a valid object
        const validBackendStatus =
          backendStatus && typeof backendStatus === 'object' && 'status' in backendStatus;

        if (!validBackendStatus) {
          console.error('Invalid backend status format:', backendStatus);
        }

        // Use the backend response directly
        setStatusData({
          frontend: {
            status: 'OK',
            environment: frontendEnv,
          },
          backend: validBackendStatus ? backendStatus : null,
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Full error object:', err);
        logger.error('Error fetching status:', err);

        // Extract error message with more details
        let errorMessage = 'Failed to connect to backend';

        if (err?.response?.data?.error?.message) {
          errorMessage = `${errorMessage}: ${err.response.data.error.message}`;
        } else if (err?.message) {
          errorMessage = `${errorMessage}: ${err.message}`;
        }

        if (err?.code === 'ERR_NETWORK') {
          errorMessage = `Network error: Could not reach backend server. Check if the server is running at port 3001`;
        }

        setError(errorMessage);

        // Still set frontend status
        const frontendEnv = getFilteredEnvVars();
        frontendEnv['BROWSER'] = navigator.userAgent;
        frontendEnv['BASE_URL'] = window.location.origin;
        // In development, the backend is at localhost:3001, but accessed via proxy
        frontendEnv['BACKEND_URL'] =
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : process.env.REACT_APP_BACKEND_URL || window.location.origin;

        setStatusData({
          frontend: {
            status: 'OK',
            environment: frontendEnv,
          },
          backend: {
            status: 'NG',
            database: {
              connected: false,
            },
            environment: {},
            time: new Date().toISOString(),
            error: errorMessage,
          },
        });

        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const renderEnvironmentVariables = (envVars: Record<string, string>) => {
    return Object.entries(envVars).map(([key, value]) => (
      <View key={key} padding="xs">
        <Text>
          <strong>{key}:</strong> {value}
        </Text>
      </View>
    ));
  };

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="80vh">
        <Loader size="large" />
      </Flex>
    );
  }

  return (
    <View padding="medium">
      <Heading level={2}>{translate('statusPage.title')}</Heading>

      {error && (
        <View
          padding="medium"
          backgroundColor="rgba(255, 0, 0, 0.1)"
          borderRadius="medium"
          marginBottom="medium"
        >
          <Text color="red">{error}</Text>
        </View>
      )}

      <Flex direction="column" gap="medium">
        {/* Frontend Status */}
        <Card>
          <Heading level={3}>{translate('statusPage.frontend.title')}</Heading>
          <Flex alignItems="center" gap="small" marginBottom="medium">
            <Text>{translate('statusPage.frontend.status')}</Text>
            <Badge variation={statusData.frontend.status === 'OK' ? 'success' : 'error'}>
              {statusData.frontend.status}
            </Badge>
          </Flex>

          <Divider />

          <Heading level={4} marginTop="medium">
            {translate('statusPage.environment.title')}
          </Heading>
          <View>{renderEnvironmentVariables(statusData.frontend.environment)}</View>
        </Card>

        {/* Backend Status */}
        <Card>
          <Heading level={3}>{translate('statusPage.backend.title')}</Heading>

          {statusData.backend ? (
            <>
              <Flex alignItems="center" gap="small" marginBottom="medium">
                <Text>{translate('statusPage.backend.status')}</Text>
                <Badge variation={statusData.backend.status === 'OK' ? 'success' : 'error'}>
                  {statusData.backend.status}
                </Badge>
              </Flex>

              <Flex alignItems="center" gap="small" marginBottom="medium">
                <Text>{translate('statusPage.backend.database')}</Text>
                <Badge variation={statusData.backend.database.connected ? 'success' : 'error'}>
                  {statusData.backend.database.connected
                    ? translate('statusPage.backend.connected')
                    : translate('statusPage.backend.disconnected')}
                </Badge>
              </Flex>

              {statusData.backend.error && (
                <Text color="red" marginBottom="medium">
                  {translate('statusPage.backend.error')} {statusData.backend.error}
                </Text>
              )}

              <Text marginBottom="medium">
                {translate('statusPage.backend.lastChecked')}{' '}
                {new Date(statusData.backend.time).toLocaleString(
                  language === 'ja' ? 'ja-JP' : 'en-US'
                )}
              </Text>

              <Divider />

              <Heading level={4} marginTop="medium">
                {translate('statusPage.environment.title')}
              </Heading>
              <View>{renderEnvironmentVariables(statusData.backend.environment)}</View>
            </>
          ) : (
            <Text>{translate('statusPage.backend.couldNotConnect')}</Text>
          )}
        </Card>
      </Flex>
    </View>
  );
};

export default StatusPage;
