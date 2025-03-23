import React from 'react';
import { Flex, View } from '@aws-amplify/ui-react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Flex direction="column" minHeight="100vh">
      <Header />

      <View
        as="main"
        flex="1"
        padding={{ base: '1rem', medium: '2rem' }}
        maxWidth="1200px"
        marginLeft="auto"
        marginRight="auto"
        width="100%"
      >
        {children}
      </View>

      <Footer />
    </Flex>
  );
};

export default Layout;
