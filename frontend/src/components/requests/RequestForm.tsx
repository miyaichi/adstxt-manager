import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Heading,
  Loader,
  TabItem,
  Tabs,
  Text,
  TextField,
  View,
  useTheme,
} from '@aws-amplify/ui-react';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adsTxtApi, requestApi } from '../../api';
import { useTranslation } from '../../hooks/useTranslation';
import { AdsTxtRecord, CreateRequestData } from '../../models';
import { createLogger } from '../../utils/logger';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';
import AdsTxtTextInput from '../adsTxt/AdsTxtTextInput';

const logger = createLogger('RequestForm');

// Simple debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => func(...args), waitFor);
  };
};

const RequestForm: React.FC = () => {
  const translate = useTranslation();
  const [formData, setFormData] = useState<CreateRequestData>({
    publisher_email: '',
    requester_email: '',
    requester_name: '',
    publisher_name: '',
    publisher_domain: '',
  });

  const [records, setRecords] = useState<AdsTxtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInvalidRecords, setHasInvalidRecords] = useState(false);
  const [success, setSuccess] = useState<{
    requestId: string;
    token?: string;
    publisher_token?: string;
    requester_token?: string;
  } | null>(null);

  // Domain validation states
  const [isDomainValidating, setIsDomainValidating] = useState(false);
  const [domainValidationStatus, setDomainValidationStatus] = useState<
    'none' | 'success' | 'error' | 'invalid'
  >('none');
  const [domainValidationMessage, setDomainValidationMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { tokens } = useTheme();

  // Domain validation
  const validateDomain = async (domain: string) => {
    // Reset validation states
    setDomainValidationStatus('none');
    setDomainValidationMessage(null);

    if (!domain) return;

    // Simple domain format validation using regex
    const domainRegex = /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,})$/;
    if (!domainRegex.test(domain)) {
      setDomainValidationStatus('invalid');
      setDomainValidationMessage(translate('requests.form.domainValidation.invalidFormat'));
      return;
    }

    // Start validation
    setIsDomainValidating(true);
    try {
      const response = await adsTxtApi.getAdsTxtFromDomain(domain);
      logger.debug('Domain validation response:', response);

      if (response.success) {
        const { status } = response.data;

        if (status === 'success') {
          setDomainValidationStatus('success');
          setDomainValidationMessage(translate('requests.form.domainValidation.success'));
        } else {
          setDomainValidationStatus('error');
          setDomainValidationMessage(
            response.data.error_message || translate('requests.form.domainValidation.error')
          );
        }
      } else {
        setDomainValidationStatus('error');
        setDomainValidationMessage(
          response.error?.message || translate('requests.form.domainValidation.error')
        );
      }
    } catch (err) {
      logger.error('Domain validation error:', err);
      setDomainValidationStatus('error');
      setDomainValidationMessage(translate('requests.form.domainValidation.error'));
    } finally {
      setIsDomainValidating(false);
    }
  };

  // Create a debounced version of the validation function
  const debouncedValidateDomain = useRef(
    debounce((domain: string) => validateDomain(domain), 1000)
  ).current;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If the domain field is being changed, trigger validation
    if (name === 'publisher_domain' && value) {
      debouncedValidateDomain(value);
    }
  };

  const handleRecordsSelected = (selectedRecords: AdsTxtRecord[]) => {
    setRecords(selectedRecords);
  };

  const validateForm = () => {
    if (!formData.publisher_email || !formData.requester_email || !formData.requester_name) {
      setError(translate('requests.form.requiredFieldsError'));
      return false;
    }

    if (records.length === 0) {
      setError(translate('requests.form.recordsRequiredError'));
      return false;
    }

    // Validate domain if provided
    if (formData.publisher_domain) {
      if (domainValidationStatus === 'invalid' || domainValidationStatus === 'error') {
        setError(
          domainValidationMessage || translate('requests.form.domainValidation.invalidFormat')
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError(null);

      const requestData: CreateRequestData = {
        ...formData,
        records: records,
      };

      const response = await requestApi.createRequest(requestData);

      if (response.success) {
        // 作成時にリクエスターのメールアドレスをセッションストレージに保存
        sessionStorage.setItem('userEmail', formData.requester_email);

        // Use requester_token if available, otherwise fall back to legacy token
        setSuccess({
          requestId: response.data.request_id,
          token: response.data.token,
          publisher_token: response.data.publisher_token,
          requester_token: response.data.requester_token,
        });
        // Clear form
        setFormData({
          publisher_email: '',
          requester_email: '',
          requester_name: '',
          publisher_name: '',
          publisher_domain: '',
        });
        setRecords([]);
      } else {
        setError(response.error?.message || translate('requests.form.processingError'));
      }
    } catch (err) {
      setError(translate('requests.form.processingError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewRequest = () => {
    if (success) {
      // リクエスターの場合、リクエスタートークンとリクエスターロールを使用
      const token = success.requester_token || success.token || '';
      navigate(`/request/${success.requestId}?token=${token}&role=requester`);
    }
  };

  if (success) {
    return (
      <Card padding="2rem" variation="elevated">
        <Flex direction="column" gap="1rem" alignItems="center">
          <Heading level={2}>{translate('requests.success.title')}</Heading>
          <Alert variation="success">{translate('requests.success.message')}</Alert>

          <Flex
            direction="column"
            padding="1rem"
            width="100%"
            backgroundColor={tokens.colors.background.secondary}
          >
            <Text fontWeight="bold">{translate('requests.success.requestId')}</Text>
            <Text fontFamily="monospace">{success.requestId}</Text>
          </Flex>

          <Text>
            {translate('requests.success.emailNotification') ||
              'Email notifications with request details have been sent to both parties.'}
          </Text>

          <Button onClick={handleViewRequest} variation="primary">
            {translate('requests.success.viewRequest')}
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card padding="1.5rem" variation="outlined">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1.5rem">
          <Heading level={2}>{translate('requests.form.title')}</Heading>

          <Text>{translate('requests.form.description')}</Text>

          {error && <Alert variation="error">{error}</Alert>}

          <Divider />

          <Heading level={3}>{translate('requests.form.basicInfo')}</Heading>

          <Flex direction="column" gap="1rem">
            <TextField
              name="publisher_email"
              label={translate('requests.form.publisherEmail')}
              placeholder="publisher@example.com"
              value={formData.publisher_email}
              onChange={handleInputChange}
              isRequired
            />

            <TextField
              name="publisher_name"
              label={translate('requests.form.publisherName')}
              placeholder="Example Media Inc."
              value={formData.publisher_name}
              onChange={handleInputChange}
            />

            <TextField
              name="publisher_domain"
              label={translate('requests.form.publisherDomain')}
              placeholder="example.com"
              value={formData.publisher_domain}
              onChange={handleInputChange}
              hasError={domainValidationStatus === 'error' || domainValidationStatus === 'invalid'}
              errorMessage={
                (domainValidationStatus === 'error' || domainValidationStatus === 'invalid') &&
                domainValidationMessage
                  ? domainValidationMessage
                  : ''
              }
              innerEndComponent={
                isDomainValidating ? (
                  <Flex alignItems="center" gap="0.5rem">
                    <Loader size="small" />
                    <Text fontSize="0.8rem">
                      {translate('requests.form.domainValidation.loading')}
                    </Text>
                  </Flex>
                ) : domainValidationStatus === 'success' ? (
                  <Badge variation="success">{domainValidationMessage}</Badge>
                ) : null
              }
            />

            <TextField
              name="requester_email"
              label={translate('requests.form.requesterEmail')}
              placeholder="requester@adnetwork.com"
              value={formData.requester_email}
              onChange={handleInputChange}
              isRequired
            />

            <TextField
              name="requester_name"
              label={translate('requests.form.requesterName')}
              placeholder="Ad Network Inc."
              value={formData.requester_name}
              onChange={handleInputChange}
              isRequired
            />
          </Flex>

          <Divider />

          <Heading level={3}>{translate('requests.form.adsTxtRecords')}</Heading>

          <Tabs>
            <TabItem title={translate('requests.form.uploadTab')}>
              <AdsTxtTextInput
                onRecordsSelected={handleRecordsSelected}
                onHasInvalidRecords={(hasInvalid) => setHasInvalidRecords(hasInvalid)}
              />
            </TabItem>

            <TabItem title={translate('requests.form.selectedRecordsTab')}>
              <View padding="1rem">
                <AdsTxtRecordList
                  records={records}
                  title={translate('requests.form.selectedRecords')}
                />

                {records.length === 0 && (
                  <Text>{translate('requests.form.noRecordsSelected')}</Text>
                )}
              </View>
            </TabItem>
          </Tabs>

          <Divider />

          <Button
            type="submit"
            variation="primary"
            isLoading={isLoading}
            isDisabled={records.length === 0 || hasInvalidRecords}
          >
            {translate('requests.form.submitRequest')}
          </Button>

          {hasInvalidRecords && (
            <Alert variation="warning" marginTop="1rem">
              {translate('requests.form.invalidRecordsWarning') ||
                'Please fix invalid records before submitting the request.'}
            </Alert>
          )}
        </Flex>
      </form>
    </Card>
  );
};

export default RequestForm;
