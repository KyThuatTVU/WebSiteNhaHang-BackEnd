// HTTP Methods Middleware - Hỗ trợ HEAD và OPTIONS cho tất cả endpoints
const logger = require('../utils/logger');

/**
 * Middleware để tự động handle HEAD requests
 * HEAD request trả về headers giống GET nhưng không có body
 */
const handleHeadRequest = (req, res, next) => {
  if (req.method === 'HEAD') {
    // Override res.json để không gửi body
    const originalJson = res.json;
    res.json = function(data) {
      // Set headers based on data
      if (data && typeof data === 'object') {
        res.set('Content-Type', 'application/json');
        
        // Set content length if data exists
        if (data.data && Array.isArray(data.data)) {
          res.set('X-Total-Count', data.data.length.toString());
        }
        
        if (data.pagination) {
          res.set('X-Total-Records', data.pagination.total?.toString() || '0');
          res.set('X-Page', data.pagination.page?.toString() || '1');
          res.set('X-Limit', data.pagination.limit?.toString() || '20');
        }
        
        // Set cache headers
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
        res.set('Last-Modified', new Date().toUTCString());
      }
      
      // Send status without body
      res.status(this.statusCode || 200).end();
    };
    
    // Override res.send để không gửi body
    const originalSend = res.send;
    res.send = function(data) {
      res.status(this.statusCode || 200).end();
    };
  }
  
  next();
};

/**
 * Middleware để handle OPTIONS requests
 * Trả về các methods được hỗ trợ cho endpoint
 */
const handleOptionsRequest = (allowedMethods = []) => {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      // Default allowed methods
      const defaultMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      const methods = allowedMethods.length > 0 ? allowedMethods : defaultMethods;
      
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': methods.join(', '),
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24 hours
        'Allow': methods.join(', '),
        'Content-Length': '0'
      });
      
      return res.status(204).end();
    }
    
    next();
  };
};

/**
 * Tạo OPTIONS handler cho resource cụ thể
 */
const createOptionsHandler = (resourceName, methods = []) => {
  return (req, res) => {
    const allowedMethods = methods.length > 0 ? methods : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    
    const response = {
      resource: resourceName,
      methods: allowedMethods,
      endpoints: generateEndpointInfo(resourceName, allowedMethods),
      timestamp: new Date().toISOString()
    };
    
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Allow': allowedMethods.join(', ')
    });
    
    res.json(response);
  };
};

/**
 * Tạo HEAD handler cho resource
 */
const createHeadHandler = (getHandler) => {
  return async (req, res, next) => {
    // Temporarily override response methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    let responseData = null;
    let statusCode = 200;
    
    // Capture response data without sending
    res.json = function(data) {
      responseData = data;
      statusCode = this.statusCode || 200;
      return this;
    };
    
    res.send = function(data) {
      responseData = data;
      statusCode = this.statusCode || 200;
      return this;
    };
    
    try {
      // Call the original GET handler
      await getHandler(req, res, next);
      
      // Set headers based on captured data
      if (responseData) {
        res.set('Content-Type', 'application/json');
        
        if (typeof responseData === 'object') {
          if (responseData.data && Array.isArray(responseData.data)) {
            res.set('X-Total-Count', responseData.data.length.toString());
          }
          
          if (responseData.pagination) {
            res.set('X-Total-Records', responseData.pagination.total?.toString() || '0');
            res.set('X-Page', responseData.pagination.page?.toString() || '1');
            res.set('X-Limit', responseData.pagination.limit?.toString() || '20');
          }
        }
        
        // Estimate content length
        const contentLength = JSON.stringify(responseData).length;
        res.set('Content-Length', contentLength.toString());
      }
      
      // Set cache headers
      res.set('Cache-Control', 'public, max-age=300');
      res.set('Last-Modified', new Date().toUTCString());
      
      // Send only headers
      res.status(statusCode).end();
      
    } catch (error) {
      // Restore original methods
      res.json = originalJson;
      res.send = originalSend;
      next(error);
    }
  };
};

/**
 * Generate endpoint information for OPTIONS response
 */
const generateEndpointInfo = (resourceName, methods) => {
  const baseUrl = `/api/${resourceName}`;
  const endpoints = [];
  
  if (methods.includes('GET')) {
    endpoints.push({
      method: 'GET',
      url: baseUrl,
      description: `Get all ${resourceName}`,
      parameters: ['limit', 'offset', 'search', 'sort', 'order']
    });
    
    endpoints.push({
      method: 'GET',
      url: `${baseUrl}/:id`,
      description: `Get ${resourceName} by ID`,
      parameters: ['id']
    });
  }
  
  if (methods.includes('POST')) {
    endpoints.push({
      method: 'POST',
      url: baseUrl,
      description: `Create new ${resourceName}`,
      requiresAuth: true,
      contentType: 'application/json'
    });
  }
  
  if (methods.includes('PUT')) {
    endpoints.push({
      method: 'PUT',
      url: `${baseUrl}/:id`,
      description: `Update ${resourceName} completely`,
      requiresAuth: true,
      parameters: ['id']
    });
  }
  
  if (methods.includes('PATCH')) {
    endpoints.push({
      method: 'PATCH',
      url: `${baseUrl}/:id`,
      description: `Update ${resourceName} partially`,
      requiresAuth: true,
      parameters: ['id']
    });
  }
  
  if (methods.includes('DELETE')) {
    endpoints.push({
      method: 'DELETE',
      url: `${baseUrl}/:id`,
      description: `Delete ${resourceName}`,
      requiresAuth: true,
      parameters: ['id']
    });
  }
  
  if (methods.includes('HEAD')) {
    endpoints.push({
      method: 'HEAD',
      url: baseUrl,
      description: `Get ${resourceName} metadata`,
      parameters: ['limit', 'offset', 'search']
    });
  }
  
  return endpoints;
};

/**
 * Middleware để log HTTP methods
 */
const logHttpMethod = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
};

/**
 * Middleware để validate HTTP method
 */
const validateHttpMethod = (allowedMethods = []) => {
  return (req, res, next) => {
    if (allowedMethods.length > 0 && !allowedMethods.includes(req.method)) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
        code: 'METHOD_NOT_ALLOWED',
        allowedMethods,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

/**
 * Tạo router với đầy đủ HTTP methods
 */
const createFullRestRouter = (resourceName, controller, options = {}) => {
  const express = require('express');
  const router = express.Router();
  
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    requireAuth = ['POST', 'PUT', 'PATCH', 'DELETE'],
    middleware = {}
  } = options;
  
  // Add global middleware
  router.use(logHttpMethod);
  router.use(handleHeadRequest);
  
  // OPTIONS for collection
  if (allowedMethods.includes('OPTIONS')) {
    router.options('/', handleOptionsRequest(allowedMethods));
    router.options('/:id', handleOptionsRequest(allowedMethods));
  }
  
  // GET methods
  if (allowedMethods.includes('GET')) {
    router.get('/', middleware.getAll || [], controller.getAll);
    router.get('/:id', middleware.getById || [], controller.getById);
  }
  
  // HEAD methods (reuse GET handlers)
  if (allowedMethods.includes('HEAD')) {
    router.head('/', middleware.getAll || [], createHeadHandler(controller.getAll));
    router.head('/:id', middleware.getById || [], createHeadHandler(controller.getById));
  }
  
  // POST methods
  if (allowedMethods.includes('POST')) {
    router.post('/', middleware.create || [], controller.create);
  }
  
  // PUT methods
  if (allowedMethods.includes('PUT')) {
    router.put('/:id', middleware.update || [], controller.update);
  }
  
  // PATCH methods
  if (allowedMethods.includes('PATCH')) {
    router.patch('/:id', middleware.patch || [], controller.patch || controller.update);
  }
  
  // DELETE methods
  if (allowedMethods.includes('DELETE')) {
    router.delete('/:id', middleware.delete || [], controller.delete);
  }
  
  return router;
};

module.exports = {
  handleHeadRequest,
  handleOptionsRequest,
  createOptionsHandler,
  createHeadHandler,
  generateEndpointInfo,
  logHttpMethod,
  validateHttpMethod,
  createFullRestRouter
};
