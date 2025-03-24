import React from 'react';
import { Flex, Text, Divider, useTheme } from '@aws-amplify/ui-react';
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
          <Text>{t('common.termsOfService', language)}</Text>
          <Text>{t('common.privacyPolicy', language)}</Text>
          <Text>{t('common.contact', language)}</Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Footer;
