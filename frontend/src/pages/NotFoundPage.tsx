import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Text, Button, Card } from '@aws-amplify/ui-react';

const NotFoundPage: React.FC = () => {
  return (
    <Flex direction="column" justifyContent="center" alignItems="center" padding="2rem" gap="2rem">
      <Card variation="elevated" padding="2rem" textAlign="center">
        <Heading level={1} marginBottom="1rem">
          404
        </Heading>
        <Heading level={3} marginBottom="1rem">
          ページが見つかりません
        </Heading>

        <Text marginBottom="2rem">お探しのページは存在しないか、移動された可能性があります。</Text>

        <Button as={Link} to="/" variation="primary">
          ホームに戻る
        </Button>
      </Card>
    </Flex>
  );
};

export default NotFoundPage;
