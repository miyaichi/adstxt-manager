import React from 'react';
import { Flex, Text, Divider, useTheme, Link } from '@aws-amplify/ui-react';
import { Link as RouterLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

const Footer: React.FC = () => {
  const { tokens } = useTheme();
  const { language } = useApp();
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
        <Text>{t('footer.copyright', language, { year: currentYear })}</Text>

        <Flex gap="1rem">
          <Link as={RouterLink} to="/terms">{t('common.termsOfService', language)}</Link>
          <Link as={RouterLink} to="/privacy">{t('common.privacyPolicy', language)}</Link>
          <Link as={RouterLink} to="/help">{t('common.help', language)}</Link>
          <Link as={RouterLink} to="/contact">{t('common.contact', language)}</Link>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Footer;
