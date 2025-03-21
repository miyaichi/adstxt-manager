# Ads.txt Manager Backend

This is the backend server for the Ads.txt Manager application, handling request management, email notifications, and data processing.

## Technology Stack

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe JavaScript
- **SQLite**: Embedded database
- **Nodemailer**: Email sending
- **MailHog**: Email testing service

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

This will start the server with hot-reloading:

```
npm run dev
```

### Production Mode

```
npm run build
npm start
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

## Email Testing

The application uses MailHog for testing emails in development. After starting the Docker Compose setup, you can access the MailHog web interface at [http://localhost:8025](http://localhost:8025) to view sent emails.
