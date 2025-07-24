// Category Routes - API Endpoints with Full HTTP Methods Support
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Quản lý danh mục món ăn với đầy đủ HTTP methods
 */

// Import controllers and middleware
const CategoryController = require('../controllers/CategoryController');
const {
  validateId,
  handleValidationErrors
} = require('../middleware/validation');
const { body } = require('express-validator');
const {
  handleHeadRequest,
  handleOptionsRequest,
  createOptionsHandler,
  createHeadHandler,
  logHttpMethod
} = require('../middleware/httpMethods');

// Category validation rules
const validateCategory = [
  body('ten_loai')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên loại món phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\(\)]+$/)
    .withMessage('Tên loại món chỉ được chứa chữ cái, số, dấu cách, dấu gạch ngang và dấu ngoặc'),
  
  body('mo_ta')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),
  
  handleValidationErrors
];

const validateCategoryUpdate = [
  body('ten_loai')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên loại món phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\(\)]+$/)
    .withMessage('Tên loại món chỉ được chứa chữ cái, số, dấu cách, dấu gạch ngang và dấu ngoặc'),
  
  body('mo_ta')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),
  
  handleValidationErrors
];

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lấy danh sách tất cả danh mục
 *     description: Trả về danh sách tất cả danh mục món ăn có trong hệ thống
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lấy danh sách danh mục thành công
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
 *                   example: "Lấy danh sách danh mục thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/', CategoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Lấy thông tin danh mục theo ID
 *     description: Trả về thông tin chi tiết của một danh mục cụ thể
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của danh mục
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Lấy thông tin danh mục thành công
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
 *                   example: "Lấy thông tin danh mục thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/:id', validateId, CategoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}/foods:
 *   get:
 *     summary: Lấy danh sách món ăn theo danh mục
 *     description: Trả về danh sách tất cả món ăn thuộc một danh mục cụ thể
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của danh mục
 *         schema:
 *           type: integer
 *           example: 1
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
 *                   example: 15
 *                 category:
 *                   $ref: '#/components/schemas/Category'
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
 *                       example: 15
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/:id/foods', validateId, CategoryController.getFoodsByCategory);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Tạo danh mục mới
 *     description: Tạo một danh mục món ăn mới trong hệ thống
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ten_loai
 *             properties:
 *               ten_loai:
 *                 type: string
 *                 description: Tên danh mục
 *                 example: "Món chính"
 *                 minLength: 2
 *                 maxLength: 100
 *               mo_ta:
 *                 type: string
 *                 description: Mô tả danh mục
 *                 example: "Các món ăn chính của nhà hàng"
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Tạo danh mục thành công
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
 *                   example: "Tạo danh mục thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', validateCategory, CategoryController.createCategory);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Cập nhật thông tin danh mục
 *     description: Cập nhật thông tin của một danh mục đã tồn tại
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của danh mục cần cập nhật
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ten_loai:
 *                 type: string
 *                 description: Tên danh mục
 *                 example: "Món chính"
 *                 minLength: 2
 *                 maxLength: 100
 *               mo_ta:
 *                 type: string
 *                 description: Mô tả danh mục
 *                 example: "Các món ăn chính của nhà hàng"
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công
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
 *                   example: "Cập nhật danh mục thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Xóa danh mục
 *     description: Xóa một danh mục khỏi hệ thống (chỉ được phép nếu không có món ăn nào thuộc danh mục này)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của danh mục cần xóa
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Xóa danh mục thành công
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
 *                   example: "Xóa danh mục thành công"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Không thể xóa danh mục vì còn món ăn thuộc danh mục này
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Không thể xóa danh mục"
 *               error: "Danh mục này còn chứa món ăn"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */
router.put('/:id', validateId, validateCategoryUpdate, CategoryController.updateCategory);

router.delete('/:id', validateId, CategoryController.deleteCategory);

// ==================== NEW HTTP METHODS ====================

/**
 * @swagger
 * /categories:
 *   head:
 *     summary: Get categories metadata
 *     description: Lấy metadata của danh sách danh mục
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Metadata retrieved successfully
 *         headers:
 *           X-Total-Count:
 *             description: Tổng số danh mục
 *             schema:
 *               type: integer
 */
router.head('/', createHeadHandler(CategoryController.getAllCategories));

/**
 * @swagger
 * /categories/{id}:
 *   head:
 *     summary: Get category metadata by ID
 *     description: Lấy metadata của danh mục theo ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category metadata retrieved
 *       404:
 *         description: Category not found
 */
router.head('/:id', validateId, createHeadHandler(CategoryController.getCategoryById));

/**
 * @swagger
 * /categories:
 *   options:
 *     summary: Get supported HTTP methods for categories
 *     description: Trả về các HTTP methods được hỗ trợ cho categories API
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Supported methods information
 */
router.options('/', createOptionsHandler('categories', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']));
router.options('/:id', createOptionsHandler('categories', ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']));

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Partially update category
 *     description: Cập nhật một phần thông tin danh mục
 *     tags: [Categories]
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
 *               ten_loai:
 *                 type: string
 *                 example: "Món Chính Mới"
 *               mo_ta:
 *                 type: string
 *                 example: "Các món ăn chính được cập nhật"
 *               trang_thai:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 */
router.patch('/:id',
  validateId,
  validateCategoryUpdate,
  CategoryController.updateCategory
);

/**
 * @swagger
 * /categories/{id}/status:
 *   patch:
 *     summary: Update category status
 *     description: Cập nhật trạng thái danh mục
 *     tags: [Categories]
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
 *                 enum: [active, inactive]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Category not found
 */
router.patch('/:id/status',
  validateId,
  [
    body('trang_thai')
      .isIn(['active', 'inactive'])
      .withMessage('Trạng thái không hợp lệ'),
    handleValidationErrors
  ],
  CategoryController.updateCategoryStatus || CategoryController.updateCategory
);

// Add global middleware
router.use(logHttpMethod);
router.use(handleHeadRequest);

module.exports = router;
