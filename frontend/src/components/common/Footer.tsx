import React from 'react';
import { Flex, Text, Divider, useTheme } from '@aws-amplify/ui-react';

const Footer: React.FC = () => {
  const { tokens } = useTheme();
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
        <Text>© {currentYear} Ads.txt マネージャー</Text>
        
        <Flex gap="1rem">
          <Text>利用規約</Text>
          <Text>プライバシーポリシー</Text>
          <Text>お問い合わせ</Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Footer;