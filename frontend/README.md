# Ads.txt Manager Frontend

This is the frontend for the Ads.txt Manager application, providing a user interface for publishers and advertisers to manage Ads.txt requests.

## Technology Stack

- **React**: A JavaScript library for building user interfaces
- **TypeScript**: Typed JavaScript for improved development experience
- **AWS Amplify UI**: Component library for consistent design
- **React Router**: For navigation and routing
- **Axios**: For API requests

## Features

- Create new Ads.txt update requests
- Upload Ads.txt files for processing
- View and manage existing requests
- Real-time messaging between publishers and requesters
- Approve or reject Ads.txt records individually
- Download generated Ads.txt content

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Building for Production

1. Build the production version:
   ```
   npm run build
   ```

2. The build artifacts will be stored in the `build/` directory.

## Project Structure

- `src/api/`: API client for backend communication
- `src/components/`: Reusable React components
- `src/hooks/`: Custom React hooks
- `src/models/`: TypeScript interfaces and types
- `src/pages/`: Page components for each route
- `src/styles/`: Global styles and theme configuration
- `src/utils/`: Utility functions

## Backend Connection

This frontend is configured to work with the Ads.txt Manager backend. Make sure the backend server is running on port 4000 (or update the proxy in `package.json` if using a different port).

## Browser Support

This application supports modern browsers including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Acknowledgements

This project uses the AWS Amplify UI component library for the user interface.