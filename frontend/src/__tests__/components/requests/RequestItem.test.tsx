import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Request } from '../../../models';

// Manually import the component to force resolution
jest.mock('../../../components/requests/RequestItem', () => {
  const actual = jest.requireActual('../../../components/requests/RequestItem');
  return actual.default || actual;
});
import RequestItem from '../../../components/requests/RequestItem';

// Mock the AWS Amplify UI components
jest.mock('@aws-amplify/ui-react', () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  Flex: ({ children, ...props }: any) => (
    <div data-testid="flex" {...props}>
      {children}
    </div>
  ),
  Text: ({ children, ...props }: any) => (
    <p data-testid="text" {...props}>
      {children}
    </p>
  ),
  Badge: ({ children, variation, ...props }: any) => (
    <span data-testid={`badge-${variation || 'default'}`} {...props}>
      {children}
    </span>
  ),
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
  Heading: ({ children, ...props }: any) => (
    <h5 data-testid="heading" {...props}>
      {children}
    </h5>
  ),
}));

// Mock React Router dom Link component
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} data-testid="link" {...props}>
      {children}
    </a>
  ),
}));

// Mock request for testing
const mockRequest: Request = {
  id: 'request-123',
  publisher_email: 'publisher@example.com',
  requester_email: 'requester@example.com',
  requester_name: 'Test Requester',
  publisher_name: 'Test Publisher',
  publisher_domain: 'example.com',
  status: 'pending',
  token: 'test-token',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('RequestItem component', () => {
  test('renders request information correctly', () => {
    render(<RequestItem request={mockRequest} />);

    // Check if publisher email is displayed
    const textElements = screen.getAllByTestId('text');
    const publisherEmailText = textElements.find((el) =>
      el.textContent?.includes('publisher@example.com')
    );
    expect(publisherEmailText).toBeInTheDocument();

    // Check if requester name is displayed
    const requesterNameText = textElements.find((el) => el.textContent?.includes('Test Requester'));
    expect(requesterNameText).toBeInTheDocument();

    // Check status badge is displayed
    const pendingBadge = screen.getByTestId('badge-warning');
    expect(pendingBadge).toBeInTheDocument();
    expect(pendingBadge.textContent).toBe('保留中');

    // Check if button with link to detail page exists
    const detailButton = screen.getByText('詳細を表示');
    expect(detailButton).toBeInTheDocument();
    expect(detailButton.getAttribute('to')).toBe(
      `/request/${mockRequest.id}?token=${mockRequest.token}`
    );
  });

  test('renders approved status correctly', () => {
    const approvedRequest = { ...mockRequest, status: 'approved' };
    render(<RequestItem request={approvedRequest} />);

    const approvedBadge = screen.getByTestId('badge-success');
    expect(approvedBadge).toBeInTheDocument();
    expect(approvedBadge.textContent).toBe('承認済み');
  });

  test('renders rejected status correctly', () => {
    const rejectedRequest = { ...mockRequest, status: 'rejected' };
    render(<RequestItem request={rejectedRequest} />);

    const rejectedBadge = screen.getByTestId('badge-error');
    expect(rejectedBadge).toBeInTheDocument();
    expect(rejectedBadge.textContent).toBe('拒否');
  });
});
