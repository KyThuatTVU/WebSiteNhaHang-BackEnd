// Chat Controller - AI Chat Integration
const AIService = require('../services/AIService');
const { catchAsync, AppError } = require('../utils/helpers');
const { logApiResponse } = require('../utils/logger');

class ChatController {
  /**
   * Handle chat messages
   */
  static sendMessage = catchAsync(async (req, res) => {
    console.log('🤖 Chat request received:', req.body);
    const { messages, options = {} } = req.body;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required and cannot be empty',
        code: 'INVALID_MESSAGES'
      });
    }

    // Validate message format
    const isValidMessages = messages.every(msg => 
      msg && 
      typeof msg === 'object' && 
      msg.role && 
      msg.content &&
      ['user', 'assistant', 'system'].includes(msg.role)
    );

    if (!isValidMessages) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message format. Each message must have role and content',
        code: 'INVALID_MESSAGE_FORMAT'
      });
    }

    // Limit conversation history
    const maxMessages = 20;
    const limitedMessages = messages.slice(-maxMessages);

    try {
      // Generate AI response
      const aiResponse = await AIService.generateChatResponse(limitedMessages, options);

      const response = {
        success: true,
        message: aiResponse.message,
        provider: aiResponse.provider,
        model: aiResponse.model,
        timestamp: new Date().toISOString()
      };

      logApiResponse(req, res, response);
      res.json(response);

    } catch (error) {
      const fallbackResponse = AIService.getFallbackResponse();
      
      const response = {
        success: true, // Still return success to avoid breaking frontend
        message: fallbackResponse.message,
        provider: fallbackResponse.provider,
        model: fallbackResponse.model,
        error: 'AI service temporarily unavailable',
        timestamp: new Date().toISOString()
      };

      logApiResponse(req, res, response);
      res.json(response);
    }
  });

  /**
   * Generate food description using AI
   */
  static generateFoodDescription = catchAsync(async (req, res) => {
    const { foodName, ingredients, category } = req.body;

    if (!foodName || typeof foodName !== 'string' || foodName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Food name is required',
        code: 'INVALID_FOOD_NAME'
      });
    }

    try {
      const description = await AIService.generateFoodDescription(
        foodName.trim(),
        ingredients || '',
        category || ''
      );

      const response = {
        success: true,
        data: {
          foodName: foodName.trim(),
          description: description || 'Không thể tạo mô tả cho món ăn này.',
          generated: !!description
        },
        timestamp: new Date().toISOString()
      };

      logApiResponse(req, res, response);
      res.json(response);

    } catch (error) {
      const response = {
        success: false,
        message: 'Không thể tạo mô tả món ăn',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      logApiResponse(req, res, response);
      res.status(500).json(response);
    }
  });

  /**
   * Get AI service status
   */
  static getServiceStatus = catchAsync(async (req, res) => {
    const status = AIService.getServiceStatus();

    const response = {
      success: true,
      data: {
        services: status,
        available: status.gemini.available || status.groq.available,
        primary: status.gemini.available ? 'gemini' : (status.groq.available ? 'groq' : 'none')
      },
      timestamp: new Date().toISOString()
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get restaurant information for chatbot
   */
  static getRestaurantInfo = catchAsync(async (req, res) => {
    const restaurantInfo = {
      name: 'Ẩm Thực Phương Nam',
      description: 'Nhà hàng chuyên về các món ăn truyền thống miền Nam Việt Nam',
      specialties: [
        'Phở Bò',
        'Bún Bò Huế', 
        'Bánh Xèo',
        'Gỏi Cuốn',
        'Cơm Tấm',
        'Bánh Khọt'
      ],
      contact: {
        phone: '0123-456-789',
        email: 'info@amthucphuongnam.com',
        address: '123 Đường ABC, Quận XYZ, TP.HCM'
      },
      hours: {
        monday: '10:00 - 22:00',
        tuesday: '10:00 - 22:00',
        wednesday: '10:00 - 22:00',
        thursday: '10:00 - 22:00',
        friday: '10:00 - 22:00',
        saturday: '09:00 - 23:00',
        sunday: '09:00 - 23:00'
      },
      features: [
        'Không gian ấm cúng',
        'Hương vị đậm đà truyền thống',
        'Nguyên liệu tươi ngon',
        'Phục vụ tận tình',
        'Giá cả hợp lý'
      ]
    };

    const response = {
      success: true,
      data: restaurantInfo,
      timestamp: new Date().toISOString()
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get suggested questions for chatbot
   */
  static getSuggestedQuestions = catchAsync(async (req, res) => {
    const suggestedQuestions = [
      'Nhà hàng có những món ăn gì đặc biệt?',
      'Giờ mở cửa của nhà hàng như thế nào?',
      'Tôi muốn đặt bàn cho 4 người',
      'Món nào phù hợp cho người ăn chay?',
      'Giá cả các món ăn như thế nào?',
      'Nhà hàng có giao hàng tận nơi không?',
      'Có combo nào cho gia đình không?',
      'Món nào cay nhất trong menu?',
      'Nhà hàng có chỗ đậu xe không?',
      'Có thể thanh toán bằng thẻ không?'
    ];

    const response = {
      success: true,
      data: {
        questions: suggestedQuestions,
        total: suggestedQuestions.length
      },
      timestamp: new Date().toISOString()
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Health check for chat service
   */
  static healthCheck = catchAsync(async (req, res) => {
    console.log('🏥 Health check request received');
    const status = AIService.getServiceStatus();
    const isHealthy = status.gemini.available || status.groq.available;

    const response = {
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy ? 'Chat service is operational' : 'Chat service is running with limited functionality',
      services: status,
      timestamp: new Date().toISOString()
    };

    const statusCode = isHealthy ? 200 : 503;
    
    logApiResponse(req, res, response);
    res.status(statusCode).json(response);
  });
}

module.exports = ChatController;
