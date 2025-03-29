// React is used implicitly by JSX
import { render, screen, fireEvent } from '@testing-library/react';
import AdsTxtRecordItem from '../../../components/adsTxt/AdsTxtRecordItem';
import { AdsTxtRecord } from '../../../models';

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
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  useTheme: () => ({ tokens: { colors: { font: { secondary: '#666' } } } }),
}));

// Mock record for testing
const mockRecord: AdsTxtRecord = {
  id: 'test-id',
  request_id: 'request-123',
  domain: 'example.com',
  account_id: 'acct123',
  account_type: 'RESELLER',
  certification_authority_id: 'cert456',
  relationship: 'DIRECT',
  status: 'pending',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// Mock function for onStatusChange
const mockOnStatusChange = jest.fn();

describe('AdsTxtRecordItem component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders record information correctly', () => {
    render(<AdsTxtRecordItem record={mockRecord} />);

    // Check domain is displayed
    const textElements = screen.getAllByTestId('text');
    const domainText = textElements.find((el) => el.textContent?.includes('example.com'));
    expect(domainText).toBeInTheDocument();

    // Check status badge is displayed
    const pendingBadge = screen.getByTestId('badge-warning');
    expect(pendingBadge).toBeInTheDocument();
    expect(pendingBadge.textContent).toBe('保留中');
  });

  test('calls onStatusChange with approved status when approve button is clicked', () => {
    render(
      <AdsTxtRecordItem record={mockRecord} isEditable={true} onStatusChange={mockOnStatusChange} />
    );

    // Find and click the approve button
    const buttons = screen.getAllByTestId('button');
    const approveButton = buttons.find((b) => b.textContent === '承認');

    if (approveButton) {
      fireEvent.click(approveButton);
      expect(mockOnStatusChange).toHaveBeenCalledWith('test-id', 'approved');
    } else {
      fail('Approve button not found');
    }
  });

  test('calls onStatusChange with rejected status when reject button is clicked', () => {
    render(
      <AdsTxtRecordItem record={mockRecord} isEditable={true} onStatusChange={mockOnStatusChange} />
    );

    // Find and click the reject button
    const buttons = screen.getAllByTestId('button');
    const rejectButton = buttons.find((b) => b.textContent === '却下');

    if (rejectButton) {
      fireEvent.click(rejectButton);
      expect(mockOnStatusChange).toHaveBeenCalledWith('test-id', 'rejected');
    } else {
      fail('Reject button not found');
    }
  });
});
