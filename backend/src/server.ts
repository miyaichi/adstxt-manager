import http from 'http';
import app from './app';
import config from './config/config';

const PORT = config.server.port;

// Create server with explicit timeout
const server = http.createServer(app);

// Set server timeout to 5 minutes (300000 ms)
// This should match or exceed the ELB idle timeout
server.timeout = 300000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with timeout: ${server.timeout}ms`);
});
