import { createTheme, defaultTheme } from '@aws-amplify/ui-react';

export const theme = createTheme({
  name: 'adstxt-manager-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: defaultTheme.tokens.colors.blue['10'],
          20: defaultTheme.tokens.colors.blue['20'],
          40: defaultTheme.tokens.colors.blue['40'],
          60: defaultTheme.tokens.colors.blue['60'],
          80: defaultTheme.tokens.colors.blue['80'],
          90: defaultTheme.tokens.colors.blue['90'],
          100: defaultTheme.tokens.colors.blue['100'],
        },
        secondary: {
          10: defaultTheme.tokens.colors.teal['10'],
          20: defaultTheme.tokens.colors.teal['20'],
          40: defaultTheme.tokens.colors.teal['40'],
          60: defaultTheme.tokens.colors.teal['60'],
          80: defaultTheme.tokens.colors.teal['80'],
          90: defaultTheme.tokens.colors.teal['90'],
          100: defaultTheme.tokens.colors.teal['100'],
        },
      },
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F7F9',
      },
      font: {
        primary: '#333333',
        secondary: '#5F6B7A',
        interactive: defaultTheme.tokens.colors.blue['80'],
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: defaultTheme.tokens.colors.blue['80'],
          color: '#FFFFFF',
          borderColor: defaultTheme.tokens.colors.blue['80'],
          _hover: {
            backgroundColor: defaultTheme.tokens.colors.blue['90'],
            borderColor: defaultTheme.tokens.colors.blue['90'],
          },
          _focus: {
            backgroundColor: defaultTheme.tokens.colors.blue['90'],
            borderColor: defaultTheme.tokens.colors.blue['90'],
          },
          _active: {
            backgroundColor: defaultTheme.tokens.colors.blue['100'],
            borderColor: defaultTheme.tokens.colors.blue['100'],
          },
        },
      },
      card: {
        outlined: {
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          boxShadow: 'none',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: defaultTheme.tokens.colors.neutral['20'],
        },
        elevated: {
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderWidth: '0',
        },
      },
      heading: {
        color: '#333333',
      },
    },
  },
});