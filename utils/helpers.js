// Helper Utilities
const path = require('path');

/**
 * Build full image URL from filename
 * @param {Object} req - Express request object
 * @param {string} filename - Image filename
 * @returns {string|null} Full image URL or null
 */
const buildImageUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/images/${filename}`;
};

/**
 * Format price to Vietnamese currency
 * @param {number} price - Price amount
 * @returns {string} Formatted price string
 */
const formatPrice = (price) => {
  if (isNaN(price) || price === null || price === undefined) {
    return '0đ';
  }
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

/**
 * Format stock display
 * @param {number} stock - Stock quantity
 * @returns {Object} Stock status and display
 */
const formatStock = (stock) => {
  const quantity = parseInt(stock) || 0;
  
  return {
    so_luong: quantity,
    tinh_trang: quantity > 0 ? 'Còn hàng' : 'Hết hàng',
    so_luong_display: quantity > 0 ? `Còn ${quantity} phần` : 'Hết hàng',
    is_available: quantity > 0
  };
};

/**
 * Format food item response
 * @param {Object} item - Raw food item from database
 * @param {Object} req - Express request object
 * @returns {Object} Formatted food item
 */
const formatFoodItem = (item, req) => {
  const stockInfo = formatStock(item.so_luong);
  
  return {
    ...item,
    hinh_anh: buildImageUrl(req, item.hinh_anh),
    gia_formatted: formatPrice(item.gia),
    ...stockInfo
  };
};

/**
 * Build pagination info
 * @param {number} total - Total items count
 * @param {number} limit - Items per page
 * @param {number} offset - Current offset
 * @returns {Object} Pagination information
 */
const buildPagination = (total, limit, offset) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    limit,
    offset,
    currentPage,
    totalPages,
    hasMore: offset + limit < total,
    hasPrevious: offset > 0
  };
};

/**
 * Sanitize search query
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[%_]/g, '\\$&') // Escape SQL wildcards
    .substring(0, 100); // Limit length
};

/**
 * Build dynamic WHERE clause for database queries
 * @param {Object} filters - Filter object
 * @returns {Object} Query parts and parameters
 */
const buildWhereClause = (filters) => {
  const conditions = [];
  const params = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      switch (key) {
        case 'search':
          conditions.push('(m.ten_mon LIKE ? OR m.mo_ta LIKE ? OR l.ten_loai LIKE ?)');
          const searchTerm = `%${sanitizeSearchQuery(value)}%`;
          params.push(searchTerm, searchTerm, searchTerm);
          break;
          
        case 'category':
          conditions.push('m.id_loai = ?');
          params.push(value);
          break;
          
        case 'minPrice':
          conditions.push('m.gia >= ?');
          params.push(value);
          break;
          
        case 'maxPrice':
          conditions.push('m.gia <= ?');
          params.push(value);
          break;
          
        case 'available':
          if (value === 'true') {
            conditions.push('m.so_luong > 0');
          } else if (value === 'false') {
            conditions.push('m.so_luong = 0');
          }
          break;
      }
    }
  });
  
  return {
    whereClause: conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '',
    params
  };
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  
  return `${name}-${timestamp}-${random}${ext}`;
};

/**
 * Validate file type
 * @param {string} mimetype - File mimetype
 * @returns {boolean} Is valid image type
 */
const isValidImageType = (mimetype) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  return allowedTypes.includes(mimetype);
};

/**
 * Calculate statistics
 * @param {Array} items - Array of items
 * @param {string} field - Field to calculate stats for
 * @returns {Object} Statistics object
 */
const calculateStats = (items, field) => {
  if (!items || items.length === 0) {
    return {
      count: 0,
      sum: 0,
      average: 0,
      min: 0,
      max: 0
    };
  }
  
  const values = items.map(item => parseFloat(item[field]) || 0);
  const sum = values.reduce((acc, val) => acc + val, 0);
  
  return {
    count: items.length,
    sum,
    average: sum / items.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined/null values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const removeEmptyValues = (obj) => {
  const cleaned = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  buildImageUrl,
  formatPrice,
  formatStock,
  formatFoodItem,
  buildPagination,
  sanitizeSearchQuery,
  buildWhereClause,
  generateUniqueFilename,
  isValidImageType,
  calculateStats,
  deepClone,
  removeEmptyValues,
  catchAsync,
  AppError
};
