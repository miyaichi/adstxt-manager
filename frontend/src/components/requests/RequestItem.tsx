import { Badge, Button, Card, Flex, Heading, Text } from '@aws-amplify/ui-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { t } from '../../i18n/translations';
import { Request } from '../../models';

interface RequestItemProps {
  request: Request;
}

const RequestItem: React.FC<RequestItemProps> = ({ request }) => {
  const { language } = useApp();
  const translate = useTranslation();
  const createdDate = new Date(request.created_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );

  // Debug: Log request object to see if records_summary is present
  useEffect(() => {
    console.log('Request object:', request);
    console.log('Records summary:', request.records_summary);
    console.log(
      'Has warnings:',
      request.records_summary?.some((record) => record.has_warning)
    );
  }, [request]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">{translate('common.status.approved')}</Badge>;
      case 'rejected':
        return <Badge variation="error">{translate('common.status.rejected')}</Badge>;
      case 'pending':
        return <Badge variation="warning">{translate('common.status.pending')}</Badge>;
      case 'updated':
        return <Badge variation="info">{translate('common.status.updated')}</Badge>;
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
            <Text fontWeight="bold">{translate('requests.item.publisher')}</Text>
            <Text>{request.publisher_email}</Text>
            {request.publisher_name && <Text>{request.publisher_name}</Text>}
            {request.publisher_domain && (
              <Text>
                {translate('requests.item.domain')} {request.publisher_domain}
              </Text>
            )}
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">{translate('requests.item.requester')}</Text>
            <Text>{request.requester_email}</Text>
            <Text>{request.requester_name}</Text>
            <Text>{translate('requests.item.recordCount', [recordCount.toString()])}</Text>
            {request.validation_stats && (
              <Flex gap="0.5rem" marginTop="0.5rem">
                <Badge variation="success">
                  {translate('common.valid')}: {request.validation_stats.valid || 0}
                </Badge>
                {request.validation_stats.invalid > 0 && (
                  <Badge variation="error">
                    {translate('common.invalid')}: {request.validation_stats.invalid}
                  </Badge>
                )}
                {request.validation_stats.warnings > 0 && (
                  <Badge variation="warning">
                    {translate('common.warning')}: {request.validation_stats.warnings}
                  </Badge>
                )}
              </Flex>
            )}

            {/* Display record warnings if available */}
            {request.records_summary &&
              request.records_summary.some((record) => record.has_warning) && (
                <Flex direction="column" gap="0.25rem" marginTop="0.5rem">
                  <Text fontWeight="semibold">
                    {translate('common.warning')} {translate('common.details')}:
                  </Text>
                  {request.records_summary
                    .filter((record) => record.has_warning)
                    .slice(0, 3) // Show only the first 3 warnings to avoid cluttering
                    .map((record, index) => (
                      <Text key={index} fontSize="xs">
                        • {record.domain}, {record.account_id}:
                        {` ${
                          record.validation_key
                            ? t(`warnings.${record.validation_key}.title`, language) || 'Warning'
                            : 'Warning'
                        }`}
                      </Text>
                    ))}
                  {request.records_summary.filter((record) => record.has_warning).length > 3 && (
                    <Text fontSize="xs">
                      •{' '}
                      {translate('common.andMore', [
                        (request.records_summary.filter((record) => record.has_warning).length - 3).toString()
                      ])}
                    </Text>
                  )}
                </Flex>
              )}
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">{translate('requests.item.status')}</Text>
            <Text>{translate(`common.status.${request.status}`)}</Text>
            <Text fontWeight="bold">{translate('requests.item.created')}</Text>
            <Text>{createdDate}</Text>
          </Flex>
        </Flex>

        <Flex justifyContent="flex-end" marginTop="0.5rem">
          <Button
            as={Link}
            to={`/request/${request.id}?token=${request.publisher_token || request.requester_token || request.token || ''}`}
            variation="primary"
            size="small"
          >
            {translate('requests.item.viewDetails')}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default RequestItem;
