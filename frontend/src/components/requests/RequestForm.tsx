import React, { useState } from 'react';
import {
  Card,
  Flex,
  TextField,
  Button,
  Text,
  Alert,
  Tabs,
  TabItem,
  Divider,
  Heading,
  View,
  useTheme,
} from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';
import { AdsTxtRecord, CreateRequestData } from '../../models';
import { requestApi } from '../../api';
import AdsTxtFileUpload from '../adsTxt/AdsTxtFileUpload';
import AdsTxtRecordList from '../adsTxt/AdsTxtRecordList';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

const RequestForm: React.FC = () => {
  const { language } = useApp();
  const [formData, setFormData] = useState<CreateRequestData>({
    publisher_email: '',
    requester_email: '',
    requester_name: '',
    publisher_name: '',
    publisher_domain: '',
  });

  const [adsTxtFile, setAdsTxtFile] = useState<File | null>(null);
  const [records, setRecords] = useState<AdsTxtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    requestId: string;
    token: string;
  } | null>(null);

  const navigate = useNavigate();
  const { tokens } = useTheme();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRecordsSelected = (selectedRecords: AdsTxtRecord[]) => {
    setRecords(selectedRecords);
  };

  const validateForm = () => {
    if (!formData.publisher_email || !formData.requester_email || !formData.requester_name) {
      setError(t('requests.form.requiredFieldsError', language));
      return false;
    }

    if (records.length === 0) {
      setError(t('requests.form.recordsRequiredError', language));
      return false;
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
        setSuccess({
          requestId: response.data.request_id,
          token: response.data.token,
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
        setError(response.error?.message || t('requests.form.processingError', language));
      }
    } catch (err) {
      setError(t('requests.form.processingError', language));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewRequest = () => {
    if (success) {
      navigate(`/request/${success.requestId}?token=${success.token}`);
    }
  };

  if (success) {
    return (
      <Card padding="2rem" variation="elevated">
        <Flex direction="column" gap="1rem" alignItems="center">
          <Heading level={2}>{t('requests.success.title', language)}</Heading>
          <Alert variation="success">
            {t('requests.success.message', language)}
          </Alert>

          <Flex
            direction="column"
            padding="1rem"
            width="100%"
            backgroundColor={tokens.colors.background.secondary}
          >
            <Text fontWeight="bold">{t('requests.success.requestId', language)}</Text>
            <Text fontFamily="monospace">{success.requestId}</Text>
            <Divider marginBlock="1rem" />
            <Text fontWeight="bold">{t('requests.success.accessToken', language)}</Text>
            <Text fontFamily="monospace">{success.token}</Text>
          </Flex>

          <Text>{t('requests.success.saveInfo', language)}</Text>

          <Button onClick={handleViewRequest} variation="primary">
            {t('requests.success.viewRequest', language)}
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card padding="1.5rem" variation="outlined">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="1.5rem">
          <Heading level={2}>{t('requests.form.title', language)}</Heading>

          <Text>
            {t('requests.form.description', language)}
          </Text>

          {error && <Alert variation="error">{error}</Alert>}

          <Divider />

          <Heading level={3}>{t('requests.form.basicInfo', language)}</Heading>

          <Flex direction="column" gap="1rem">
            <TextField
              name="publisher_email"
              label={t('requests.form.publisherEmail', language)}
              placeholder="publisher@example.com"
              value={formData.publisher_email}
              onChange={handleInputChange}
              isRequired
            />

            <TextField
              name="publisher_name"
              label={t('requests.form.publisherName', language)}
              placeholder="Example Media Inc."
              value={formData.publisher_name}
              onChange={handleInputChange}
            />

            <TextField
              name="publisher_domain"
              label={t('requests.form.publisherDomain', language)}
              placeholder="example.com"
              value={formData.publisher_domain}
              onChange={handleInputChange}
            />

            <TextField
              name="requester_email"
              label={t('requests.form.requesterEmail', language)}
              placeholder="requester@adnetwork.com"
              value={formData.requester_email}
              onChange={handleInputChange}
              isRequired
            />

            <TextField
              name="requester_name"
              label={t('requests.form.requesterName', language)}
              placeholder="Ad Network Inc."
              value={formData.requester_name}
              onChange={handleInputChange}
              isRequired
            />
          </Flex>

          <Divider />

          <Heading level={3}>{t('requests.form.adsTxtRecords', language)}</Heading>

          <Tabs>
            <TabItem title={t('requests.form.fileUploadTab', language)}>
              <AdsTxtFileUpload onRecordsSelected={handleRecordsSelected} />
            </TabItem>

            <TabItem title={t('requests.form.selectedRecordsTab', language)}>
              <View padding="1rem">
                <AdsTxtRecordList 
                  records={records} 
                  title={t('requests.form.selectedRecords', language)} 
                />

                {records.length === 0 && (
                  <Text>
                    {t('requests.form.noRecordsSelected', language)}
                  </Text>
                )}
              </View>
            </TabItem>
          </Tabs>

          <Divider />

          <Button
            type="submit"
            variation="primary"
            isLoading={isLoading}
            isDisabled={records.length === 0}
          >
            {t('requests.form.submitRequest', language)}
          </Button>
        </Flex>
      </form>
    </Card>
  );
};

export default RequestForm;
