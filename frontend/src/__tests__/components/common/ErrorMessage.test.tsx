import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorMessage from '../../../components/common/ErrorMessage';

// Mock the AWS Amplify UI components
jest.mock('@aws-amplify/ui-react', () => ({
  Alert: ({ children, heading, ...props }: any) => (
    <div data-testid="alert" {...props}>
      <div data-testid="alert-heading">{heading}</div>
      {children}
    </div>
  ),
  Flex: ({ children, ...props }: any) => <div data-testid="flex" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <p data-testid="text" {...props}>{children}</p>,
  Button: ({ children, ...props }: any) => <button data-testid="button" {...props}>{children}</button>
}));

// Mock React Router dom Link component
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} data-testid="link" {...props}>{children}</a>
  )
}));

describe('ErrorMessage component', () => {
  test('renders with default title', () => {
    render(<ErrorMessage message="Something went wrong" />);
    
    const alertHeading = screen.getByTestId('alert-heading');
    expect(alertHeading.textContent).toBe('エラーが発生しました');
    
    const messageText = screen.getByTestId('text');
    expect(messageText.textContent).toBe('Something went wrong');
    
    const homeButton = screen.getByTestId('button');
    expect(homeButton.textContent).toBe('ホームに戻る');
  });

  test('renders with custom title', () => {
    render(<ErrorMessage title="Custom Error" message="Something went wrong" />);
    
    const alertHeading = screen.getByTestId('alert-heading');
    expect(alertHeading.textContent).toBe('Custom Error');
    
    const messageText = screen.getByTestId('text');
    expect(messageText.textContent).toBe('Something went wrong');
  });

  test('does not render home button when showHomeButton is false', () => {
    render(<ErrorMessage message="Something went wrong" showHomeButton={false} />);
    
    expect(screen.queryByTestId('button')).not.toBeInTheDocument();
  });
});