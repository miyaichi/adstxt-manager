// Mock for @aws-amplify/ui-react
const React = require('react');

// Create mock components
const createMockComponent = (name) => {
  const Component = ({children, ...props}) => {
    return React.createElement('div', {
      'data-testid': `mock-${name}`,
      ...props
    }, children);
  };
  Component.displayName = name;
  return Component;
};

// Create the theme provider
const ThemeProvider = ({children, theme}) => {
  return React.createElement('div', {
    'data-testid': 'mock-ThemeProvider',
    'data-theme': JSON.stringify(theme)
  }, children);
};

// Create useTheme hook
const useTheme = jest.fn().mockReturnValue({
  tokens: {
    colors: {
      font: {
        primary: '#333333',
        secondary: '#5F6B7A',
      },
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F7F9',
      }
    },
    shadows: {
      small: '0 2px 4px rgba(0, 0, 0, 0.1)',
      medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
      large: '0 8px 16px rgba(0, 0, 0, 0.1)'
    }
  }
});

// Mock all the UI components
module.exports = {
  ThemeProvider,
  useTheme,
  Flex: createMockComponent('Flex'),
  View: createMockComponent('View'),
  Button: createMockComponent('Button'),
  Card: createMockComponent('Card'),
  Text: createMockComponent('Text'),
  Heading: createMockComponent('Heading'),
  TextField: createMockComponent('TextField'),
  Loader: createMockComponent('Loader'),
  Alert: createMockComponent('Alert'),
  Badge: createMockComponent('Badge'),
  Divider: createMockComponent('Divider'),
  Tabs: createMockComponent('Tabs'),
  TabItem: createMockComponent('TabItem'),
  SearchField: createMockComponent('SearchField'),
  Pagination: createMockComponent('Pagination'),
  Breadcrumbs: createMockComponent('Breadcrumbs'),
  SelectField: createMockComponent('SelectField'),
};