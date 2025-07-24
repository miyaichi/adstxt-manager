import { Divider, Flex, Link, Text, useTheme } from '@aws-amplify/ui-react';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const Footer: React.FC = () => {
  const { tokens } = useTheme();
  const translate = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Flex
      as="footer"
      direction="column"
      padding="1rem"
      backgroundColor={tokens.colors.background.secondary}
    >
      <Divider marginBottom="1rem" />

      <Flex
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        wrap="wrap"
        gap="1rem"
      >
        <Text>© 2025 Ads.txt Manager</Text>

        <Flex gap="1rem">
          <Link as={RouterLink} to="/terms">
            {translate('common.termsOfService')}
          </Link>
          <Link as={RouterLink} to="/privacy">
            {translate('common.privacyPolicy')}
          </Link>
          <Link as={RouterLink} to="/help">
            {translate('common.help')}
          </Link>
          <Link as={RouterLink} to="/contact">
            {translate('common.contact')}
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Footer;
