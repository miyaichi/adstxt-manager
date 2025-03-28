import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Flex, Text, Badge, Button, Heading } from '@aws-amplify/ui-react';
import { Request } from '../../models';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface RequestItemProps {
  request: Request;
}

const RequestItem: React.FC<RequestItemProps> = ({ request }) => {
  const { language } = useApp();
  // We don't need to format the updated date, just using created date
  const createdDate = new Date(request.created_at).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US'
  );

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
