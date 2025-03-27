# Ads.txt Manager Backend

This is the backend server for the Ads.txt Manager application, handling request management, email notifications, ads.txt validation, and data processing.

## Technology Stack

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe JavaScript
- **SQLite**: Embedded database (開発環境)
- **AWS Amplify DataStore/DynamoDB**: クラウドデータベース (本番環境)
- **Nodemailer**: Email sending
- **MailHog**: Email testing service
- **Public Suffix List**: Domain validation

## Setup Instructions

### Quick Setup

Run the setup script to get everything up and running:

```bash
# Make the setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

### Manual Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file from the example:
   ```
   cp .env.example .env
   ```

3. Update the `.env` file with your configuration.

4. Build the TypeScript code:
   ```
   npm run build
   ```

5. Initialize the database:
   ```
   npm run migrate
   ```

6. (Optional) Seed the database with sample data:
   ```
   npm run seed
   ```

## Running the Server

### Development Mode

This will start the server with hot-reloading using SQLite:

```
npm run dev
```

### Production Mode

For local production mode using SQLite:

```
npm run build
npm start
```

### AWS Amplify (DynamoDB)

本番環境ではAWS AmplifyとDynamoDBを使用します。Amplify CLIを使用してデータモデルをデプロイする必要があります。

```bash
# Amplify CLIのインストール（初回のみ）
npm install -g @aws-amplify/cli

# プロジェクトのルートディレクトリ（adstxt-manager）に移動
cd ..

# Amplifyプロジェクトの初期化
amplify init

# APIの追加
amplify add api
```

API設定時に、GraphQL APIを選択し、スキーマとしてプロジェクトルートの `/amplify-schema.graphql` ファイルを使用してください。

設定が完了したら、以下のコマンドでバックエンドをデプロイします。

```bash
amplify push
```

## Using Docker Compose

The project includes a Docker Compose configuration for easy setup:

```
docker-compose up -d
```

This will start:
- The backend server on port 4000
- MailHog SMTP server on port 1025
- MailHog web interface on port 8025

## API Documentation

### Requests

- `POST /api/requests` - Create a new request
- `GET /api/requests/:id` - Get a request by ID (requires token)
- `PATCH /api/requests/:id/status` - Update request status
- `PATCH /api/requests/:id/publisher` - Update publisher information
- `GET /api/requests/email/:email` - Get requests by email

### Messages

- `POST /api/messages` - Create a new message
- `GET /api/messages/:requestId` - Get messages for a request

### Ads.txt Records

- `PATCH /api/adstxt/:id/status` - Update record status
- `POST /api/adstxt/process` - Process Ads.txt file
- `GET /api/adstxt/request/:requestId` - Get records for a request
- `GET /api/adstxt/generate/:requestId` - Generate Ads.txt content
- `GET /api/adstxt/check/:requestId` - Cross-check Ads.txt records with publisher domain

### Ads.txt Cache

- `GET /api/adstxt-cache/:domain` - Get cached Ads.txt for domain
- `POST /api/adstxt-cache/:domain` - Refresh cached Ads.txt for domain

### Sellers.json Cache

- `GET /api/sellers-json/:domain/:sellerId` - Get cached Sellers.json for domain and seller ID

## Email Testing

The application uses MailHog for testing emails in development. After starting the Docker Compose setup, you can access the MailHog web interface at [http://localhost:8025](http://localhost:8025) to view sent emails.

## Testing

```
npm test
```

For coverage report:

```
npm run test:coverage
```