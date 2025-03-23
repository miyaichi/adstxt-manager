import React, { useState } from 'react';
import { Flex, Heading, Text, Divider, SearchField, Pagination } from '@aws-amplify/ui-react';
import AdsTxtRecordItem from './AdsTxtRecordItem';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';

interface AdsTxtRecordListProps {
  records: (AdsTxtRecord | (ParsedAdsTxtRecord & { id: string; status: string }))[];
  showValidation?: boolean;
  onStatusChange?: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  isEditable?: boolean;
  title?: string;
}

const AdsTxtRecordList: React.FC<AdsTxtRecordListProps> = ({
  records,
  showValidation = false,
  onStatusChange,
  isEditable = false,
  title = 'Ads.txtレコード',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Filter records based on search query
  const filteredRecords = records.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.domain.toLowerCase().includes(query) ||
      record.account_id.toLowerCase().includes(query) ||
      record.account_type.toLowerCase().includes(query) ||
      (record.certification_authority_id &&
        record.certification_authority_id.toLowerCase().includes(query)) ||
      record.relationship.toLowerCase().includes(query)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <Flex direction="column" gap="1rem">
      <Heading level={3}>{title}</Heading>
      <Divider />

      {records.length === 0 ? (
        <Text>レコードがありません</Text>
      ) : (
        <>
          <SearchField
            label="レコードを検索"
            placeholder="ドメインやアカウントIDを入力"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            marginBottom="1rem"
          />

          {filteredRecords.length === 0 ? (
            <Text>検索条件に一致するレコードはありません</Text>
          ) : (
            <>
              <Text>合計 {filteredRecords.length} 件のレコード</Text>

              {currentRecords.map((record) => (
                <AdsTxtRecordItem
                  key={record.id}
                  record={record}
                  showValidation={showValidation}
                  onStatusChange={onStatusChange}
                  isEditable={isEditable}
                />
              ))}

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  onChange={(newPage) => setCurrentPage(newPage || 1)}
                />
              )}
            </>
          )}
        </>
      )}
    </Flex>
  );
};

export default AdsTxtRecordList;
