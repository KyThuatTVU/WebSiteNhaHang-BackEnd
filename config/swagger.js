// Swagger Configuration - Enterprise Architecture
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Restaurant API - Ẩm Thực Phương Nam',
    version: '1.0.0',
    description: `
      API quản lý nhà hàng Ẩm Thực Phương Nam
      
      ## Tính năng chính:
      - Quản lý danh mục món ăn
      - Quản lý thông tin món ăn
      - Upload và quản lý hình ảnh
      - Tích hợp AI để tạo mô tả món ăn
      - Chatbot AI hỗ trợ khách hàng
      - Tích hợp Gemini AI và Groq AI
      
      ## Xác thực:
      API sử dụng JWT tokens để xác thực. Thêm token vào header:
      \`Authorization: Bearer <your-token>\`
    `,
    contact: {
      name: 'API Support',
      email: 'support@amthucphuongnam.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server'
    },
    {
      url: 'https://api.amthucphuongnam.com/api',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme'
      }
    },
    schemas: {
      // Error Response Schema
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Có lỗi xảy ra'
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE'
          },
          details: {
            type: 'object',
            description: 'Chi tiết lỗi (chỉ trong development)'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Success Response Schema
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Thành công'
          },
          data: {
            type: 'object',
            description: 'Dữ liệu trả về'
          },
          pagination: {
            $ref: '#/components/schemas/Pagination'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Pagination Schema
      Pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Tổng số records',
            example: 100
          },
          page: {
            type: 'integer',
            description: 'Trang hiện tại',
            example: 1
          },
          limit: {
            type: 'integer',
            description: 'Số items per page',
            example: 20
          },
          totalPages: {
            type: 'integer',
            description: 'Tổng số trang',
            example: 5
          },
          hasNext: {
            type: 'boolean',
            description: 'Có trang tiếp theo',
            example: true
          },
          hasPrev: {
            type: 'boolean',
            description: 'Có trang trước',
            example: false
          }
        }
      },
      // User Schema
      User: {
        type: 'object',
        required: ['full_name', 'email', 'password'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID người dùng',
            example: 1
          },
          full_name: {
            type: 'string',
            description: 'Họ tên đầy đủ',
            example: 'Nguyễn Văn A',
            minLength: 2,
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email',
            example: 'user@example.com'
          },
          phone: {
            type: 'string',
            description: 'Số điện thoại',
            example: '0123456789',
            pattern: '^[0-9]{10,11}$'
          },
          address: {
            type: 'string',
            description: 'Địa chỉ',
            example: 'Trà Vinh, Việt Nam'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Auth Request Schemas
      RegisterRequest: {
        type: 'object',
        required: ['full_name', 'email', 'phone', 'password'],
        properties: {
          full_name: {
            type: 'string',
            description: 'Họ tên đầy đủ',
            example: 'Nguyễn Văn A',
            minLength: 2,
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email',
            example: 'user@example.com'
          },
          phone: {
            type: 'string',
            description: 'Số điện thoại',
            example: '0123456789',
            pattern: '^[0-9]{10,11}$'
          },
          password: {
            type: 'string',
            description: 'Mật khẩu',
            example: 'password123',
            minLength: 6
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email',
            example: 'user@example.com'
          },
          password: {
            type: 'string',
            description: 'Mật khẩu',
            example: 'password123'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Đăng nhập thành công'
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User'
              },
              token: {
                type: 'string',
                description: 'JWT access token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              },
              refreshToken: {
                type: 'string',
                description: 'JWT refresh token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Category Schema
      Category: {
        type: 'object',
        required: ['name'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID danh mục',
            example: 1
          },
          name: {
            type: 'string',
            description: 'Tên danh mục',
            example: 'Món chính',
            minLength: 1,
            maxLength: 100
          },
          description: {
            type: 'string',
            description: 'Mô tả danh mục',
            example: 'Các món ăn chính của nhà hàng',
            maxLength: 500
          },
          image_url: {
            type: 'string',
            description: 'URL hình ảnh danh mục',
            example: '/images/category1.jpg'
          },
          is_active: {
            type: 'boolean',
            description: 'Trạng thái hoạt động',
            example: true
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo',
            example: '2024-01-01T00:00:00.000Z'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Food Schema
      Food: {
        type: 'object',
        required: ['name', 'price', 'category_id'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID món ăn',
            example: 1
          },
          name: {
            type: 'string',
            description: 'Tên món ăn',
            example: 'Phở Bò',
            minLength: 1,
            maxLength: 200
          },
          description: {
            type: 'string',
            description: 'Mô tả món ăn',
            example: 'Phở bò truyền thống với nước dùng đậm đà',
            maxLength: 1000
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Giá món ăn (VNĐ)',
            example: 50000,
            minimum: 0
          },
          image_url: {
            type: 'string',
            description: 'URL hình ảnh món ăn',
            example: '/images/pho-bo.jpg'
          },
          category_id: {
            type: 'integer',
            description: 'ID danh mục',
            example: 1
          },
          category_name: {
            type: 'string',
            description: 'Tên danh mục',
            example: 'Món chính'
          },
          is_available: {
            type: 'boolean',
            description: 'Trạng thái có sẵn',
            example: true
          },
          ingredients: {
            type: 'string',
            description: 'Nguyên liệu',
            example: 'Thịt bò, bánh phở, hành lá, ngò gai'
          },
          cooking_time: {
            type: 'integer',
            description: 'Thời gian chế biến (phút)',
            example: 15
          },
          calories: {
            type: 'integer',
            description: 'Lượng calo',
            example: 350
          },
          spicy_level: {
            type: 'integer',
            description: 'Độ cay (1-5)',
            example: 2,
            minimum: 1,
            maximum: 5
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo',
            example: '2024-01-01T00:00:00.000Z'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Reservation Schemas
      Reservation: {
        type: 'object',
        required: ['ten_khach', 'sdt', 'ngay', 'gio', 'so_luong_khach'],
        properties: {
          id_datban: {
            type: 'integer',
            description: 'ID đặt bàn',
            example: 1
          },
          ten_khach: {
            type: 'string',
            description: 'Tên khách hàng',
            example: 'Nguyễn Văn A',
            minLength: 2,
            maxLength: 100
          },
          sdt: {
            type: 'string',
            description: 'Số điện thoại',
            example: '0123456789',
            pattern: '^[0-9]{10,11}$'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email (tùy chọn)',
            example: 'user@example.com'
          },
          ngay: {
            type: 'string',
            format: 'date',
            description: 'Ngày đặt bàn',
            example: '2024-01-15'
          },
          gio: {
            type: 'string',
            format: 'time',
            description: 'Giờ đặt bàn',
            example: '19:00'
          },
          so_luong_khach: {
            type: 'integer',
            description: 'Số lượng khách',
            example: 4,
            minimum: 1,
            maximum: 20
          },
          ghi_chu: {
            type: 'string',
            description: 'Ghi chú',
            example: 'Bàn gần cửa sổ',
            maxLength: 500
          },
          trang_thai: {
            type: 'string',
            enum: ['cho_xac_nhan', 'da_xac_nhan', 'da_huy'],
            description: 'Trạng thái đặt bàn',
            example: 'cho_xac_nhan'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian tạo',
            example: '2024-01-01T00:00:00.000Z'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Thời gian cập nhật',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Chat Schemas
      ChatMessage: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: {
            type: 'string',
            enum: ['user', 'assistant', 'system'],
            description: 'Vai trò trong cuộc trò chuyện',
            example: 'user'
          },
          content: {
            type: 'string',
            description: 'Nội dung tin nhắn',
            example: 'Tôi muốn đặt món phở bò',
            minLength: 1,
            maxLength: 2000
          }
        }
      },
      ChatRequest: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ChatMessage'
            },
            description: 'Lịch sử cuộc trò chuyện',
            minItems: 1,
            maxItems: 20
          },
          options: {
            type: 'object',
            properties: {
              useGroq: {
                type: 'boolean',
                description: 'Sử dụng Groq AI thay vì Gemini',
                example: false
              },
              temperature: {
                type: 'number',
                description: 'Độ sáng tạo của AI (0-2)',
                example: 0.7,
                minimum: 0,
                maximum: 2
              },
              maxTokens: {
                type: 'integer',
                description: 'Số token tối đa cho response',
                example: 1000,
                minimum: 100,
                maximum: 2000
              }
            }
          }
        }
      },
      ChatResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Phản hồi từ AI',
            example: 'Phở bò là món đặc sản của chúng tôi! Bạn muốn phở bò tái hay phở bò chín?'
          },
          provider: {
            type: 'string',
            description: 'Nhà cung cấp AI được sử dụng',
            example: 'gemini'
          },
          model: {
            type: 'string',
            description: 'Model AI được sử dụng',
            example: 'gemini-pro'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Food Description Generation
      FoodDescriptionRequest: {
        type: 'object',
        required: ['foodName'],
        properties: {
          foodName: {
            type: 'string',
            description: 'Tên món ăn',
            example: 'Bún Bò Huế',
            minLength: 2,
            maxLength: 100
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Danh sách nguyên liệu',
            example: ['bún', 'thịt bò', 'chả cua', 'ớt']
          },
          options: {
            type: 'object',
            properties: {
              style: {
                type: 'string',
                enum: ['traditional', 'modern', 'poetic'],
                description: 'Phong cách mô tả',
                example: 'traditional'
              },
              length: {
                type: 'string',
                enum: ['short', 'medium', 'long'],
                description: 'Độ dài mô tả',
                example: 'medium'
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Không có quyền truy cập',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Không có quyền truy cập',
              error: 'Token không hợp lệ',
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Không tìm thấy tài nguyên',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Không tìm thấy tài nguyên',
              error: 'Tài nguyên không tồn tại',
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      },
      ValidationError: {
        description: 'Lỗi validation dữ liệu',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Dữ liệu không hợp lệ',
              error: 'Tên món ăn không được để trống',
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Options for swagger-jsdoc
const options = {
  definition: swaggerDefinition,
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
    './middleware/*.js'
  ]
};

// Initialize swagger-jsdoc
const specs = swaggerJsdoc(options);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      req.headers['Content-Type'] = 'application/json';
      return req;
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
  `,
  customSiteTitle: 'Restaurant API Documentation',
  customfavIcon: '/images/favicon.ico'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
