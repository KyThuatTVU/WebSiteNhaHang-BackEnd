// Chat Routes - AI Chat API Endpoints with Full HTTP Methods
const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const { body, validationResult } = require('express-validator');
const {
  handleHeadRequest,
  handleOptionsRequest,
  createOptionsHandler,
  createHeadHandler,
  logHttpMethod
} = require('../middleware/httpMethods');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      })),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: AI Chat và hỗ trợ khách hàng
 */

/**
 * Chat message validation
 */
const validateChatMessage = [
  body('messages')
    .isArray({ min: 1 })
    .withMessage('Messages phải là array và không được rỗng'),
  
  body('messages.*.role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Role phải là user, assistant hoặc system'),
  
  body('messages.*.content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content phải là string từ 1-2000 ký tự'),
  
  body('options.useGroq')
    .optional()
    .isBoolean()
    .withMessage('useGroq phải là boolean'),
  
  body('options.temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature phải từ 0-2'),
  
  body('options.maxTokens')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('MaxTokens phải từ 100-2000'),
  
  handleValidationErrors
];

/**
 * Food description validation
 */
const validateFoodDescription = [
  body('foodName')
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Tên món ăn phải từ 2-200 ký tự'),
  
  body('ingredients')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Nguyên liệu không được vượt quá 500 ký tự'),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Danh mục không được vượt quá 100 ký tự'),
  
  handleValidationErrors
];

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Gửi tin nhắn chat với AI
 *     description: Gửi tin nhắn và nhận phản hồi từ AI chatbot của nhà hàng
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 description: Lịch sử cuộc trò chuyện
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                       description: Vai trò của tin nhắn
 *                       example: "user"
 *                     content:
 *                       type: string
 *                       description: Nội dung tin nhắn
 *                       example: "Nhà hàng có những món gì ngon?"
 *                       maxLength: 2000
 *               options:
 *                 type: object
 *                 description: Tùy chọn cho AI
 *                 properties:
 *                   useGroq:
 *                     type: boolean
 *                     description: Sử dụng Groq thay vì Gemini
 *                     example: false
 *                   temperature:
 *                     type: number
 *                     description: Độ sáng tạo (0-2)
 *                     example: 0.7
 *                     minimum: 0
 *                     maximum: 2
 *                   maxTokens:
 *                     type: integer
 *                     description: Số token tối đa
 *                     example: 1000
 *                     minimum: 100
 *                     maximum: 2000
 *           example:
 *             messages:
 *               - role: "user"
 *                 content: "Xin chào, nhà hàng có những món ăn gì đặc biệt?"
 *             options:
 *               temperature: 0.7
 *               maxTokens: 1000
 *     responses:
 *       200:
 *         description: Phản hồi từ AI thành công
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
 *                   description: Phản hồi từ AI
 *                   example: "Xin chào! Nhà hàng Ẩm Thực Phương Nam có nhiều món đặc sản như Phở Bò, Bún Bò Huế, Bánh Xèo..."
 *                 provider:
 *                   type: string
 *                   description: Nhà cung cấp AI được sử dụng
 *                   example: "gemini"
 *                 model:
 *                   type: string
 *                   description: Model AI được sử dụng
 *                   example: "gemini-1.5-flash"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', validateChatMessage, ChatController.sendMessage);

/**
 * @swagger
 * /chat/generate-description:
 *   post:
 *     summary: Tạo mô tả món ăn bằng AI
 *     description: Sử dụng AI để tạo mô tả hấp dẫn cho món ăn
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodName
 *             properties:
 *               foodName:
 *                 type: string
 *                 description: Tên món ăn
 *                 example: "Phở Bò Tái"
 *                 minLength: 2
 *                 maxLength: 200
 *               ingredients:
 *                 type: string
 *                 description: Nguyên liệu món ăn
 *                 example: "Thịt bò, bánh phở, hành lá, ngò gai"
 *                 maxLength: 500
 *               category:
 *                 type: string
 *                 description: Danh mục món ăn
 *                 example: "Món chính"
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Tạo mô tả thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     foodName:
 *                       type: string
 *                       example: "Phở Bò Tái"
 *                     description:
 *                       type: string
 *                       example: "Phở bò tái với nước dùng đậm đà, thịt bò tươi ngon và bánh phở mềm mại. Hương vị truyền thống đặc trưng miền Nam."
 *                     generated:
 *                       type: boolean
 *                       example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/generate-description', validateFoodDescription, ChatController.generateFoodDescription);

/**
 * @swagger
 * /chat/status:
 *   get:
 *     summary: Kiểm tra trạng thái dịch vụ AI
 *     description: Trả về thông tin về các dịch vụ AI có sẵn
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Thông tin trạng thái dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: object
 *                       properties:
 *                         gemini:
 *                           type: object
 *                           properties:
 *                             available:
 *                               type: boolean
 *                               example: true
 *                             model:
 *                               type: string
 *                               example: "gemini-1.5-flash"
 *                             configured:
 *                               type: boolean
 *                               example: true
 *                         groq:
 *                           type: object
 *                           properties:
 *                             available:
 *                               type: boolean
 *                               example: false
 *                             model:
 *                               type: string
 *                               example: "llama3-8b-8192"
 *                             configured:
 *                               type: boolean
 *                               example: false
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     primary:
 *                       type: string
 *                       example: "gemini"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/status', ChatController.getServiceStatus);

/**
 * @swagger
 * /chat/restaurant-info:
 *   get:
 *     summary: Lấy thông tin nhà hàng
 *     description: Trả về thông tin chi tiết về nhà hàng cho chatbot
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Thông tin nhà hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Ẩm Thực Phương Nam"
 *                     description:
 *                       type: string
 *                       example: "Nhà hàng chuyên về các món ăn truyền thống miền Nam Việt Nam"
 *                     specialties:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Phở Bò", "Bún Bò Huế", "Bánh Xèo"]
 *                     contact:
 *                       type: object
 *                       properties:
 *                         phone:
 *                           type: string
 *                           example: "0123-456-789"
 *                         email:
 *                           type: string
 *                           example: "info@amthucphuongnam.com"
 *                         address:
 *                           type: string
 *                           example: "123 Đường ABC, Quận XYZ, TP.HCM"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/restaurant-info', ChatController.getRestaurantInfo);

/**
 * @swagger
 * /chat/suggested-questions:
 *   get:
 *     summary: Lấy câu hỏi gợi ý
 *     description: Trả về danh sách câu hỏi gợi ý cho chatbot
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Danh sách câu hỏi gợi ý
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Nhà hàng có những món ăn gì đặc biệt?", "Giờ mở cửa như thế nào?"]
 *                     total:
 *                       type: integer
 *                       example: 10
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/suggested-questions', ChatController.getSuggestedQuestions);

/**
 * @swagger
 * /chat/health:
 *   get:
 *     summary: Health check cho dịch vụ chat
 *     description: Kiểm tra tình trạng hoạt động của dịch vụ chat AI
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Dịch vụ hoạt động bình thường
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 message:
 *                   type: string
 *                   example: "Chat service is operational"
 *       503:
 *         description: Dịch vụ hoạt động hạn chế
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "degraded"
 *                 message:
 *                   type: string
 *                   example: "Chat service is running with limited functionality"
 */
router.get('/health', ChatController.healthCheck);

/**
 * @swagger
 * /chat/history:
 *   get:
 *     summary: Lấy lịch sử chat
 *     description: Lấy lịch sử các cuộc trò chuyện gần đây
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng tin nhắn tối đa
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Vị trí bắt đầu
 *     responses:
 *       200:
 *         description: Lịch sử chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [user, assistant]
 *                           content:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Mock chat history
    const mockHistory = [
      {
        id: '1',
        role: 'user',
        content: 'Xin chào! Nhà hàng có những món gì ngon?',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Xin chào! Nhà hàng chúng tôi có nhiều món ngon như Phở Bò, Bún Bò Huế, Cơm Tấm...',
        timestamp: new Date(Date.now() - 3500000).toISOString()
      },
      {
        id: '3',
        role: 'user',
        content: 'Tôi muốn đặt bàn cho 4 người',
        timestamp: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: '4',
        role: 'assistant',
        content: 'Tôi sẽ giúp bạn đặt bàn. Bạn muốn đặt vào thời gian nào?',
        timestamp: new Date(Date.now() - 1700000).toISOString()
      }
    ];

    const paginatedHistory = mockHistory.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        history: paginatedHistory,
        total: mockHistory.length,
        limit,
        offset
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử chat',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /chat/history:
 *   delete:
 *     summary: Xóa lịch sử chat
 *     description: Xóa toàn bộ lịch sử chat của người dùng
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Xóa lịch sử thành công
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
 *                   example: "Xóa lịch sử chat thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted_count:
 *                       type: integer
 *                       example: 10
 *                     deleted_at:
 *                       type: string
 *                       format: date-time
 */
router.delete('/history', async (req, res) => {
  try {
    // Mock deletion
    const deletedCount = Math.floor(Math.random() * 20) + 1;

    res.json({
      success: true,
      message: 'Xóa lịch sử chat thành công',
      data: {
        deleted_count: deletedCount,
        deleted_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa lịch sử chat',
      error: error.message
    });
  }
});

// ==================== NEW HTTP METHODS ====================

/**
 * @swagger
 * /chat:
 *   head:
 *     summary: Get chat metadata
 *     description: Lấy metadata của chat service
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Chat service metadata
 *         headers:
 *           X-Service-Status:
 *             description: Trạng thái service
 *             schema:
 *               type: string
 */
router.head('/', createHeadHandler(async (req, res) => {
  res.json({
    success: true,
    data: { status: 'online' },
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /chat:
 *   options:
 *     summary: Get supported HTTP methods for chat
 *     description: Trả về các HTTP methods được hỗ trợ cho chat API
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Supported methods information
 */
router.options('/', createOptionsHandler('chat', ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS']));
router.options('/status', createOptionsHandler('chat/status', ['GET', 'HEAD', 'OPTIONS']));
router.options('/generate-description', createOptionsHandler('chat/generate-description', ['POST', 'OPTIONS']));

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Get chat history
 *     description: Lấy lịch sử chat của người dùng
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng tin nhắn
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset cho pagination
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       role:
 *                         type: string
 *                         enum: [user, assistant]
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Mock chat history
    const chatHistory = [
      {
        id: 1,
        role: 'user',
        content: 'Xin chào, tôi muốn đặt món',
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Xin chào! Tôi có thể giúp bạn đặt món. Bạn muốn xem menu không?',
        timestamp: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      message: 'Lấy lịch sử chat thành công',
      data: chatHistory.slice(offset, offset + limit),
      pagination: {
        total: chatHistory.length,
        limit,
        offset,
        hasMore: offset + limit < chatHistory.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử chat',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /chat/{id}:
 *   get:
 *     summary: Get specific chat conversation
 *     description: Lấy cuộc trò chuyện cụ thể theo ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chat conversation retrieved
 *       404:
 *         description: Chat not found
 */
router.get('/:id', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    // Mock chat conversation
    const conversation = {
      id: chatId,
      messages: [
        {
          role: 'user',
          content: 'Tôi muốn đặt phở bò',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: 'Phở bò là món đặc sản của chúng tôi! Giá 45.000 VNĐ. Bạn có muốn đặt không?',
          timestamp: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Lấy cuộc trò chuyện thành công',
      data: conversation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy cuộc trò chuyện',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /chat/{id}:
 *   delete:
 *     summary: Delete chat conversation
 *     description: Xóa cuộc trò chuyện theo ID
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 *       404:
 *         description: Chat not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    // Mock deletion
    res.json({
      success: true,
      message: 'Xóa cuộc trò chuyện thành công',
      data: { id: chatId },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa cuộc trò chuyện',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /chat/{id}:
 *   patch:
 *     summary: Update chat conversation
 *     description: Cập nhật thông tin cuộc trò chuyện
 *     tags: [Chat]
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
 *               title:
 *                 type: string
 *                 example: "Đặt món phở bò"
 *               archived:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Chat updated successfully
 *       404:
 *         description: Chat not found
 */
router.patch('/:id', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const updates = req.body;

    // Mock update
    const updatedChat = {
      id: chatId,
      title: updates.title || 'Cuộc trò chuyện',
      archived: updates.archived || false,
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Cập nhật cuộc trò chuyện thành công',
      data: updatedChat,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật cuộc trò chuyện',
      error: error.message
    });
  }
});

// Add global middleware
router.use(logHttpMethod);
router.use(handleHeadRequest);

module.exports = router;
