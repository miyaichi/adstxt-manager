import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Flex,
  Heading,
  View,
  Text,
  Button,
  TextField,
  Alert,
  Divider,
} from '@aws-amplify/ui-react';
import { requestApi } from '../api';
import { useApp } from '../context/AppContext';

const HomePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch requests for this email
      const response = await requestApi.getRequestsByEmail(email);

      if (response.success && response.data.length > 0) {
        // If requests exist, navigate to the request list
        navigate(`/requests?email=${encodeURIComponent(email)}`);
      } else {
        // No requests found, show message
        setError('このメールアドレスに関連するリクエストはありません');
      }
    } catch (err) {
      setError('リクエストの取得中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View padding={{ base: '1rem', medium: '2rem' }}>
      <Flex direction="column" alignItems="center" gap="2rem">
        <Heading level={1} textAlign="center">
          Ads.txt マネージャー
        </Heading>

        <Text textAlign="center" maxWidth="800px">
          Ads.txt
          Managerは、パブリッシャーと広告サービス・代理店間のAds.txt更新プロセスを簡素化するためのウェブアプリケーションです。
          メールによる面倒なやり取りなしにAds.txtの更新を簡単に管理できます。
        </Text>

        <Flex
          direction={{ base: 'column', medium: 'row' }}
          gap="2rem"
          width="100%"
          maxWidth="1000px"
          padding="1rem"
        >
          <Card variation="outlined" flex="1">
            <Heading level={3}>リクエストを作成</Heading>
            <Divider marginBlock="1rem" />
            <Text>
              広告サービスや代理店として、パブリッシャーにAds.txtファイルの更新をリクエストします。
              CSVファイルをアップロードするか、レコードを手動で入力するだけで簡単に申請できます。
            </Text>
            <Button as={Link} to="/new-request" variation="primary" width="100%" marginTop="1rem">
              新規リクエスト作成
            </Button>
          </Card>

          <Card variation="outlined" flex="1">
            <Heading level={3}>リクエストを確認</Heading>
            <Divider marginBlock="1rem" />
            <Text marginBottom="1rem">
              パブリッシャーまたはリクエスト作成者として、既存のリクエストのステータスを確認します。
              メールアドレスを入力して関連するすべてのリクエストを表示します。
            </Text>

            <form onSubmit={handleEmailSubmit}>
              <Flex direction="column" gap="0.5rem">
                <TextField
                  label="メールアドレス"
                  name="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
                {error && <Alert variation="error">{error}</Alert>}
                <Button type="submit" variation="primary" width="100%" isLoading={isLoading}>
                  リクエストを検索
                </Button>
              </Flex>
            </form>
          </Card>
        </Flex>
      </Flex>
    </View>
  );
};

export default HomePage;
