// React is used implicitly by JSX
import { render, screen } from '@testing-library/react';
import Header from '../../../components/common/Header';

// Mock the AWS Amplify UI components
jest.mock('@aws-amplify/ui-react', () => ({
  Flex: ({ children, ...props }: any) => (
    <div data-testid="flex" {...props}>
      {children}
    </div>
  ),
  Heading: ({ children, ...props }: any) => (
    <h3 data-testid="heading" {...props}>
      {children}
    </h3>
  ),
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
  useTheme: () => ({
    tokens: {
      colors: {
        background: { secondary: '#f5f5f5' },
      },
    },
  }),
}));

// Mock React Router dom components
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} data-testid="link" {...props}>
      {children}
    </a>
  ),
}));

describe('Header component', () => {
  test('renders the header with logo and navigation links', () => {
    render(<Header />);

    // Check the component renders
    const headingElement = screen.getByTestId('heading');
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.textContent).toBe('Ads.txt マネージャー');

    // Check navigation links
    const buttons = screen.getAllByTestId('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('新規リクエスト');
    expect(buttons[1].textContent).toBe('ホーム');
  });
});
