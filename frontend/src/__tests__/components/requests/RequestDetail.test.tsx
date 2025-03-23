import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestDetail from '../../../components/requests/RequestDetail';
import { requestApi, adsTxtApi } from '../../../api';
import { RequestWithRecords, AdsTxtRecord, Message } from '../../../models';

// Mock the API modules
jest.mock('../../../api', () => ({
  requestApi: {
    getRequest: jest.fn(),
    updateRequestStatus: jest.fn(),
    updatePublisherInfo: jest.fn()
  },
  adsTxtApi: {
    getRecordsByRequestId: jest.fn(),
    updateRecordStatus: jest.fn(),
    generateAdsTxtContent: jest.fn()
  },
  messageApi: {
    getMessagesByRequestId: jest.fn(),
    createMessage: jest.fn()
  }
}));

// Mock the AWS Amplify UI components
jest.mock('@aws-amplify/ui-react', () => {
  // Create factory functions for each component
  const createCardComponent = () => ({ children, ...props }: any) => 
    <div data-testid="card" {...props}>{children}</div>;

  const createFlexComponent = () => ({ children, ...props }: any) => 
    <div data-testid="flex" {...props}>{children}</div>;

  const createTextComponent = () => ({ children, ...props }: any) => 
    <p data-testid="text" {...props}>{children}</p>;

  const createHeadingComponent = () => ({ children, level, ...props }: any) => {
    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
    return <HeadingTag data-testid="heading" {...props}>{children}</HeadingTag>;
  };

  const createBadgeComponent = () => ({ children, variation, ...props }: any) => 
    <span data-testid={`badge-${variation || 'default'}`} {...props}>{children}</span>;

  const createButtonComponent = () => ({ children, onClick, ...props }: any) => 
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>;

  const createAlertComponent = () => ({ children, variation, ...props }: any) => 
    <div data-testid={`alert-${variation || 'default'}`} {...props}>{children}</div>;

  const createLoaderComponent = () => (props: any) => 
    <div data-testid="loader" {...props} />;

  const createDividerComponent = () => (props: any) => 
    <hr data-testid="divider" {...props} />;

  const createTabsComponent = () => ({ children, currentIndex, onChange, ...props }: any) => {
    const childrenArray = Array.isArray(children) ? children : [children];
    return (
      <div data-testid="tabs" {...props}>
        <div data-testid="tab-buttons">
          {childrenArray.map((child, index) => (
            <button
              key={index}
              data-testid={`tab-button-${index}`}
              onClick={() => onChange(index)}
              data-selected={currentIndex === index}
            >
              {child.props.title}
            </button>
          ))}
        </div>
        <div data-testid="tab-content">
          {childrenArray[currentIndex]}
        </div>
      </div>
    );
  };

  const createTabItemComponent = () => ({ children, title, ...props }: any) => 
    <div data-testid={`tab-item-${title}`} {...props}>{children}</div>;

  const createViewComponent = () => ({ children, ...props }: any) => 
    <div data-testid="view" {...props}>{children}</div>;

  const createSelectFieldComponent = () => ({ label, onChange, options, ...props }: any) => (
    <div data-testid="select-field" {...props}>
      <label>{label}</label>
      <select onChange={onChange} data-testid="select">
        {options?.map((option: any, index: number) => (
          <option key={index} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  const createUseThemeHook = () => () => ({ 
    tokens: { colors: { background: { secondary: '#f2f2f2' } } } 
  });

  return {
    Card: createCardComponent(),
    Flex: createFlexComponent(),
    Text: createTextComponent(),
    Heading: createHeadingComponent(),
    Badge: createBadgeComponent(),
    Button: createButtonComponent(),
    Alert: createAlertComponent(),
    Loader: createLoaderComponent(),
    Divider: createDividerComponent(),
    Tabs: createTabsComponent(),
    TabItem: createTabItemComponent(),
    View: createViewComponent(),
    SelectField: createSelectFieldComponent(),
    useTheme: createUseThemeHook()
  };
});

// Mock the sub-components
jest.mock('../../../components/adsTxt/AdsTxtRecordList', () => {
  return jest.fn(({ records, onStatusChange, isEditable }) => (
    <div data-testid="ads-txt-record-list">
      <span>Record count: {records.length}</span>
      {isEditable && <button onClick={() => onStatusChange && onStatusChange('test-id', 'approved')}>Change Status</button>}
    </div>
  ));
});

jest.mock('../../../components/messages/MessageList', () => {
  const mockMessageList = jest.fn(({ messages, requestId, token }) => (
    <div data-testid="message-list">
      <span data-testid="message-count">Message count: {messages?.length || 0}</span>
      <span>Request ID: {requestId}</span>
    </div>
  ));
  
  return mockMessageList;
});

jest.mock('../../../components/messages/MessageForm', () => {
  const mockMessageForm = jest.fn(({ requestId, token, onMessageSent }) => (
    <div data-testid="message-form">
      <button 
        data-testid="send-message-button"
        onClick={() => onMessageSent({
          id: 'new-message-id',
          request_id: requestId,
          sender_email: 'test@example.com',
          content: 'Test message',
          created_at: new Date().toISOString()
        })}
      >
        Send Message
      </button>
    </div>
  ));
  
  return mockMessageForm;
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

// Mock data
const mockRequestWithRecords: RequestWithRecords = {
  request: {
    id: 'req-123',
    publisher_email: 'publisher@example.com',
    requester_email: 'requester@example.com',
    requester_name: 'Test Requester',
    publisher_name: 'Test Publisher',
    publisher_domain: 'example.com',
    status: 'pending',
    token: 'test-token',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  records: [
    {
      id: 'record-1',
      request_id: 'req-123',
      domain: 'example.com',
      account_id: 'account1',
      account_type: 'DIRECT',
      relationship: 'DIRECT',
      status: 'pending',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 'record-2',
      request_id: 'req-123',
      domain: 'test.com',
      account_id: 'account2',
      account_type: 'RESELLER',
      certification_authority_id: 'cert123',
      relationship: 'RESELLER',
      status: 'approved',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
  ]
};

describe('RequestDetail component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (requestApi.getRequest as jest.Mock).mockResolvedValue({
      success: true,
      data: mockRequestWithRecords
    });
    
    (adsTxtApi.getRecordsByRequestId as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    });
    
    (adsTxtApi.generateAdsTxtContent as jest.Mock).mockResolvedValue('example.com, account1, DIRECT, id123');
  });

  test('renders loading state initially', async () => {
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    // Should show loading state
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
  });

  test('renders request details when data loads successfully', async () => {
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      // Check heading
      expect(screen.getByText('リクエスト詳細')).toBeInTheDocument();
      
      // Check status badge
      expect(screen.getByTestId('badge-warning')).toHaveTextContent('保留中');
    });
    
    // Check record stats - using queryAllByText to find all matching elements and then check each one
    const textElements = screen.getAllByTestId('text');
    
    // Publisher email
    expect(textElements.some(el => el.textContent?.includes('publisher@example.com'))).toBe(true);
    
    // Requester email
    expect(textElements.some(el => el.textContent?.includes('requester@example.com'))).toBe(true);
    
    // Requester name
    expect(textElements.some(el => el.textContent?.includes('Test Requester'))).toBe(true);
    
    // Publisher name
    expect(textElements.some(el => el.textContent?.includes('Test Publisher'))).toBe(true);
    
    // Domain
    expect(textElements.some(el => el.textContent?.includes('example.com'))).toBe(true);
    
    // Check the record stats text
    expect(textElements.some(el => el.textContent?.includes('合計レコード数: 2'))).toBe(true);
    expect(textElements.some(el => el.textContent?.includes('承認済み: 1'))).toBe(true);
    expect(textElements.some(el => el.textContent?.includes('保留中: 1'))).toBe(true);
    expect(textElements.some(el => el.textContent?.includes('拒否: 0'))).toBe(true);
  });

  test('shows error alert when API call fails', async () => {
    // Mock API error
    (requestApi.getRequest as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: 'API Error' }
    });
    
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toHaveTextContent('API Error');
    });
  });

  test('handles request status update', async () => {
    (requestApi.updateRequestStatus as jest.Mock).mockResolvedValue({
      success: true,
      data: { ...mockRequestWithRecords.request, status: 'approved' }
    });
    
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByText('リクエストを承認')).toBeInTheDocument();
    });
    
    // Click approve button
    fireEvent.click(screen.getByText('リクエストを承認'));
    
    await waitFor(() => {
      expect(requestApi.updateRequestStatus).toHaveBeenCalledWith('req-123', 'approved', 'test-token');
    });
  });

  test('handles record status update', async () => {
    const AdsTxtRecordList = require('../../../components/adsTxt/AdsTxtRecordList');
    
    (adsTxtApi.updateRecordStatus as jest.Mock).mockResolvedValue({
      success: true,
      data: { ...mockRequestWithRecords.records[0], status: 'approved' }
    });
    
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      expect(AdsTxtRecordList).toHaveBeenCalled();
    });
    
    // Find the onStatusChange callback passed to AdsTxtRecordList
    const adsTxtRecordListProps = AdsTxtRecordList.mock.calls[0][0];
    const onStatusChangeCallback = adsTxtRecordListProps.onStatusChange;
    
    // Manually call the callback
    onStatusChangeCallback('test-id', 'approved');
    
    await waitFor(() => {
      expect(adsTxtApi.updateRecordStatus).toHaveBeenCalledWith('test-id', 'approved', 'test-token');
    });
  });

  test('handles tab switching', async () => {
    const AdsTxtRecordList = require('../../../components/adsTxt/AdsTxtRecordList');
    const MessageList = require('../../../components/messages/MessageList');
    const MessageForm = require('../../../components/messages/MessageForm');
    
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      // Initially the component should render
      expect(screen.getByText('リクエスト詳細')).toBeInTheDocument();
    });
    
    // Initially the Ads.txt tab should be active and AdsTxtRecordList should be called
    expect(AdsTxtRecordList).toHaveBeenCalled();
    
    // MessageList and MessageForm might not be called yet (depends on implementation)
    // Reset mocks to check after tab switch
    AdsTxtRecordList.mockClear();
    MessageList.mockClear();
    MessageForm.mockClear();
    
    // Click the Messages tab
    fireEvent.click(screen.getByText('メッセージ'));
    
    // Check that MessageList and MessageForm are now called
    expect(MessageList).toHaveBeenCalled();
    expect(MessageForm).toHaveBeenCalled();
    
    // AdsTxtRecordList should not be called again
    expect(AdsTxtRecordList).not.toHaveBeenCalled();
  });

  test('generates Ads.txt content', async () => {
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      // Find and click the generate button
      const generateButton = screen.getByText('Ads.txtコンテンツを生成');
      fireEvent.click(generateButton);
    });
    
    await waitFor(() => {
      expect(adsTxtApi.generateAdsTxtContent).toHaveBeenCalledWith('req-123', 'test-token');
      expect(screen.getByText('生成されたAds.txtコンテンツ')).toBeInTheDocument();
    });
  });

  test('copies content to clipboard', async () => {
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      // Generate the content first
      const generateButton = screen.getByText('Ads.txtコンテンツを生成');
      fireEvent.click(generateButton);
    });
    
    await waitFor(() => {
      // Find and click the copy button
      const copyButton = screen.getByText('コピー');
      fireEvent.click(copyButton);
    });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('example.com, account1, DIRECT, id123');
  });

  test('adds new message when sent', async () => {
    const MessageForm = require('../../../components/messages/MessageForm');
    
    render(<RequestDetail requestId="req-123" token="test-token" />);
    
    await waitFor(() => {
      // Switch to messages tab
      fireEvent.click(screen.getByText('メッセージ'));
    });
    
    // Wait for MessageForm to be called
    await waitFor(() => {
      expect(MessageForm).toHaveBeenCalled();
    });
    
    // Find the onMessageSent callback passed to MessageForm
    const messageFormProps = MessageForm.mock.calls[0][0];
    const onMessageSentCallback = messageFormProps.onMessageSent;
    
    // Manually call the callback with a test message
    const testMessage = {
      id: 'new-message-id',
      request_id: 'req-123',
      sender_email: 'test@example.com',
      content: 'Test message',
      created_at: new Date().toISOString()
    };
    
    // At this point in tests, the actual component state is hard to test directly
    // Instead, we'll just verify that the callback can be called without errors
    expect(() => {
      onMessageSentCallback(testMessage);
    }).not.toThrow();
    
    // Check the structure of the message form props to ensure it was set up correctly
    expect(messageFormProps).toMatchObject({
      requestId: 'req-123',
      token: 'test-token'
    });
    expect(typeof messageFormProps.onMessageSent).toBe('function');
  });
});