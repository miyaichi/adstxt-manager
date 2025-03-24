import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Button, useTheme } from '@aws-amplify/ui-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

const Header: React.FC = () => {
  const { tokens } = useTheme();
  const { language } = useApp();

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
          <Heading level={3}>{t('homePage.title', language)}</Heading>
        </Link>
      </Flex>

      <Flex gap="1rem" alignItems="center">
        <LanguageSwitcher />

        <Button as={Link} to="/new-request" variation="primary">
          {t('newRequestPage.breadcrumb', language)}
        </Button>

        <Button as={Link} to="/" variation="link">
          {t('common.home', language)}
        </Button>
      </Flex>
    </Flex>
  );
};

export default Header;
