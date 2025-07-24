// Pagination Middleware - Chuẩn hóa pagination cho toàn bộ API
const { createPagination } = require('../utils/responseFormatter');

/**
 * Parse và validate pagination parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} Parsed pagination parameters
 */
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20)); // Max 100 items per page
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Parse sorting parameters
 * @param {Object} query - Request query parameters
 * @param {Array} allowedFields - Allowed fields for sorting
 * @param {string} defaultSort - Default sort field
 * @returns {Object} Parsed sort parameters
 */
const parseSortParams = (query, allowedFields = [], defaultSort = 'created_at') => {
  const sort = query.sort && allowedFields.includes(query.sort) ? query.sort : defaultSort;
  const order = query.order && ['asc', 'desc'].includes(query.order.toLowerCase()) 
    ? query.order.toLowerCase() 
    : 'desc';

  return { sort, order };
};

/**
 * Parse search parameters
 * @param {Object} query - Request query parameters
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} Parsed search parameters
 */
const parseSearchParams = (query, searchFields = []) => {
  const search = query.search ? query.search.trim() : '';
  const searchQuery = search ? `%${search}%` : '';

  return { search, searchQuery, searchFields };
};

/**
 * Parse filter parameters
 * @param {Object} query - Request query parameters
 * @param {Array} allowedFilters - Allowed filter fields
 * @returns {Object} Parsed filter parameters
 */
const parseFilterParams = (query, allowedFilters = []) => {
  const filters = {};

  allowedFilters.forEach(field => {
    if (query[field] !== undefined && query[field] !== '') {
      filters[field] = query[field];
    }
  });

  return filters;
};

/**
 * Build WHERE clause for SQL queries
 * @param {Object} filters - Filter parameters
 * @param {Object} search - Search parameters
 * @returns {Object} WHERE clause and parameters
 */
const buildWhereClause = (filters = {}, search = {}) => {
  const conditions = [];
  const params = [];

  // Add filter conditions
  Object.entries(filters).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      // Handle array values (IN clause)
      const placeholders = value.map(() => '?').join(',');
      conditions.push(`${field} IN (${placeholders})`);
      params.push(...value);
    } else {
      conditions.push(`${field} = ?`);
      params.push(value);
    }
  });

  // Add search conditions
  if (search.search && search.searchFields.length > 0) {
    const searchConditions = search.searchFields.map(field => `${field} LIKE ?`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
    
    // Add search parameter for each field
    search.searchFields.forEach(() => {
      params.push(search.searchQuery);
    });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params };
};

/**
 * Middleware để parse pagination parameters
 */
const paginationMiddleware = (options = {}) => {
  const {
    allowedSortFields = ['created_at', 'updated_at'],
    defaultSort = 'created_at',
    searchFields = [],
    allowedFilters = [],
    maxLimit = 100
  } = options;

  return (req, res, next) => {
    // Parse pagination
    const pagination = parsePaginationParams(req.query);
    pagination.limit = Math.min(pagination.limit, maxLimit);

    // Parse sorting
    const sort = parseSortParams(req.query, allowedSortFields, defaultSort);

    // Parse search
    const search = parseSearchParams(req.query, searchFields);

    // Parse filters
    const filters = parseFilterParams(req.query, allowedFilters);

    // Build WHERE clause
    const { whereClause, params } = buildWhereClause(filters, search);

    // Attach to request object
    req.pagination = pagination;
    req.sort = sort;
    req.search = search;
    req.filters = filters;
    req.whereClause = whereClause;
    req.whereParams = params;

    // Helper function to create pagination response
    req.createPaginationResponse = (total) => {
      return createPagination(total, pagination.page, pagination.limit);
    };

    next();
  };
};

/**
 * Food-specific pagination middleware
 */
const foodPaginationMiddleware = paginationMiddleware({
  allowedSortFields: ['ten_mon', 'gia', 'created_at', 'updated_at', 'so_luong'],
  defaultSort: 'created_at',
  searchFields: ['ten_mon', 'mo_ta'],
  allowedFilters: ['id_loai', 'trang_thai'],
  maxLimit: 50
});

/**
 * Category-specific pagination middleware
 */
const categoryPaginationMiddleware = paginationMiddleware({
  allowedSortFields: ['ten_loai', 'created_at'],
  defaultSort: 'created_at',
  searchFields: ['ten_loai', 'mo_ta'],
  allowedFilters: [],
  maxLimit: 20
});

/**
 * Reservation-specific pagination middleware
 */
const reservationPaginationMiddleware = paginationMiddleware({
  allowedSortFields: ['ngay', 'gio', 'created_at', 'ten_khach'],
  defaultSort: 'created_at',
  searchFields: ['ten_khach', 'sdt', 'email'],
  allowedFilters: ['trang_thai', 'ngay'],
  maxLimit: 50
});

/**
 * Customer-specific pagination middleware
 */
const customerPaginationMiddleware = paginationMiddleware({
  allowedSortFields: ['full_name', 'email', 'created_at'],
  defaultSort: 'created_at',
  searchFields: ['full_name', 'email', 'phone'],
  allowedFilters: [],
  maxLimit: 50
});

/**
 * Build ORDER BY clause
 * @param {Object} sort - Sort parameters
 * @returns {string} ORDER BY clause
 */
const buildOrderByClause = (sort) => {
  return `ORDER BY ${sort.sort} ${sort.order.toUpperCase()}`;
};

/**
 * Build LIMIT clause
 * @param {Object} pagination - Pagination parameters
 * @returns {string} LIMIT clause
 */
const buildLimitClause = (pagination) => {
  return `LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;
};

/**
 * Helper function to build complete query
 * @param {string} baseQuery - Base SELECT query
 * @param {Object} req - Request object with pagination data
 * @returns {Object} Complete query and parameters
 */
const buildCompleteQuery = (baseQuery, req) => {
  const { whereClause, whereParams, sort, pagination } = req;
  
  let query = baseQuery;
  let params = [...whereParams];

  // Add WHERE clause
  if (whereClause) {
    query += ` ${whereClause}`;
  }

  // Add ORDER BY clause
  query += ` ${buildOrderByClause(sort)}`;

  // Add LIMIT clause
  query += ` ${buildLimitClause(pagination)}`;

  return { query, params };
};

/**
 * Helper function to build count query
 * @param {string} baseCountQuery - Base COUNT query
 * @param {Object} req - Request object with pagination data
 * @returns {Object} Count query and parameters
 */
const buildCountQuery = (baseCountQuery, req) => {
  const { whereClause, whereParams } = req;
  
  let query = baseCountQuery;
  let params = [...whereParams];

  // Add WHERE clause
  if (whereClause) {
    query += ` ${whereClause}`;
  }

  return { query, params };
};

module.exports = {
  paginationMiddleware,
  foodPaginationMiddleware,
  categoryPaginationMiddleware,
  reservationPaginationMiddleware,
  customerPaginationMiddleware,
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  parseFilterParams,
  buildWhereClause,
  buildOrderByClause,
  buildLimitClause,
  buildCompleteQuery,
  buildCountQuery
};
