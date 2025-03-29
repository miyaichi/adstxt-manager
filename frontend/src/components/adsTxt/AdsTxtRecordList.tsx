import React, { useState } from 'react';
import { Flex, Heading, Text, Divider, SearchField, Pagination } from '@aws-amplify/ui-react';
import AdsTxtRecordItem from './AdsTxtRecordItem';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';
import { useApp } from '../../context/AppContext';
import { t } from '../../i18n/translations';

interface AdsTxtRecordListProps {
  records: (AdsTxtRecord | (ParsedAdsTxtRecord & { id: string; status: string }))[];
  showValidation?: boolean;
  onStatusChange?: ((id: string, status: 'pending' | 'approved' | 'rejected') => void) | undefined;
  isEditable?: boolean;
  title?: string;
}

const AdsTxtRecordList: React.FC<AdsTxtRecordListProps> = ({
  records,
  showValidation = false,
  onStatusChange,
  isEditable = false,
  title,
}) => {
  const { language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const defaultTitle = t('adsTxt.recordList.title', language);

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
      <Heading level={3}>{title || defaultTitle}</Heading>
      <Divider />

      {records.length === 0 ? (
        <Text>{t('adsTxt.recordList.noRecords', language)}</Text>
      ) : (
        <>
          <SearchField
            label={t('adsTxt.recordList.searchLabel', language)}
            placeholder={t('adsTxt.recordList.searchPlaceholder', language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            marginBottom="1rem"
          />

          {filteredRecords.length === 0 ? (
            <Text>{t('adsTxt.recordList.noMatchingRecords', language)}</Text>
          ) : (
            <>
              <Text>
                {t('adsTxt.recordList.totalRecords', language, { count: filteredRecords.length })}
              </Text>

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
