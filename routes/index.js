// Main Routes Index - Clean Version
const express = require('express');
const router = express.Router();

// Import route modules
const categoryRoutes = require('./categoryRoutes');
const foodRoutes = require('./foodRoutes');
const chatRoutes = require('./chatRoutes');
const customerRoutes = require('./customerRoutes');
const datbanRoutes = require('./datban');
const khachhangRoutes = require('./khachhang');
const docsRoutes = require('./docsRoutes');
const healthRoutes = require('./healthRoutes');

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: API health check và monitoring
 *   - name: System
 *     description: Các endpoint hệ thống
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Kiểm tra trạng thái API
 *     description: Endpoint để kiểm tra API có hoạt động bình thường không
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API hoạt động bình thường
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API is running successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running successfully',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /test:
 *   get:
 *     summary: Test kết nối backend
 *     description: Endpoint để test kết nối với backend server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Backend kết nối thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Backend is connected and running!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 server:
 *                   type: string
 *                   example: "Restaurant API Server"
 */
// API test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is connected and running!',
    timestamp: new Date().toISOString(),
    server: 'Restaurant API Server'
  });
});

/**
 * @swagger
 * /docs:
 *   get:
 *     summary: Thông tin API documentation
 *     description: Endpoint cung cấp thông tin về API documentation
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Thông tin API documentation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Restaurant API Documentation"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 baseUrl:
 *                   type: string
 *                   example: "http://localhost:3000/api"
 *                 swagger_ui:
 *                   type: string
 *                   example: "http://localhost:3000/api-docs"
 *                 available_endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: "GET /health - Health check"
 *                     test:
 *                       type: string
 *                       example: "GET /test - API test"
 *                     docs:
 *                       type: string
 *                       example: "GET /docs - This documentation"
 */
// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    swagger_ui: `${req.protocol}://${req.get('host')}/api-docs`,
    available_endpoints: {
      'GET /health': 'Health check',
      'GET /test': 'API test',
      'GET /docs': 'This documentation'
    }
  });
});

// Mount route modules
console.log('🔧 Mounting routes...');
router.use('/categories', categoryRoutes);
console.log('✅ Categories routes mounted');
router.use('/foods', foodRoutes);
console.log('✅ Foods routes mounted');
router.use('/chat', chatRoutes);
console.log('✅ Chat routes mounted');

// Mount customer management routes first (more specific)
router.use('/khachhang', khachhangRoutes);
console.log('✅ Customer management routes mounted at /api/khachhang');

// Mount authentication routes (less specific)
router.use('/khach_hang', customerRoutes);
console.log('✅ Authentication routes mounted at /api/khach_hang');

router.use('/datban', datbanRoutes);
console.log('✅ Dat ban routes mounted');
router.use('/docs', docsRoutes);
console.log('✅ Documentation routes mounted');

// Mount health routes (this will override the simple health endpoint above)
router.use('/', healthRoutes);
console.log('✅ Health routes mounted');

module.exports = router;
