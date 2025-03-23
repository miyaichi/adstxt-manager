import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Button, useTheme } from '@aws-amplify/ui-react';

const Header: React.FC = () => {
  const { tokens } = useTheme();

  return (
    <Flex
      as="header"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      padding="1rem"
      backgroundColor={tokens.colors.background.secondary}
      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
    >
      <Flex alignItems="center" gap="1rem">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Heading level={3}>Ads.txt マネージャー</Heading>
        </Link>
      </Flex>

      <Flex gap="1rem">
        <Button as={Link} to="/new-request" variation="primary">
          新規リクエスト
        </Button>

        <Button as={Link} to="/" variation="link">
          ホーム
        </Button>
      </Flex>
    </Flex>
  );
};

export default Header;
