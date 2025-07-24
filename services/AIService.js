// AI Service - Gemini & Groq Integration
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/helpers');

class AIService {
  constructor() {
    // Initialize Gemini AI
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.gemini = this.geminiApiKey ? new GoogleGenerativeAI(this.geminiApiKey) : null;
    
    // Initialize Groq AI
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groq = this.groqApiKey ? new Groq({ apiKey: this.groqApiKey }) : null;
    
    // Default model configurations - Updated to latest models
    this.geminiModel = 'gemini-2.0-flash';
    this.groqModel = 'llama3-8b-8192';
    
    // Restaurant context for AI responses
    this.restaurantContext = `
Bạn là trợ lý AI của nhà hàng "Ẩm Thực Phương Nam" chuyên món ăn miền Nam.

MENU NHÀ HÀNG:
KHAI VỊ: Gỏi Ngó Sen Tôm Thịt (85k), Chả Giò Phương Nam (75k)
MÓN CHÍNH: Cá Lóc Nướng Trui (185k), Sườn Nướng Chao (165k)
CANH LẨU: Lẩu Mắm (250k), Lẩu Cá Kèo (225k)
CƠM BÚN: Bánh Xèo Miền Tây (95k), Cơm Cháy Sườn Rim (125k)
TRÁNG MIỆNG: Chè Bắp (45k)
ĐỒ UỐNG: Nước Sâm Lạnh (35k), Trà Tắc (30k)

Hãy tư vấn món ăn thân thiện, nói giá cụ thể, chỉ giới thiệu món có trong menu.
`;

    this.initializeServices();
  }

  initializeServices() {
    if (this.gemini) {
      logger.info('✅ Gemini AI service initialized');
    } else {
      logger.warn('⚠️ Gemini API key not found. Set GEMINI_API_KEY in .env');
    }

    if (this.groq) {
      logger.info('✅ Groq AI service initialized');
    } else {
      logger.warn('⚠️ Groq API key not found. Set GROQ_API_KEY in .env');
    }

    if (!this.gemini && !this.groq) {
      logger.error('❌ No AI services available. Please configure API keys.');
    }
  }

  /**
   * Generate chat response using available AI service
   * @param {Array} messages - Chat history
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} AI response
   */
  async generateChatResponse(messages, options = {}) {
    try {
      const { 
        useGroq = false, 
        temperature = 0.7,
        maxTokens = 1000 
      } = options;

      // Try Groq first if requested or Gemini is not available
      if (useGroq || !this.gemini) {
        if (this.groq) {
          return await this.generateGroqResponse(messages, { temperature, maxTokens });
        }
      }

      // Fallback to Gemini
      if (this.gemini) {
        return await this.generateGeminiResponse(messages, { temperature, maxTokens });
      }

      throw new Error('No AI service available');

    } catch (error) {
      logger.error('AI Service Error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Generate response using Gemini AI
   */
  async generateGeminiResponse(messages, options = {}) {
    try {
      const model = this.gemini.getGenerativeModel({
        model: this.geminiModel,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1000,
        }
      });

      // Convert messages to Gemini format
      const prompt = this.buildGeminiPrompt(messages);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout')), 15000); // 15 second timeout
      });

      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise
      ]);

      const response = await result.response;
      const text = response.text();

      logger.info('✅ Gemini 2.0 Flash response generated successfully');

      return {
        success: true,
        message: text,
        provider: 'gemini',
        model: this.geminiModel
      };

    } catch (error) {
      logger.error('Gemini API Error:', error);
      throw error;
    }
  }

  /**
   * Generate response using Groq AI
   */
  async generateGroqResponse(messages, options = {}) {
    try {
      // Convert messages to Groq format
      const groqMessages = this.buildGroqMessages(messages);

      const completion = await this.groq.chat.completions.create({
        messages: groqMessages,
        model: this.groqModel,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: 1,
        stream: false
      });

      const responseText = completion.choices[0]?.message?.content || '';

      logger.info('✅ Groq response generated successfully');

      return {
        success: true,
        message: responseText,
        provider: 'groq',
        model: this.groqModel
      };

    } catch (error) {
      logger.error('Groq API Error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Gemini AI
   */
  buildGeminiPrompt(messages) {
    let prompt = this.restaurantContext + '\n\n';
    
    // Add conversation history
    messages.forEach(msg => {
      if (msg.role === 'user') {
        prompt += `Khách hàng: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Trợ lý: ${msg.content}\n`;
      }
    });

    prompt += '\nTrợ lý: ';
    return prompt;
  }

  /**
   * Build messages for Groq AI
   */
  buildGroqMessages(messages) {
    const groqMessages = [
      {
        role: 'system',
        content: this.restaurantContext
      }
    ];

    // Add conversation history
    messages.forEach(msg => {
      groqMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

    return groqMessages;
  }

  /**
   * Generate food description using AI
   */
  async generateFoodDescription(foodName, ingredients = '', category = '') {
    try {
      const prompt = `
Tạo mô tả hấp dẫn cho món ăn "${foodName}" của nhà hàng Ẩm Thực Phương Nam.

Thông tin món ăn:
- Tên món: ${foodName}
- Nguyên liệu: ${ingredients || 'Không có thông tin'}
- Danh mục: ${category || 'Không có thông tin'}

Yêu cầu:
- Mô tả ngắn gọn (2-3 câu)
- Nhấn mạnh hương vị đặc trưng
- Phong cách miền Nam
- Tạo cảm giác thèm ăn

Chỉ trả về mô tả, không cần thêm thông tin khác.
`;

      const messages = [{ role: 'user', content: prompt }];
      const response = await this.generateChatResponse(messages, { temperature: 0.8 });

      return response.success ? response.message : null;

    } catch (error) {
      logger.error('Error generating food description:', error);
      return null;
    }
  }

  /**
   * Get fallback response when AI services fail
   */
  getFallbackResponse() {
    const menuResponse = `
Chào bạn! Chào mừng đến với Ẩm Thực Phương Nam! 🍽️

Nhà hàng chúng tôi có các món ngon sau:

🥗 KHAI VỊ:
• Gỏi Ngó Sen Tôm Thịt - 85.000đ
• Chả Giò Phương Nam - 75.000đ

🍖 MÓN CHÍNH:
• Cá Lóc Nướng Trui - 185.000đ
• Sườn Nướng Chao - 165.000đ

🍲 CANH & LẨU:
• Lẩu Mắm - 250.000đ
• Lẩu Cá Kèo - 225.000đ

🍚 CƠM & BÚN:
• Bánh Xèo Miền Tây - 95.000đ
• Cơm Cháy Sườn Rim - 125.000đ

🍮 TRÁNG MIỆNG:
• Chè Bắp - 45.000đ

🥤 ĐỒ UỐNG:
• Nước Sâm Lạnh - 35.000đ
• Trà Tắc - 30.000đ

Bạn muốn thử món nào? Tôi có thể tư vấn thêm! 😊
    `;

    return {
      success: true,
      message: menuResponse.trim(),
      provider: 'fallback',
      model: 'static'
    };
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      gemini: {
        available: !!this.gemini,
        model: this.geminiModel,
        configured: !!this.geminiApiKey
      },
      groq: {
        available: !!this.groq,
        model: this.groqModel,
        configured: !!this.groqApiKey
      }
    };
  }
}

module.exports = new AIService();
