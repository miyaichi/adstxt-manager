import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Button, useTheme } from '@aws-amplify/ui-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';

const Header: React.FC = () => {
  const { tokens } = useTheme();
  const translate = useTranslation();

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
          <Heading level={3}>{translate('homePage.title')}</Heading>
        </Link>
      </Flex>

      <Flex gap="1rem" alignItems="center">
        <LanguageSwitcher />

        <Button as={Link} to="/new-request" variation="primary">
          {translate('newRequestPage.breadcrumb')}
        </Button>

        <Button as={Link} to="/" variation="link">
          {translate('common.home')}
        </Button>
      </Flex>
    </Flex>
  );
};

export default Header;
