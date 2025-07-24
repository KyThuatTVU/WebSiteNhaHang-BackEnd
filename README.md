# 🍽️ Restaurant API - Enterprise Architecture

## 📋 Tổng Quan

API quản lý nhà hàng được xây dựng theo **chuẩn doanh nghiệp** với kiến trúc **MVC**, **separation of concerns**, và **best practices**.

## 🏗️ Kiến Trúc Enterprise

### 📁 **Cấu Trúc Thư Mục:**
```
apiGemini/
├── config/                 # Configuration files
│   ├── database.js         # Database connection & pool
│   └── multer.js          # File upload configuration
├── controllers/            # Business logic layer
│   ├── FoodController.js   # Food business logic
│   └── CategoryController.js # Category business logic
├── middleware/             # Custom middleware
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error handling
├── models/                 # Data access layer
│   ├── FoodModel.js        # Food data operations
│   └── CategoryModel.js    # Category data operations
├── routes/                 # API routes
│   ├── index.js           # Route aggregator
│   ├── foodRoutes.js      # Food endpoints
│   └── categoryRoutes.js  # Category endpoints
├── utils/                  # Utility functions
│   ├── logger.js          # Logging system
│   └── helpers.js         # Helper functions
├── logs/                   # Log files
├── images/                 # Uploaded images
├── app.js                  # Application setup
├── server.js              # Entry point
├── package.json           # Dependencies
├── .env.example           # Environment template
└── README.md              # Documentation
```

### 🎯 **Design Patterns:**

#### **1. MVC Architecture:**
- **Models:** Data access và business rules
- **Views:** JSON API responses
- **Controllers:** Request handling và business logic

#### **2. Separation of Concerns:**
- **Config:** Database, multer, environment
- **Middleware:** Validation, error handling, logging
- **Utils:** Reusable helper functions

#### **3. Dependency Injection:**
- **Database pool** injection vào models
- **Logger** injection vào controllers
- **Helper functions** injection

## 🔧 **Core Components**

### **📊 Models (Data Layer):**
```javascript
// FoodModel.js - Data Access Object
class FoodModel {
  static async getAll(filters, pagination) {
    // Database operations
    // Error handling
    // Logging
  }
  
  static async create(foodData) {
    // Validation
    // Database insert
    // Return formatted data
  }
}
```

### **🎮 Controllers (Business Layer):**
```javascript
// FoodController.js - Business Logic
class FoodController {
  static getAllFoods = catchAsync(async (req, res) => {
    // Extract parameters
    // Call model methods
    // Format response
    // Send JSON response
  });
}
```

### **🛣️ Routes (API Layer):**
```javascript
// foodRoutes.js - API Endpoints
router.get('/', validateFoodQuery, FoodController.getAllFoods);
router.post('/', upload.single('hinh_anh'), validateFoodItem, FoodController.createFood);
```

## 🛡️ **Security & Middleware**

### **🔒 Security Features:**
- **Helmet:** Security headers
- **CORS:** Cross-origin protection
- **Rate Limiting:** DDoS protection
- **Input Validation:** SQL injection prevention
- **File Upload Security:** Type và size validation

### **📝 Validation Middleware:**
```javascript
const validateFoodItem = [
  body('ten_mon').trim().isLength({ min: 2, max: 255 }),
  body('gia').isFloat({ min: 0 }),
  handleValidationErrors
];
```

### **🚨 Error Handling:**
```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

## 📊 **Logging System**

### **📈 Winston Logger:**
```javascript
// Structured logging
logger.info('Request completed', {
  method: req.method,
  url: req.originalUrl,
  statusCode: res.statusCode,
  duration: `${duration}ms`
});
```

### **📁 Log Files:**
- **error.log:** Error-level logs
- **combined.log:** All logs
- **Console:** Development output

## 🔄 **Database Layer**
# Commit của KyThuat

### **🏊 Connection Pooling:**
```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  connectionLimit: 10,
  queueLimit: 0,
  reconnect: true
});
```

### **📊 Query Logging:**
```javascript
const logDatabaseQuery = (query, params, duration) => {
  logger.debug('Database query', {
    query: query.replace(/\s+/g, ' ').trim(),
    params,
    duration: `${duration}ms`
  });
};
```

## 🚀 **Performance Features**

### **⚡ Optimizations:**
- **Connection pooling** cho database
- **Compression** middleware
- **Static file caching**
- **Query optimization**
- **Pagination** cho large datasets

### **📈 Monitoring:**
- **Request logging** với duration
- **Database query timing**
- **Error tracking**
- **Performance metrics**

## 🧪 **Testing Architecture**

### **🔬 Test Structure:**
```
tests/
├── unit/                   # Unit tests
│   ├── models/            # Model tests
│   ├── controllers/       # Controller tests
│   └── utils/             # Utility tests
├── integration/           # Integration tests
│   └── api/              # API endpoint tests
└── fixtures/              # Test data
```

## 📚 **API Documentation**

### **🌐 Endpoints:**

#### **Foods API:**
- `GET /api/foods` - List foods với filtering
- `GET /api/foods/:id` - Get food by ID
- `POST /api/foods` - Create food
- `PUT /api/foods/:id` - Update food
- `DELETE /api/foods/:id` - Delete food
- `PATCH /api/foods/:id/stock` - Update stock

#### **Categories API:**
- `GET /api/categories` - List categories
- `GET /api/categories/:id/foods` - Foods by category
- `POST /api/categories` - Create category

### **📊 Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

## 🔧 **Development Setup**

### **📦 Installation:**
```bash
# Clone repository
git clone <repository-url>
cd apiGemini

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### **🗄️ Database Setup:**
```sql
-- Create database
CREATE DATABASE QuanLyNhaHang;

-- Create tables
-- (Run your existing SQL schema)
```

## 🚀 **Deployment**

### **🌐 Production Setup:**
```bash
# Set environment
NODE_ENV=production

# Install production dependencies
npm ci --only=production

# Start server
npm start
```

### **🐳 Docker Support:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 **Scalability Features**

### **🔄 Horizontal Scaling:**
- **Stateless design** - No server-side sessions
- **Database connection pooling**
- **Load balancer ready**
- **Microservice architecture ready**

### **📊 Monitoring Ready:**
- **Health check endpoints**
- **Metrics collection**
- **Error tracking**
- **Performance monitoring**

## 🎯 **Best Practices Implemented**

### **✅ Code Quality:**
- **ESLint** configuration
- **Prettier** formatting
- **Consistent naming** conventions
- **Error handling** patterns
- **Input validation**
- **Security headers**

### **✅ Architecture:**
- **Single Responsibility Principle**
- **Dependency Injection**
- **Interface Segregation**
- **Don't Repeat Yourself (DRY)**
- **SOLID principles**

### **✅ API Design:**
- **RESTful endpoints**
- **Consistent response format**
- **Proper HTTP status codes**
- **Comprehensive error messages**
- **API versioning ready**

## 🔮 **Future Enhancements**

### **🚀 Planned Features:**
- [ ] **Authentication & Authorization** (JWT)
- [ ] **API Rate Limiting** per user
- [ ] **Caching layer** (Redis)
- [ ] **Real-time updates** (WebSocket)
- [ ] **API documentation** (Swagger)
- [ ] **Unit tests** coverage
- [ ] **CI/CD pipeline**
- [ ] **Docker containerization**
- [ ] **Monitoring dashboard**
- [ ] **Performance analytics**

## 📞 **Support**

### **🐛 Issues:**
- Create issue trên GitHub repository
- Include error logs và steps to reproduce
- Specify environment details

### **📧 Contact:**
- **Email:** support@restaurant-api.com
- **Documentation:** `/api/docs`
- **Health Check:** `/api/health`

---

**🎉 Đây là một Enterprise-level API với architecture chuyên nghiệp!**
#   W e b S i t e N h a H a n g - B a c k E n d  
 