import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Flex,
  Heading,
  Card,
  Button,
  Text,
  Alert,
  Loader,
  Breadcrumbs,
  Badge,
  Divider,
  TextField
} from '@aws-amplify/ui-react';
import { requestApi } from '../api';
import { Request } from '../models';
import RequestItem from '../components/requests/RequestItem';
import ErrorMessage from '../components/common/ErrorMessage';

const RequestListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role') as 'publisher' | 'requester' | null;
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (!email) return;
    
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await requestApi.getRequestsByEmail(email, role || undefined);
        
        if (response.success) {
          setRequests(response.data);
        } else {
          setError(response.error?.message || 'リクエストの取得中にエラーが発生しました');
        }
      } catch (err) {
        setError('リクエストの取得中にエラーが発生しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, [email, role]);
  
  if (!email) {
    return (
      <ErrorMessage 
        title="メールアドレスが指定されていません"
        message="リクエスト表示にはメールアドレスが必要です"
      />
    );
  }
  
  // Filter requests based on search query
  const filteredRequests = requests.filter(request => {
    const query = searchQuery.toLowerCase();
    return (
      request.id.toLowerCase().includes(query) ||
      request.publisher_email.toLowerCase().includes(query) ||
      request.requester_email.toLowerCase().includes(query) ||
      request.requester_name.toLowerCase().includes(query) ||
      (request.publisher_name && request.publisher_name.toLowerCase().includes(query)) ||
      (request.publisher_domain && request.publisher_domain.toLowerCase().includes(query)) ||
      request.status.toLowerCase().includes(query)
    );
  });
  
  // Group requests by status
  const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
  const approvedRequests = filteredRequests.filter(req => req.status === 'approved');
  const rejectedRequests = filteredRequests.filter(req => req.status === 'rejected');
  const updatedRequests = filteredRequests.filter(req => req.status === 'updated');
  
  return (
    <Flex direction="column" gap="1.5rem">
      <Breadcrumbs
        items={[
          { label: 'ホーム', href: '/' },
          { label: 'リクエスト一覧', isCurrent: true }
        ]}
      />
      
      <Card variation="outlined" padding="1.5rem">
        <Flex direction="column" gap="1.5rem">
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="1rem">
            <Heading level={2}>リクエスト一覧</Heading>
            <Flex gap="0.5rem" alignItems="center">
              <Text>メールアドレス: {email}</Text>
              {role && (
                <Badge variation="info">
                  {role === 'publisher' ? 'パブリッシャー' : 'リクエスター'}
                </Badge>
              )}
            </Flex>
          </Flex>
          
          {loading ? (
            <Flex justifyContent="center" padding="2rem">
              <Loader size="large" />
            </Flex>
          ) : error ? (
            <Alert variation="error">
              {error}
            </Alert>
          ) : (
            <Flex direction="column" gap="1.5rem">
              <TextField
                label="リクエスト検索"
                placeholder="検索内容を入力"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              
              {filteredRequests.length === 0 ? (
                <Alert variation="warning">
                  <Text>リクエストが見つかりませんでした</Text>
                  {searchQuery && <Text>検索条件を変更してください</Text>}
                </Alert>
              ) : (
                <>
                  <Flex justifyContent="flex-end" gap="0.5rem">
                    <Text>合計 {filteredRequests.length} 件のリクエスト</Text>
                  </Flex>
                  
                  {pendingRequests.length > 0 && (
                    <Flex direction="column" gap="1rem">
                      <Heading level={3}>
                        保留中 ({pendingRequests.length})
                      </Heading>
                      <Divider />
                      {pendingRequests.map(request => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}
                  
                  {updatedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        更新済み ({updatedRequests.length})
                      </Heading>
                      <Divider />
                      {updatedRequests.map(request => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}
                  
                  {approvedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        承認済み ({approvedRequests.length})
                      </Heading>
                      <Divider />
                      {approvedRequests.map(request => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}
                  
                  {rejectedRequests.length > 0 && (
                    <Flex direction="column" gap="1rem" marginTop="2rem">
                      <Heading level={3}>
                        却下 ({rejectedRequests.length})
                      </Heading>
                      <Divider />
                      {rejectedRequests.map(request => (
                        <RequestItem key={request.id} request={request} />
                      ))}
                    </Flex>
                  )}
                </>
              )}
            </Flex>
          )}
        </Flex>
      </Card>
    </Flex>
  );
};

export default RequestListPage;