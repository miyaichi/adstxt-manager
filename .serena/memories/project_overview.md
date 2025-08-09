# Ads.txt Manager Project Overview

## Purpose
Ads.txt Manager is a web application that simplifies the ads.txt update process between publishers and advertising services/agencies. It replaces traditional email-based requests with a secure web-based workflow.

## Tech Stack
- **Frontend**: React, Amplify UI, TypeScript
- **Backend**: Node.js, Express, TypeScript  
- **Databases**: SQLite (development/test), PostgreSQL (production)
- **Email**: SMTP (Nodemailer)
- **Automation**: cron (sellers.json auto-updates)
- **Development**: Claude Code (vibe coding)
- **Package Management**: npm workspaces

## Key Features
- Secure request management with SHA256 hash-based unique URLs
- Ads.txt data validation and integrity checking
- Interactive messaging between publishers and requesters
- Ads.txt optimization (deduplication, format standardization, Certification ID completion)
- Site analysis using OpenSincera API
- Sellers.json integration with PostgreSQL JSONB optimization

## Database Architecture
The project supports both SQLite and PostgreSQL with a unified adapter pattern:

### Tables
- `requests`: Request information, emails, tokens, publisher info
- `messages`: Request-related messages
- `ads_txt_records`: Current ads.txt content
- `ads_txt_cache`: External ads.txt file cache
- `sellers_json_cache`: sellers.json file cache (heavily uses PostgreSQL JSONB features)

### Database Providers
- SQLite: Used for development/testing (simpler setup)
- PostgreSQL: Used for production (advanced JSONB features for sellers.json)

## PostgreSQL-Specific Features
The project heavily leverages PostgreSQL's JSONB capabilities for sellers.json processing:
- `queryJsonBSellerById`: Complex JSONB operations for finding specific sellers
- `queryJsonBSummary`: JSONB aggregation for statistics
- `queryJsonBBatchSellers`: Batch lookup with JSONB array processing  
- `queryJsonBSpecificSellers`: Efficient JSONB array filtering

These operations provide significant performance benefits for large sellers.json files.

## Project Structure
```
adstxt-manager/
├── frontend/          # React frontend
├── backend/           # Node.js/Express backend
├── packages/          # Shared packages
│   └── ads-txt-validator/  # NPM package for ads.txt validation
└── scripts/           # Utility scripts
```