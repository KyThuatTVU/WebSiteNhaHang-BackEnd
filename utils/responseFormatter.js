// Response Formatter Utility - Chuẩn hóa format response cho toàn bộ API
const logger = require('./logger');

/**
 * Chuẩn hóa response thành công
 * @param {Object} data - Dữ liệu trả về
 * @param {string} message - Thông báo
 * @param {Object} pagination - Thông tin phân trang
 * @param {Object} meta - Metadata bổ sung
 * @returns {Object} Formatted response
 */
const successResponse = (data = null, message = 'Success', pagination = null, meta = {}) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  // Chỉ thêm data nếu có
  if (data !== null) {
    response.data = data;
  }

  // Chỉ thêm pagination nếu có
  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

/**
 * Chuẩn hóa response lỗi
 * @param {string} message - Thông báo lỗi
 * @param {string} code - Mã lỗi
 * @param {Object} details - Chi tiết lỗi
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
const errorResponse = (message = 'Internal Server Error', code = 'INTERNAL_ERROR', details = null, statusCode = 500) => {
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // Chỉ thêm details nếu có và không phải production
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  // Log lỗi
  logger.error('API Error Response', {
    message,
    code,
    statusCode,
    details: details?.stack || details
  });

  return response;
};

/**
 * Chuẩn hóa response validation error
 * @param {Array} errors - Danh sách lỗi validation
 * @returns {Object} Formatted validation error response
 */
const validationErrorResponse = (errors = []) => {
  return {
    success: false,
    message: 'Dữ liệu không hợp lệ',
    code: 'VALIDATION_ERROR',
    errors: errors.map(err => ({
      field: err.path || err.param,
      message: err.msg || err.message,
      value: err.value,
      location: err.location
    })),
    timestamp: new Date().toISOString()
  };
};

/**
 * Tạo thông tin phân trang
 * @param {number} total - Tổng số records
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số items per page
 * @returns {Object} Pagination info
 */
const createPagination = (total, page = 1, limit = 20) => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * limit;

  return {
    total,
    page: currentPage,
    limit,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    offset
  };
};

/**
 * Middleware để wrap response
 */
const responseWrapper = (req, res, next) => {
  // Thêm helper methods vào res object
  res.success = (data, message, pagination, meta) => {
    return res.json(successResponse(data, message, pagination, meta));
  };

  res.error = (message, code, details, statusCode = 500) => {
    return res.status(statusCode).json(errorResponse(message, code, details, statusCode));
  };

  res.validationError = (errors) => {
    return res.status(400).json(validationErrorResponse(errors));
  };

  res.notFound = (message = 'Resource not found') => {
    return res.status(404).json(errorResponse(message, 'NOT_FOUND', null, 404));
  };

  res.unauthorized = (message = 'Unauthorized') => {
    return res.status(401).json(errorResponse(message, 'UNAUTHORIZED', null, 401));
  };

  res.forbidden = (message = 'Forbidden') => {
    return res.status(403).json(errorResponse(message, 'FORBIDDEN', null, 403));
  };

  res.conflict = (message = 'Resource already exists') => {
    return res.status(409).json(errorResponse(message, 'CONFLICT', null, 409));
  };

  next();
};

/**
 * Error codes mapping
 */
const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',

  // File Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_ERROR: 'UPLOAD_ERROR',

  // Business Logic
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  RESERVATION_CONFLICT: 'RESERVATION_CONFLICT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

/**
 * HTTP Status codes mapping
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Success messages mapping
 */
const SUCCESS_MESSAGES = {
  // CRUD Operations
  CREATED: 'Tạo thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xóa thành công',
  RETRIEVED: 'Lấy dữ liệu thành công',

  // Authentication
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  TOKEN_REFRESHED: 'Làm mới token thành công',

  // Business Operations
  RESERVATION_CREATED: 'Đặt bàn thành công',
  RESERVATION_CONFIRMED: 'Xác nhận đặt bàn thành công',
  ORDER_PLACED: 'Đặt hàng thành công',
  PAYMENT_SUCCESS: 'Thanh toán thành công'
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  createPagination,
  responseWrapper,
  ERROR_CODES,
  HTTP_STATUS,
  SUCCESS_MESSAGES
};
