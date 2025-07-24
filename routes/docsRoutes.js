// Documentation Routes - Serve API documentation and related files
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Documentation
 *     description: API documentation and resources
 */

/**
 * Serve custom API documentation page
 * GET /docs
 */
router.get('/', (req, res) => {
  const docsPath = path.join(__dirname, '../public/api-docs.html');
  
  if (fs.existsSync(docsPath)) {
    res.sendFile(docsPath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Documentation page not found',
      code: 'DOCS_NOT_FOUND'
    });
  }
});

/**
 * Serve Swagger JSON spec
 * GET /docs/swagger.json
 */
router.get('/swagger.json', (req, res) => {
  try {
    const { specs } = require('../config/swagger');
    res.json(specs);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load Swagger specification',
      code: 'SWAGGER_ERROR',
      error: error.message
    });
  }
});

/**
 * Download Postman Collection
 * GET /docs/postman-collection
 */
router.get('/postman-collection', (req, res) => {
  const collectionPath = path.join(__dirname, '../../Restaurant_API_Postman_Collection.json');
  
  if (fs.existsSync(collectionPath)) {
    res.download(collectionPath, 'Restaurant_API_Collection.json', (err) => {
      if (err) {
        console.error('Error downloading Postman collection:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download Postman collection',
          code: 'DOWNLOAD_ERROR'
        });
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Postman collection not found',
      code: 'COLLECTION_NOT_FOUND'
    });
  }
});

/**
 * Download Postman Environment
 * GET /docs/postman-environment
 */
router.get('/postman-environment', (req, res) => {
  const environmentPath = path.join(__dirname, '../../Restaurant_API_Environment.json');
  
  if (fs.existsSync(environmentPath)) {
    res.download(environmentPath, 'Restaurant_API_Environment.json', (err) => {
      if (err) {
        console.error('Error downloading Postman environment:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download Postman environment',
          code: 'DOWNLOAD_ERROR'
        });
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Postman environment not found',
      code: 'ENVIRONMENT_NOT_FOUND'
    });
  }
});

/**
 * Get API statistics and information
 * GET /docs/stats
 */
router.get('/stats', (req, res) => {
  try {
    const { specs } = require('../config/swagger');
    
    // Count endpoints by method
    const endpoints = specs.paths || {};
    const stats = {
      totalEndpoints: 0,
      methodCounts: {
        GET: 0,
        POST: 0,
        PUT: 0,
        PATCH: 0,
        DELETE: 0
      },
      tags: [],
      schemas: Object.keys(specs.components?.schemas || {}).length
    };

    // Count endpoints and methods
    Object.values(endpoints).forEach(pathMethods => {
      Object.keys(pathMethods).forEach(method => {
        if (method.toUpperCase() in stats.methodCounts) {
          stats.totalEndpoints++;
          stats.methodCounts[method.toUpperCase()]++;
        }
      });
    });

    // Extract unique tags
    const tagSet = new Set();
    Object.values(endpoints).forEach(pathMethods => {
      Object.values(pathMethods).forEach(methodSpec => {
        if (methodSpec.tags) {
          methodSpec.tags.forEach(tag => tagSet.add(tag));
        }
      });
    });
    stats.tags = Array.from(tagSet);

    res.json({
      success: true,
      message: 'API statistics retrieved successfully',
      data: {
        ...stats,
        version: specs.info?.version || '1.0.0',
        title: specs.info?.title || 'Restaurant API',
        description: specs.info?.description || '',
        servers: specs.servers || [],
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API statistics',
      code: 'STATS_ERROR',
      error: error.message
    });
  }
});

/**
 * Get API health and status
 * GET /docs/health
 */
router.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: 'connected', // This would be checked in real implementation
      swagger: 'available',
      documentation: 'available'
    }
  };

  res.json({
    success: true,
    message: 'Documentation service is healthy',
    data: healthData,
    timestamp: new Date().toISOString()
  });
});

/**
 * Generate and serve OpenAPI specification in YAML format
 * GET /docs/openapi.yaml
 */
router.get('/openapi.yaml', (req, res) => {
  try {
    const yaml = require('js-yaml');
    const { specs } = require('../config/swagger');
    
    const yamlSpec = yaml.dump(specs, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="restaurant-api-spec.yaml"');
    res.send(yamlSpec);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate YAML specification',
      code: 'YAML_ERROR',
      error: error.message
    });
  }
});

/**
 * Serve API changelog
 * GET /docs/changelog
 */
router.get('/changelog', (req, res) => {
  const changelog = [
    {
      version: '1.0.0',
      date: '2024-01-01',
      changes: [
        'Initial API release',
        'Authentication system with JWT',
        'Food management endpoints',
        'Category management',
        'AI chat integration',
        'Reservation system',
        'Comprehensive documentation'
      ]
    }
  ];

  res.json({
    success: true,
    message: 'API changelog retrieved successfully',
    data: changelog,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get API usage examples
 * GET /docs/examples
 */
router.get('/examples', (req, res) => {
  const examples = {
    authentication: {
      register: {
        method: 'POST',
        url: '/api/khach_hang/register',
        body: {
          full_name: 'Nguyễn Văn A',
          email: 'user@example.com',
          phone: '0123456789',
          password: 'password123'
        }
      },
      login: {
        method: 'POST',
        url: '/api/khach_hang/login',
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      }
    },
    foods: {
      getAll: {
        method: 'GET',
        url: '/api/foods?page=1&limit=10&category=1&search=phở'
      },
      create: {
        method: 'POST',
        url: '/api/foods',
        headers: {
          'Authorization': 'Bearer <token>',
          'Content-Type': 'multipart/form-data'
        },
        body: {
          id_loai: 2,
          ten_mon: 'Bún Bò Huế',
          mo_ta: 'Bún bò Huế cay nồng đặc trưng',
          gia: 50000,
          so_luong: 30
        }
      }
    },
    chat: {
      sendMessage: {
        method: 'POST',
        url: '/api/chat',
        body: {
          messages: [
            {
              role: 'user',
              content: 'Tôi muốn đặt món phở bò'
            }
          ],
          options: {
            temperature: 0.7,
            maxTokens: 1000
          }
        }
      }
    },
    reservations: {
      create: {
        method: 'POST',
        url: '/api/datban',
        body: {
          ten_khach: 'Nguyễn Văn A',
          sdt: '0123456789',
          email: 'user@example.com',
          ngay: '2024-01-15',
          gio: '19:00',
          so_luong_khach: 4,
          ghi_chu: 'Bàn gần cửa sổ'
        }
      }
    }
  };

  res.json({
    success: true,
    message: 'API usage examples retrieved successfully',
    data: examples,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
