# Ads.txt Manager Backend

This is the backend server for the Ads.txt Manager application, handling request management, email notifications, ads.txt validation, and data processing.

## Technology Stack

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe JavaScript
- **SQLite**: Default database
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

For production mode:

```
npm run build
npm start
```

### Database Configuration

The application uses a database abstraction layer with the following features:

- **SQLite**: Default database for development and production
- **PostgreSQL**: Optional database for production environments requiring more scalability
- **Mock Database**: In-memory database for testing

The database provider is automatically selected based on the environment:

- `NODE_ENV=development` or `NODE_ENV=production`: 
  - Uses SQLite by default
  - Uses PostgreSQL if `DB_PROVIDER=postgres` is set in the environment
- `NODE_ENV=test`: Uses the Mock Database

#### PostgreSQL Configuration

To use PostgreSQL instead of SQLite:

1. Create a PostgreSQL database:
   ```bash
   # PostgreSQLにログイン
   psql -U postgres

   # データベースを作成
   CREATE DATABASE adstxt_manager;
   ```

2. Configure the environment variables in your `.env` file:
   ```
   DB_PROVIDER=postgres
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=adstxt_manager
   PGUSER=postgres
   PGPASSWORD=yourpassword
   PG_MAX_POOL_SIZE=10
   ```

3. Initialize the PostgreSQL database structure:
   ```bash
   npm run migrate:pg
   ```

4. Optionally migrate existing data from SQLite to PostgreSQL:
   ```bash
   # Interactive mode (will ask for confirmation)
   npm run migrate:pg
   
   # Force migration without confirmation
   npm run migrate:pg:force
   ```

5. Start the application - it will automatically use PostgreSQL.

This design allows for flexible switching between database providers without code changes.

## Using Docker Compose

The project includes a Docker Compose configuration for easy setup:

```
docker-compose up -d
```

This will start:

- The backend server on port 3001
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

## Database Architecture

The application uses a flexible database abstraction:

1. **Interface-Based Design**:

   - All database operations are defined in the `IDatabaseAdapter` interface
   - Database implementations can be swapped without changing application code

2. **Available Providers**:

   - `SqliteDatabase`: Persistent file-based storage for simpler deployments
   - `PostgresDatabase`: PostgreSQL integration for increased scalability
   - `MockDatabase`: In-memory storage for testing

3. **Adding New Providers**:
   - Implement the `IDatabaseAdapter` interface
   - Update the factory in `src/config/database/index.ts` to use your implementation

This architecture supports easy migration between different database systems without significant code changes. You can switch database providers by simply changing the `DB_PROVIDER` environment variable.

## Sellers.json Data Management

The application includes a utility script to fetch and cache sellers.json data from advertising domains. This data is used for validation and verification of ads.txt entries.

### Using the fetch-sellers-json.js Script

This script fetches sellers.json data for specified domains, saves it to the database, and also creates local copies in the `data/sellers_json/` directory.

#### Basic Usage

```bash
# Fetch data for the default domains
node fetch-sellers-json.js

# Fetch data for specific domains
node fetch-sellers-json.js google.com rubiconproject.com
```

#### Advanced Options

```bash
# Update all domains currently cached in the database
node fetch-sellers-json.js --update-cached

# Force update even if cache is fresh (less than 24 hours old)
node fetch-sellers-json.js --force

# Combine options
node fetch-sellers-json.js google.com openx.com --update-cached --force
```

#### Setting Up as a Cron Job

For production environments, it's recommended to set up a cron job to keep the sellers.json data fresh:

```bash
# Example crontab entry to run daily at 3 AM
0 3 * * * cd /path/to/app/backend && node fetch-sellers-json.js --update-cached
```

This helps ensure that validation against sellers.json data is using relatively recent information.
