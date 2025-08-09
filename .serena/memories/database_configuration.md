# Database Configuration

## Current Database Setup

The project uses a database adapter pattern that supports multiple database providers:

### Supported Providers
- **SQLite**: For development and testing
- **PostgreSQL**: For production (with advanced JSONB features)
- **Mock**: For unit testing

### Configuration Logic
- Environment `NODE_ENV=test` → Mock Database
- Environment `DB_PROVIDER=postgres` → PostgreSQL
- Default → SQLite

### PostgreSQL JSONB Features
The PostgreSQL implementation includes several optimized methods for sellers.json processing:

1. **queryJsonBSellerById**: Find specific seller using JSONB path operations
2. **queryJsonBSummary**: Get seller statistics using JSONB aggregation
3. **queryJsonBBatchSellers**: Batch seller lookup with LATERAL JOINs
4. **queryJsonBSpecificSellers**: Efficient seller filtering by account IDs

These methods use advanced SQL features:
- JSONB path expressions (`->>`, `->`, `jsonb_extract_path_text`)
- LATERAL JOINs for efficient array processing
- Statement timeout management for large JSON files
- Connection pooling optimizations

### Development Environment
- Docker Compose sets up PostgreSQL for local development
- `DB_PROVIDER=postgres` in docker-compose.yml
- SQLite as fallback for simple local development

### Test Environment
- Uses Mock Database implementation
- Test setup mocks the database configuration
- Test isolation with data clearing between tests