# Ads.txt Manager Frontend

This is the frontend for the Ads.txt Manager application, providing a user interface for publishers and advertisers to manage Ads.txt and Sellers.json data.

## Technology Stack

- **React**: A JavaScript library for building user interfaces
- **TypeScript**: Typed JavaScript for improved development experience
- **AWS Amplify UI**: Component library for consistent design
- **React Router**: For navigation and routing
- **Axios**: For API requests
- **i18next**: For internationalization

## Features

- Create new Ads.txt update requests
- Upload and validate Ads.txt records for processing
- View and manage existing requests
- Real-time messaging between publishers and requesters
- Approve or reject Ads.txt records individually
- Cross-check Ads.txt records against publisher domains
- Download generated Ads.txt content
- Query cached Sellers.json data for verification
- Multi-language support (English and Japanese)

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Quick Setup

Run the setup script to install dependencies and prepare the environment:

```bash
# Make the setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

### Manual Installation

1. Install dependencies:

   ```
   npm install
   ```

2. Start the development server:

   ```
   npm start
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Testing

Run tests with:

```
npm test
```

Generate test coverage report:

```
npm run test:coverage
```

## Building for Production

1. Build the production version:

   ```
   npm run build
   ```

2. The build artifacts will be stored in the `build/` directory.

## Project Structure

- `src/api/`: API client for backend communication
- `src/components/`: Reusable React components
- `src/context/`: React context providers
- `src/hooks/`: Custom React hooks
- `src/i18n/`: Internationalization configuration and translations
- `src/models/`: TypeScript interfaces and types
- `src/pages/`: Page components for each route
- `src/styles/`: Global styles and theme configuration
- `src/utils/`: Utility functions

## Backend Connection

This frontend is configured to work with the Ads.txt Manager backend. Make sure the backend server is running on port 3001 (or update the proxy in `package.json` if using a different port).

## License

MIT

## Acknowledgements

This project uses the AWS Amplify UI component library for the user interface.
