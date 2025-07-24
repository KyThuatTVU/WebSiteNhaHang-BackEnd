// Logger Utility
const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Create logger instance - only use console transport for serverless
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  defaultMeta: { service: 'restaurant-api' },
  transports: [
    // Only use console transport for serverless environments like Vercel
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
    })
  ],
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query logger
const logDatabaseQuery = (query, params = [], duration = null) => {
  logger.debug('Database query', {
    query: query.replace(/\s+/g, ' ').trim(),
    params,
    duration: duration ? `${duration}ms` : null,
    timestamp: new Date().toISOString()
  });
};

// API response logger
const logApiResponse = (req, res, data = null) => {
  logger.info('API response', {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    dataLength: data ? JSON.stringify(data).length : 0,
    timestamp: new Date().toISOString()
  });
};

// Error logger with context
const logError = (error, req = null, additionalInfo = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  };

  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      params: req.params,
      query: req.query
    };
  }

  logger.error('Application error', errorInfo);
};

module.exports = {
  logger,
  requestLogger,
  logDatabaseQuery,
  logApiResponse,
  logError
};
