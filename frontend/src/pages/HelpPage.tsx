import React from 'react';
import MarkdownPage from './MarkdownPage';

export const HelpPage: React.FC = () => {
  return <MarkdownPage pageType="help" sectionParam="warning" />;
};

export default HelpPage;
