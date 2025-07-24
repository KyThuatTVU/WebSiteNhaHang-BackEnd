// Food Routes - API Endpoints with Full HTTP Methods Support
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Foods
 *     description: Quản lý món ăn với đầy đủ HTTP methods
 */

// Import controllers and middleware
const FoodController = require('../controllers/FoodController');
const { upload, handleMulterError } = require('../config/multer');
const {
  validateFoodItem,
  validateFoodItemUpdate,
  validateStockUpdate,
  validateId,
  validateFoodQuery
} = require('../middleware/validation');
const {
  handleHeadRequest,
  handleOptionsRequest,
  createOptionsHandler,
  createHeadHandler,
  logHttpMethod
} = require('../middleware/httpMethods');

/**
 * @swagger
 * /foods:
 *   get:
 *     summary: Lấy danh sách tất cả món ăn
 *     description: Trả về danh sách món ăn với khả năng lọc và phân trang
 *     tags: [Foods]
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Từ khóa tìm kiếm
 *         schema:
 *           type: string
 *           example: "phở"
 *       - in: query
 *         name: category
 *         description: ID danh mục
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: minPrice
 *         description: Giá tối thiểu
 *         schema:
 *           type: number
 *           example: 20000
 *       - in: query
 *         name: maxPrice
 *         description: Giá tối đa
 *         schema:
 *           type: number
 *           example: 100000
 *       - in: query
 *         name: available
 *         description: Chỉ lấy món có sẵn
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: limit
 *         description: Số lượng món ăn tối đa trả về
 *         schema:
 *           type: integer
 *           default: 20
 *           example: 10
 *       - in: query
 *         name: offset
 *         description: Vị trí bắt đầu lấy dữ liệu
 *         schema:
 *           type: integer
 *           default: 0
 *           example: 0
 *     responses:
 *       200:
 *         description: Lấy danh sách món ăn thành công
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
 *                   example: "Lấy danh sách món ăn thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     total:
 *                       type: integer
 *                       example: 50
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/', validateFoodQuery, FoodController.getAllFoods);

/**
 * @swagger
 * /foods/search:
 *   get:
 *     summary: Tìm kiếm món ăn
 *     description: Tìm kiếm món ăn theo từ khóa
 *     tags: [Foods]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         description: Từ khóa tìm kiếm
 *         schema:
 *           type: string
 *           example: "phở bò"
 *       - in: query
 *         name: limit
 *         description: Số lượng kết quả tối đa
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 5
 *     responses:
 *       200:
 *         description: Tìm kiếm thành công
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
 *                   example: "Tìm kiếm thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 query:
 *                   type: string
 *                   example: "phở bò"
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/search', FoodController.searchFoods);

/**
 * @swagger
 * /foods/popular:
 *   get:
 *     summary: Lấy danh sách món ăn phổ biến
 *     description: Trả về danh sách các món ăn được đặt nhiều nhất
 *     tags: [Foods]
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Số lượng món ăn trả về
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 5
 *     responses:
 *       200:
 *         description: Lấy danh sách món phổ biến thành công
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
 *                   example: "Lấy danh sách món phổ biến thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Food'
 *                       - type: object
 *                         properties:
 *                           order_count:
 *                             type: integer
 *                             description: Số lần được đặt
 *                             example: 25
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/popular', FoodController.getPopularFoods);

/**
 * @swagger
 * /foods/stats:
 *   get:
 *     summary: Lấy thống kê món ăn
 *     description: Trả về các thống kê tổng quan về món ăn
 *     tags: [Foods]
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
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
 *                   example: "Lấy thống kê thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_foods:
 *                       type: integer
 *                       example: 50
 *                     available_foods:
 *                       type: integer
 *                       example: 45
 *                     total_categories:
 *                       type: integer
 *                       example: 8
 *                     average_price:
 *                       type: number
 *                       example: 65000
 *                     price_range:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 15000
 *                         max:
 *                           type: number
 *                           example: 150000
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/stats', FoodController.getFoodStats);

/**
 * @swagger
 * /foods/{id}:
 *   get:
 *     summary: Lấy thông tin món ăn theo ID
 *     description: Trả về thông tin chi tiết của một món ăn cụ thể
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của món ăn
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Lấy thông tin món ăn thành công
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
 *                   example: "Lấy thông tin món ăn thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Food'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/:id', validateId, FoodController.getFoodById);

/**
 * @swagger
 * /foods:
 *   post:
 *     summary: Tạo món ăn mới
 *     description: Tạo một món ăn mới trong hệ thống
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id_loai
 *               - ten_mon
 *               - gia
 *               - so_luong
 *             properties:
 *               id_loai:
 *                 type: integer
 *                 description: ID danh mục
 *                 example: 1
 *               ten_mon:
 *                 type: string
 *                 description: Tên món ăn
 *                 example: "Phở Bò Tái"
 *                 minLength: 2
 *                 maxLength: 200
 *               mo_ta:
 *                 type: string
 *                 description: Mô tả món ăn
 *                 example: "Phở bò tái với nước dùng đậm đà"
 *                 maxLength: 1000
 *               gia:
 *                 type: number
 *                 description: Giá món ăn (VNĐ)
 *                 example: 50000
 *                 minimum: 0
 *               so_luong:
 *                 type: integer
 *                 description: Số lượng có sẵn
 *                 example: 20
 *                 minimum: 0
 *               hinh_anh:
 *                 type: string
 *                 format: binary
 *                 description: Hình ảnh món ăn (JPG, PNG, WEBP)
 *     responses:
 *       201:
 *         description: Tạo món ăn thành công
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
 *                   example: "Tạo món ăn thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Food'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/',
  upload.single('hinh_anh'),
  handleMulterError,
  validateFoodItem,
  FoodController.createFood
);

/**
 * @route   PUT /api/foods/:id
 * @desc    Update food item
 * @access  Private (Admin)
 * @param   id - Food item ID
 * @body    id_loai, ten_mon, mo_ta, gia, so_luong (all optional)
 * @file    hinh_anh (optional)
 */
router.put('/:id',
  validateId,
  upload.single('hinh_anh'),
  handleMulterError,
  validateFoodItemUpdate,
  FoodController.updateFood
);

/**
 * @route   PATCH /api/foods/:id/stock
 * @desc    Update food item stock
 * @access  Private (Admin)
 * @param   id - Food item ID
 * @body    so_luong
 */
router.patch('/:id/stock',
  validateId,
  validateStockUpdate,
  FoodController.updateStock
);

/**
 * @route   DELETE /api/foods/:id
 * @desc    Delete food item
 * @access  Private (Admin)
 * @param   id - Food item ID
 */
router.delete('/:id',
  validateId,
  FoodController.deleteFood
);

// ==================== NEW HTTP METHODS ====================

/**
 * @swagger
 * /foods:
 *   head:
 *     summary: Get foods metadata
 *     description: Lấy metadata của danh sách món ăn (chỉ headers, không có body)
 *     tags: [Foods]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm món ăn
 *     responses:
 *       200:
 *         description: Metadata retrieved successfully
 *         headers:
 *           X-Total-Count:
 *             description: Tổng số món ăn
 *             schema:
 *               type: integer
 *           X-Total-Records:
 *             description: Tổng số records
 *             schema:
 *               type: integer
 */
router.head('/', validateFoodQuery, createHeadHandler(FoodController.getAllFoods));

/**
 * @swagger
 * /foods/{id}:
 *   head:
 *     summary: Get food metadata by ID
 *     description: Lấy metadata của món ăn theo ID
 *     tags: [Foods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Food metadata retrieved
 *       404:
 *         description: Food not found
 */
router.head('/:id', validateId, createHeadHandler(FoodController.getFoodById));

/**
 * @swagger
 * /foods:
 *   options:
 *     summary: Get supported HTTP methods for foods
 *     description: Trả về các HTTP methods được hỗ trợ cho foods API
 *     tags: [Foods]
 *     responses:
 *       200:
 *         description: Supported methods information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resource:
 *                   type: string
 *                   example: "foods"
 *                 methods:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.options('/', createOptionsHandler('foods', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']));
router.options('/:id', createOptionsHandler('foods', ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']));

/**
 * @swagger
 * /foods/{id}:
 *   patch:
 *     summary: Partially update food item
 *     description: Cập nhật một phần thông tin món ăn
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ten_mon:
 *                 type: string
 *                 example: "Phở Bò Tái Nạm"
 *               gia:
 *                 type: number
 *                 example: 55000
 *               so_luong:
 *                 type: integer
 *                 example: 20
 *               trang_thai:
 *                 type: string
 *                 enum: [kha_dung, het_hang, ngung_ban]
 *                 example: "kha_dung"
 *     responses:
 *       200:
 *         description: Food updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Food not found
 */
router.patch('/:id',
  validateId,
  upload.single('hinh_anh'),
  handleMulterError,
  validateFoodItemUpdate,
  FoodController.updateFood
);

/**
 * @swagger
 * /foods/{id}/status:
 *   patch:
 *     summary: Update food status
 *     description: Cập nhật trạng thái món ăn (available, unavailable, discontinued)
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trang_thai
 *             properties:
 *               trang_thai:
 *                 type: string
 *                 enum: [kha_dung, het_hang, ngung_ban]
 *                 example: "kha_dung"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Food not found
 */
router.patch('/:id/status',
  validateId,
  [
    require('express-validator').body('trang_thai')
      .isIn(['kha_dung', 'het_hang', 'ngung_ban'])
      .withMessage('Trạng thái không hợp lệ'),
    require('../middleware/validation').handleValidationErrors
  ],
  FoodController.updateFoodStatus || FoodController.updateFood
);

/**
 * @swagger
 * /foods/bulk:
 *   post:
 *     summary: Create multiple foods
 *     description: Tạo nhiều món ăn cùng lúc
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foods
 *             properties:
 *               foods:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_loai
 *                     - ten_mon
 *                     - gia
 *                   properties:
 *                     id_loai:
 *                       type: integer
 *                     ten_mon:
 *                       type: string
 *                     mo_ta:
 *                       type: string
 *                     gia:
 *                       type: number
 *                     so_luong:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Foods created successfully
 *       400:
 *         description: Validation error
 */
router.post('/bulk', FoodController.createBulkFoods || FoodController.createFood);

/**
 * @swagger
 * /foods/bulk:
 *   delete:
 *     summary: Delete multiple foods
 *     description: Xóa nhiều món ăn cùng lúc
 *     tags: [Foods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Foods deleted successfully
 *       400:
 *         description: Invalid IDs
 */
router.delete('/bulk', FoodController.deleteBulkFoods || FoodController.deleteFood);

// Add global middleware for all routes
router.use(logHttpMethod);
router.use(handleHeadRequest);

module.exports = router;
