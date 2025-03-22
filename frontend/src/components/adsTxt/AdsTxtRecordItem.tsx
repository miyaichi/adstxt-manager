import React from 'react';
import { 
  Flex, 
  Text, 
  Badge, 
  Button, 
  Card,
  Icon
} from '@aws-amplify/ui-react';
import { AdsTxtRecord, ParsedAdsTxtRecord } from '../../models';

interface AdsTxtRecordItemProps {
  record: AdsTxtRecord | (ParsedAdsTxtRecord & { id: string, status: string });
  showValidation?: boolean;
  onStatusChange?: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  isEditable?: boolean;
}

const AdsTxtRecordItem: React.FC<AdsTxtRecordItemProps> = ({
  record,
  showValidation = false,
  onStatusChange,
  isEditable = false
}) => {
  // Check if the record has error property (which means it's a ParsedAdsTxtRecord)
  const isParsedRecord = 'is_valid' in record;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variation="success">承認済み</Badge>;
      case 'rejected':
        return <Badge variation="error">却下</Badge>;
      case 'pending':
        return <Badge variation="warning">保留中</Badge>;
      default:
        return <Badge variation="info">{status}</Badge>;
    }
  };
  
  const handleApprove = () => {
    if (onStatusChange) {
      onStatusChange(record.id, 'approved');
    }
  };
  
  const handleReject = () => {
    if (onStatusChange) {
      onStatusChange(record.id, 'rejected');
    }
  };

  return (
    <Card variation="outlined" padding="1rem" marginBottom="0.5rem">
      <Flex direction="column" gap="0.5rem">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">{record.domain}</Text>
          {getStatusBadge(record.status)}
        </Flex>
        
        <Flex gap="1rem" wrap="wrap">
          <Text>
            <strong>アカウントID:</strong> {record.account_id}
          </Text>
          <Text>
            <strong>アカウントタイプ:</strong> {record.account_type}
          </Text>
          <Text>
            <strong>関係:</strong> {record.relationship}
          </Text>
          {record.certification_authority_id && (
            <Text>
              <strong>認証局ID:</strong> {record.certification_authority_id}
            </Text>
          )}
        </Flex>
        
        {isParsedRecord && showValidation && (
          <Flex gap="0.5rem" alignItems="center">
            {(record as ParsedAdsTxtRecord).is_valid ? (
              <Badge variation="success">有効</Badge>
            ) : (
              <Flex direction="column" width="100%">
                <Badge variation="error">無効</Badge>
                <Text color="red" fontSize="0.875rem">
                  {(record as ParsedAdsTxtRecord).error}
                </Text>
              </Flex>
            )}
          </Flex>
        )}
        
        {isEditable && (
          <Flex justifyContent="flex-end" gap="0.5rem" marginTop="0.5rem">
            {record.status !== 'approved' && (
              <Button
                size="small"
                variation="primary"
                onClick={handleApprove}
              >
                承認
              </Button>
            )}
            {record.status !== 'rejected' && (
              <Button
                size="small"
                variation="destructive"
                onClick={handleReject}
              >
                却下
              </Button>
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default AdsTxtRecordItem;