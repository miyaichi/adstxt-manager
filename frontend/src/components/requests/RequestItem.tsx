import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Flex, Text, Badge, Button, Heading } from '@aws-amplify/ui-react';
import { Request } from '../../models';

interface RequestItemProps {
  request: Request;
}

const RequestItem: React.FC<RequestItemProps> = ({ request }) => {
  const formattedDate = new Date(request.updated_at).toLocaleString();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">承認済み</Badge>;
      case 'rejected':
        return <Badge variation="error">拒否</Badge>;
      case 'pending':
        return <Badge variation="warning">保留中</Badge>;
      case 'updated':
        return <Badge variation="info">更新済み</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card variation="outlined" padding="1rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="0.5rem">
          <Heading level={5} margin="0">
            リクエストID: {request.id.substring(0, 8)}...
          </Heading>
          {getStatusBadge(request.status)}
        </Flex>

        <Flex direction={{ base: 'column', medium: 'row' }} gap="1rem" wrap="wrap">
          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">パブリッシャー情報:</Text>
            <Text>{request.publisher_email}</Text>
            {request.publisher_name && <Text>{request.publisher_name}</Text>}
            {request.publisher_domain && <Text>{request.publisher_domain}</Text>}
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">リクエスト者情報:</Text>
            <Text>{request.requester_email}</Text>
            <Text>{request.requester_name}</Text>
          </Flex>

          <Flex direction="column" flex="1" minWidth="200px">
            <Text fontWeight="bold">作成日:</Text>
            <Text>{new Date(request.created_at).toLocaleString()}</Text>
            <Text fontWeight="bold">最終更新日:</Text>
            <Text>{formattedDate}</Text>
          </Flex>
        </Flex>

        <Flex justifyContent="flex-end" marginTop="0.5rem">
          <Button
            as={Link}
            to={`/request/${request.id}?token=${request.token}`}
            variation="primary"
            size="small"
          >
            詳細を表示
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default RequestItem;
