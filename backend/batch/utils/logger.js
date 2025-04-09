const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists - try multiple possible locations
let logsDir;
const possibleLogDirs = [
  '/app/logs',                         // Docker container default
  path.join(__dirname, '../../logs'),  // Relative to utils directory in development
  path.join(process.cwd(), 'logs'),    // Current working directory
  '/tmp/logs'                          // Fallback to /tmp which is usually writable
];

// Try to find or create a writable logs directory
for (const dir of possibleLogDirs) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Test write access by creating and removing a test file
    const testFile = path.join(dir, '.test-write-access');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    // If we made it here, we have write access
    logsDir = dir;
    console.log(`Using logs directory: ${logsDir}`);
    break;
  } catch (err) {
    console.log(`Cannot use logs directory ${dir}: ${err.message}`);
    // Continue to next option
  }
}

// If no writable directory was found, disable file logging
if (!logsDir) {
  console.warn('WARNING: No writable logs directory found, file logging will be disabled');
  logsDir = '.'; // Set to something to avoid undefined errors
}

// Create a custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create a custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create logger with appropriate transports
const transports = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: consoleFormat,
  })
];

// Only add file transports if we found a writable directory
if (logsDir && logsDir !== '.') {
  // File transport for all logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'batch.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // File transport for error logs
  transports.push(
    new winston.transports.File({
      level: 'error',
      filename: path.join(logsDir, 'batch-error.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
} else {
  console.log('File logging disabled due to permission issues');
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'adstxt-batch' },
  transports,
  exitOnError: false,
});

module.exports = logger;
