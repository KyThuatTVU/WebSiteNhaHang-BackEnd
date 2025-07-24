// Enhanced Error Handling Middleware
const logger = require('../utils/logger');
const { errorResponse, ERROR_CODES, HTTP_STATUS } = require('../utils/responseFormatter');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle specific database errors
const handleDatabaseError = (err) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return new AppError('Dữ liệu đã tồn tại', 409, 'DUPLICATE_ENTRY');
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError('Dữ liệu tham chiếu không tồn tại', 400, 'FOREIGN_KEY_CONSTRAINT');
  }
  
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('Không thể xóa do có dữ liệu liên quan', 400, 'REFERENCED_ROW');
  }
  
  if (err.code === 'ECONNREFUSED') {
    return new AppError('Không thể kết nối cơ sở dữ liệu', 500, 'DB_CONNECTION_ERROR');
  }
  
  return new AppError('Lỗi cơ sở dữ liệu', 500, 'DATABASE_ERROR');
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Token không hợp lệ', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new AppError('Token đã hết hạn', 401, 'EXPIRED_TOKEN');
};

// Send error response in development
const sendErrorDev = (err, req, res) => {
  // Enhanced error logging for development
  console.error('🚨 Development Error Details:');
  console.error('📍 URL:', req.method, req.originalUrl);
  console.error('📝 Message:', err.message);
  console.error('🏷️ Name:', err.name);
  console.error('🔢 Code:', err.code);
  console.error('📊 Status:', err.statusCode);
  console.error('📋 Stack:', err.stack);

  if (err.sql) {
    console.error('🗄️ SQL:', err.sql);
  }

  if (err.sqlMessage) {
    console.error('💬 SQL Message:', err.sqlMessage);
  }

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err.message,
    code: err.code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
    details: {
      name: err.name,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    }
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      code: err.code
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Đã xảy ra lỗi hệ thống',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.code && error.code.startsWith('ER_')) {
      error = handleDatabaseError(error);
    }
    
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(`Không tìm thấy ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(err);
};

// Unhandled rejection handler
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', err);
    // Close server & exit process
    process.exit(1);
  });
};

// Uncaught exception handler
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown:', err);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException
};
