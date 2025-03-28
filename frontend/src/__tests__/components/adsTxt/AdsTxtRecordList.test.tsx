// React is used implicitly by JSX
import { render, screen, fireEvent } from '@testing-library/react';
import AdsTxtRecordList from '../../../components/adsTxt/AdsTxtRecordList';
import { AdsTxtRecord } from '../../../models';

// Mock the AWS Amplify UI components
jest.mock('@aws-amplify/ui-react', () => {
  const createFlexComponent =
    () =>
    ({ children, ...props }: any) => (
      <div data-testid="flex" {...props}>
        {children}
      </div>
    );

  const createHeadingComponent =
    () =>
    ({ children, level, ...props }: any) => {
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag data-testid="heading" {...props}>
          {children}
        </HeadingTag>
      );
    };

  const createTextComponent =
    () =>
    ({ children, ...props }: any) => (
      <p data-testid="text" {...props}>
        {children}
      </p>
    );

  const createDividerComponent = () => (props: any) => <hr data-testid="divider" {...props} />;

  const createSearchFieldComponent =
    () =>
    ({ label, onChange, value, ...props }: any) => (
      <div data-testid="search-field" {...props}>
        <label>{label}</label>
        <input type="text" data-testid="search-input" value={value} onChange={onChange} />
      </div>
    );

  const createPaginationComponent =
    () =>
    ({ currentPage, totalPages, onChange, onNext, onPrevious, ...props }: any) => (
      <div data-testid="pagination" {...props}>
        <button data-testid="prev-button" onClick={onPrevious}>
          Previous
        </button>
        <span data-testid="current-page">{currentPage}</span>
        <button data-testid="next-button" onClick={onNext}>
          Next
        </button>
      </div>
    );

  return {
    Flex: createFlexComponent(),
    Heading: createHeadingComponent(),
    Text: createTextComponent(),
    Divider: createDividerComponent(),
    SearchField: createSearchFieldComponent(),
    Pagination: createPaginationComponent(),
  };
});

// Mock the AdsTxtRecordItem component
jest.mock('../../../components/adsTxt/AdsTxtRecordItem', () => {
  return jest.fn(({ record }) => (
    <div data-testid="record-item" data-record-id={record.id}>
      {record.domain}
    </div>
  ));
});

// Mock records for testing
const mockRecords: AdsTxtRecord[] = [
  {
    id: 'record-1',
    request_id: 'req-1',
    domain: 'example.com',
    account_id: 'account1',
    account_type: 'DIRECT',
    relationship: 'DIRECT',
    status: 'pending',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'record-2',
    request_id: 'req-1',
    domain: 'test.com',
    account_id: 'account2',
    account_type: 'RESELLER',
    certification_authority_id: 'cert123',
    relationship: 'RESELLER',
    status: 'approved',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'record-3',
    request_id: 'req-1',
    domain: 'another.com',
    account_id: 'account3',
    account_type: 'PARTNER',
    relationship: 'DIRECT',
    status: 'rejected',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

// Generate 15 more records for pagination testing
for (let i = 4; i <= 18; i++) {
  mockRecords.push({
    id: `record-${i}`,
    request_id: 'req-1',
    domain: `domain${i}.com`,
    account_id: `account${i}`,
    account_type: 'DIRECT',
    relationship: 'DIRECT',
    status: 'pending',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  });
}

const mockOnStatusChange = jest.fn();

describe('AdsTxtRecordList component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders title and "no records" message when records array is empty', () => {
    render(<AdsTxtRecordList records={[]} />);

    const heading = screen.getByTestId('heading');
    expect(heading).toHaveTextContent('Ads.txtレコード');

    const noRecordsText = screen.getByText('レコードがありません');
    expect(noRecordsText).toBeInTheDocument();
  });

  test('renders records and displays correct total count', () => {
    const AdsTxtRecordItem = require('../../../components/adsTxt/AdsTxtRecordItem');
    render(<AdsTxtRecordList records={mockRecords.slice(0, 3)} />);

    // Check that AdsTxtRecordItem was called for each record
    expect(AdsTxtRecordItem).toHaveBeenCalledTimes(3);

    const totalCount = screen.getByText('合計 3 件のレコード');
    expect(totalCount).toBeInTheDocument();
  });

  test('filters records based on search query', () => {
    const AdsTxtRecordItem = require('../../../components/adsTxt/AdsTxtRecordItem');
    render(<AdsTxtRecordList records={mockRecords.slice(0, 3)} />);

    // Initial state should show all 3 records
    expect(AdsTxtRecordItem).toHaveBeenCalledTimes(3);

    // Reset mock to check filtered results
    AdsTxtRecordItem.mockClear();

    // Type search query that should match only one record
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test.com' } });

    // Should only show one record now
    expect(AdsTxtRecordItem).toHaveBeenCalledTimes(1);

    // Check that the correct record was displayed (record-2 has test.com as domain)
    expect(AdsTxtRecordItem).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          id: 'record-2',
          domain: 'test.com',
        }),
      }),
      expect.anything()
    );

    // Should show updated count
    expect(screen.getByText('合計 1 件のレコード')).toBeInTheDocument();
  });

  test('shows "no matching records" message when search has no results', () => {
    render(<AdsTxtRecordList records={mockRecords.slice(0, 3)} />);

    // Search for something that doesn't exist
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    // Should show no records message
    expect(screen.getByText('検索条件に一致するレコードはありません')).toBeInTheDocument();
  });

  test('paginates records correctly', () => {
    const AdsTxtRecordItem = require('../../../components/adsTxt/AdsTxtRecordItem');

    // Use all mock records for pagination testing
    render(<AdsTxtRecordList records={mockRecords} />);

    // Verify AdsTxtRecordItem was called for the first page records
    expect(AdsTxtRecordItem).toHaveBeenCalledTimes(10);

    // Pagination control should be visible
    const pagination = screen.getByTestId('pagination');
    expect(pagination).toBeInTheDocument();

    // Current page should be 1
    const currentPage = screen.getByTestId('current-page');
    expect(currentPage).toHaveTextContent('1');

    // Reset mock to check second page
    AdsTxtRecordItem.mockClear();

    // Click next page
    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Current page should now be 2
    expect(currentPage).toHaveTextContent('2');

    // Should now show the remaining records (8 more)
    expect(AdsTxtRecordItem).toHaveBeenCalledTimes(8);
  });

  test('custom title is displayed when provided', () => {
    render(<AdsTxtRecordList records={mockRecords.slice(0, 3)} title="Custom Title" />);

    const heading = screen.getByTestId('heading');
    expect(heading).toHaveTextContent('Custom Title');
  });

  test('passes correct props to AdsTxtRecordItem components', () => {
    const AdsTxtRecordItem = require('../../../components/adsTxt/AdsTxtRecordItem');
    render(
      <AdsTxtRecordList
        records={mockRecords.slice(0, 1)}
        showValidation={true}
        onStatusChange={mockOnStatusChange}
        isEditable={true}
      />
    );

    // Check that AdsTxtRecordItem was called with the right props
    expect(AdsTxtRecordItem).toHaveBeenCalledWith(
      expect.objectContaining({
        record: mockRecords[0],
        showValidation: true,
        onStatusChange: mockOnStatusChange,
        isEditable: true,
      }),
      expect.anything()
    );
  });
});
