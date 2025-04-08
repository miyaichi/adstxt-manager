import { Badge, Button, Card, Flex, Heading, Text } from '@aws-amplify/ui-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';
import { Request } from '../../models';

interface RequestItemProps {
  request: Request;
}

const RequestItem: React.FC<RequestItemProps> = ({ request }) => {
  const { language } = useApp();
  const createdDate = new Date(request.created_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );
  
  // Debug: Log request object to see if records_summary is present
  useEffect(() => {
    console.log('Request object:', request);
    console.log('Records summary:', request.records_summary);
    console.log('Has warnings:', request.records_summary?.some(record => record.has_warning));
  }, [request]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">{t('common.status.approved', language)}</Badge>;
      case 'rejected':
        return <Badge variation="error">{t('common.status.rejected', language)}</Badge>;
      case 'pending':
        return <Badge variation="warning">{t('common.status.pending', language)}</Badge>;
      case 'updated':
        return <Badge variation="info">{t('common.status.updated', language)}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle the records_count property which might not be in the type
  const recordCount = (request as any).records_count || 0;

  return (
    <Card variation="outlined" padding="1rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="0.5rem">
          <Heading level={5} margin="0">
            ID: {request.id.substring(0, 8)}...
          </Heading>
          {getStatusBadge(request.status)}
        </Flex>

        <Flex direction={{ base: 'column', medium: 'row' }} gap="1rem" wrap="wrap">
          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">{t('requests.item.publisher', language)}</Text>
            <Text>{request.publisher_email}</Text>
            {request.publisher_name && <Text>{request.publisher_name}</Text>}
            {request.publisher_domain && (
              <Text>
                {t('requests.item.domain', language)} {request.publisher_domain}
              </Text>
            )}
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">{t('requests.item.requester', language)}</Text>
            <Text>{request.requester_email}</Text>
            <Text>{request.requester_name}</Text>
            <Text>{t('requests.item.recordCount', language, { count: recordCount })}</Text>
            {request.validation_stats && (
              <Flex gap="0.5rem" marginTop="0.5rem">
                <Badge variation="success">
                  {t('common.valid', language)}: {request.validation_stats.valid || 0}
                </Badge>
                {request.validation_stats.invalid > 0 && (
                  <Badge variation="error">
                    {t('common.invalid', language)}: {request.validation_stats.invalid}
                  </Badge>
                )}
                {request.validation_stats.warnings > 0 && (
                  <Badge variation="warning">
                    {t('common.warning', language)}: {request.validation_stats.warnings}
                  </Badge>
                )}
              </Flex>
            )}
            
            {/* Display record warnings if available */}
            {request.records_summary && request.records_summary.some(record => record.has_warning) && (
              <Flex direction="column" gap="0.25rem" marginTop="0.5rem">
                <Text fontWeight="semibold">{t('common.warning', language)} {t('common.details', language)}:</Text>
                {request.records_summary
                  .filter(record => record.has_warning)
                  .slice(0, 3) // Show only the first 3 warnings to avoid cluttering
                  .map((record, index) => (
                    <Text key={index} fontSize="xs">
                      • {record.domain}, {record.account_id}: 
                      {` ${record.validation_key ? 
                        t(`warnings.${record.validation_key}.title`, language) || 
                        t(`errors.adsTxtValidation.${record.validation_key}`, language) || 
                        'Warning' : 'Warning'}`}
                    </Text>
                  ))}
                {request.records_summary.filter(record => record.has_warning).length > 3 && (
                  <Text fontSize="xs">
                    • {t('common.andMore', language, { count: request.records_summary.filter(record => record.has_warning).length - 3 })}
                  </Text>
                )}
              </Flex>
            )}
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">{t('requests.item.status', language)}</Text>
            <Text>{t(`common.status.${request.status}`, language)}</Text>
            <Text fontWeight="bold">{t('requests.item.created', language)}</Text>
            <Text>{createdDate}</Text>
          </Flex>
        </Flex>

        <Flex justifyContent="flex-end" marginTop="0.5rem">
          <Button
            as={Link}
            to={`/request/${request.id}?token=${request.token}`}
            variation="primary"
            size="small"
          >
            {t('requests.item.viewDetails', language)}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default RequestItem;
