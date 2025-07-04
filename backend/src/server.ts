import http from 'http';
import app from './app';
import config from './config/config';
import { logger } from './utils/logger';

const PORT = config.server.port;

// Create server with explicit timeout
const server = http.createServer(app);

// Set server timeout to 5 minutes (300000 ms)
// This should match or exceed the ELB idle timeout
server.timeout = 300000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} with timeout: ${server.timeout}ms`);
});
