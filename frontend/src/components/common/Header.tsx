import React from 'react';
import { Link } from 'react-router-dom';
import { Flex, Heading, Button, useTheme } from '@aws-amplify/ui-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useApp } from '../../context/AppContext';

// Simple translations
const translations = {
  appName: {
    en: 'Ads.txt Manager',
    ja: 'Ads.txt マネージャー',
  },
  newRequest: {
    en: 'New Request',
    ja: '新規リクエスト',
  },
  home: {
    en: 'Home',
    ja: 'ホーム',
  },
};

const Header: React.FC = () => {
  const { tokens } = useTheme();
  const { language } = useApp();

  // Helper function to get translated text
  const t = (key: keyof typeof translations) => {
    return translations[key][language as 'en' | 'ja'] || translations[key]['en'];
  };

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
          <Heading level={3}>{t('appName')}</Heading>
        </Link>
      </Flex>

      <Flex gap="1rem" alignItems="center">
        <LanguageSwitcher />

        <Button as={Link} to="/new-request" variation="primary">
          {t('newRequest')}
        </Button>

        <Button as={Link} to="/" variation="link">
          {t('home')}
        </Button>
      </Flex>
    </Flex>
  );
};

export default Header;
