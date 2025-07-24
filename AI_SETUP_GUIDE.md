'# Hướng dẫn Setup AI cho Restaurant API

## Tổng quan

Dự án đã được tích hợp với 2 dịch vụ AI:
- **Gemini AI** (Google): Dịch vụ chính
- **Groq AI**: Dịch vụ phụ (nhanh hơn, miễn phí)

## Cài đặt API Keys

### 1. Gemini AI (Google)

1. Truy cập: https://makersuite.google.com/app/apikey
2. Đăng nhập với Google account
3. Click "Create API Key"
4. Copy API key và thêm vào file `.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 2. Groq AI

1. Truy cập: https://console.groq.com/keys
2. Đăng ký tài khoản miễn phí
3. Tạo API key mới
4. Copy API key và thêm vào file `.env`:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

## Cấu hình

### File .env
```bash
# AI Service Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### Ưu tiên sử dụng
- **Gemini AI**: Được ưu tiên sử dụng đầu tiên
- **Groq AI**: Sử dụng khi Gemini không khả dụng hoặc được chỉ định
- **Fallback**: Phản hồi tĩnh khi cả 2 dịch vụ đều lỗi

## API Endpoints

### 1. Chat với AI
```
POST /api/chat
```

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Nhà hàng có những món gì ngon?"
    }
  ],
  "options": {
    "useGroq": false,
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Nhà hàng Ẩm Thực Phương Nam có nhiều món đặc sản...",
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Tạo mô tả món ăn
```
POST /api/chat/generate-description
```

**Request:**
```json
{
  "foodName": "Phở Bò Tái",
  "ingredients": "Thịt bò, bánh phở, hành lá",
  "category": "Món chính"
}
```

### 3. Kiểm tra trạng thái AI
```
GET /api/chat/status
```

### 4. Thông tin nhà hàng
```
GET /api/chat/restaurant-info
```

### 5. Câu hỏi gợi ý
```
GET /api/chat/suggested-questions
```

### 6. Health check
```
GET /api/chat/health
```

## Tính năng AI

### 1. Chatbot thông minh
- Trả lời câu hỏi về nhà hàng
- Tư vấn món ăn
- Hỗ trợ đặt bàn
- Giải thích về món ăn

### 2. Tạo mô tả món ăn
- Tự động tạo mô tả hấp dẫn
- Dựa trên tên món, nguyên liệu, danh mục
- Phong cách miền Nam

### 3. Context nhà hàng
- AI được training với thông tin nhà hàng
- Phong cách trả lời thân thiện
- Tập trung vào ẩm thực miền Nam

## Cấu hình nâng cao

### Thay đổi model AI

**File: `backend/services/AIService.js`**
```javascript
// Gemini models
this.geminiModel = 'gemini-1.5-flash'; // hoặc 'gemini-1.5-pro'

// Groq models  
this.groqModel = 'llama3-8b-8192'; // hoặc 'mixtral-8x7b-32768'
```

### Tùy chỉnh context
```javascript
this.restaurantContext = `
Bạn là trợ lý AI của nhà hàng...
// Thêm thông tin tùy chỉnh
`;
```

### Cấu hình generation
```javascript
generationConfig: {
  temperature: 0.7,        // Độ sáng tạo (0-2)
  maxOutputTokens: 1000,   // Số token tối đa
  topP: 0.8,              // Nucleus sampling
  topK: 40                // Top-K sampling
}
```

## Troubleshooting

### 1. Lỗi API Key
```
Error: API key not found
```
**Giải pháp:** Kiểm tra file `.env` và đảm bảo API key đúng

### 2. Lỗi quota
```
Error: Quota exceeded
```
**Giải pháp:** 
- Gemini: Kiểm tra quota tại Google AI Studio
- Groq: Đợi reset quota hoặc upgrade plan

### 3. Lỗi network
```
Error: Network timeout
```
**Giải pháp:** Kiểm tra kết nối internet và firewall

### 4. AI không phản hồi
**Kiểm tra:**
1. API keys có đúng không
2. Dịch vụ có hoạt động không (`GET /api/chat/status`)
3. Log server có lỗi gì không

## Monitoring

### Kiểm tra trạng thái
```bash
curl http://localhost:3000/api/chat/health
```

### Xem logs
```bash
tail -f backend/logs/combined.log
```

### Test API
```bash
# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Xin chào"}]}'

# Test status  
curl http://localhost:3000/api/chat/status
```

## Bảo mật

### 1. Bảo vệ API Keys
- Không commit API keys vào git
- Sử dụng environment variables
- Rotate keys định kỳ

### 2. Rate limiting
- Đã có rate limiting cho `/api/chat`
- Có thể tùy chỉnh trong `express-rate-limit`

### 3. Input validation
- Validate tất cả input từ user
- Giới hạn độ dài message
- Sanitize content

## Performance

### 1. Caching
- Có thể cache responses phổ biến
- Sử dụng Redis cho production

### 2. Timeout
- Set timeout cho AI requests
- Fallback khi timeout

### 3. Load balancing
- Rotate giữa Gemini và Groq
- Failover tự động

## Swagger Documentation

Tất cả AI endpoints đã được document trong Swagger UI:
- Truy cập: http://localhost:3000/api-docs
- Tìm section "Chat" để xem chi tiết

## Liên hệ

Nếu có vấn đề với AI integration, vui lòng:
1. Kiểm tra logs
2. Test với Swagger UI
3. Liên hệ team development
