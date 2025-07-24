// Customer Routes - Authentication & User Management with Full HTTP Methods
const express = require('express');
const router = express.Router();
const { authenticateToken, authEndpoints } = require('../middleware/auth');
const {
  handleHeadRequest,
  handleOptionsRequest,
  createOptionsHandler,
  createHeadHandler,
  logHttpMethod
} = require('../middleware/httpMethods');

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - ho_ten
 *         - email
 *         - mat_khau
 *       properties:
 *         id:
 *           type: integer
 *           description: User ID
 *         ho_ten:
 *           type: string
 *           description: Full name
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         so_dien_thoai:
 *           type: string
 *           description: Phone number
 *         dia_chi:
 *           type: string
 *           description: Address
 *         ngay_tao:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *         trang_thai:
 *           type: string
 *           enum: [active, inactive]
 *           description: User status
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - ho_ten
 *         - email
 *         - mat_khau
 *       properties:
 *         ho_ten:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         mat_khau:
 *           type: string
 *         so_dien_thoai:
 *           type: string
 *         dia_chi:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         khach_hang:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *         refreshToken:
 *           type: string
 *         expiresIn:
 *           type: string
 */

/**
 * @swagger
 * /api/khach_hang/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Internal server error
 */
router.post('/register', authEndpoints.register);

/**
 * @swagger
 * /api/khach_hang/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', authEndpoints.login);

/**
 * @swagger
 * /api/khach_hang/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', authEndpoints.refresh);

/**
 * @swagger
 * /api/khach_hang/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateToken, authEndpoints.profile);

/**
 * @swagger
 * /api/khach_hang/profile:
 *   put:
 *     summary: Cập nhật thông tin profile
 *     description: Cập nhật thông tin cá nhân của khách hàng đã đăng nhập
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ho_ten:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               so_dien_thoai:
 *                 type: string
 *                 example: "0987654321"
 *               dia_chi:
 *                 type: string
 *                 example: "123 Đường ABC, TP.HCM"
 *     responses:
 *       200:
 *         description: Cập nhật profile thành công
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ho_ten, so_dien_thoai, dia_chi } = req.body;

    // Validation
    if (so_dien_thoai) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(so_dien_thoai)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ'
        });
      }
    }

    // Mock update (in real app, would update database)
    const updatedProfile = {
      id: userId,
      ho_ten: ho_ten || req.user.ho_ten,
      email: req.user.email, // Email không thay đổi
      so_dien_thoai: so_dien_thoai || req.user.so_dien_thoai,
      dia_chi: dia_chi || req.user.dia_chi,
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: updatedProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật profile',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/profile:
 *   delete:
 *     summary: Xóa tài khoản
 *     description: Xóa tài khoản khách hàng (soft delete)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Mock deletion (in real app, would soft delete from database)
    res.json({
      success: true,
      message: 'Xóa tài khoản thành công',
      data: {
        id: userId,
        deleted_at: new Date().toISOString(),
        status: 'deleted'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa tài khoản',
      error: error.message
    });
  }
});

// ==================== NEW HTTP METHODS ====================

/**
 * @swagger
 * /api/khach_hang:
 *   head:
 *     summary: Get users metadata
 *     description: Lấy metadata của danh sách người dùng (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metadata retrieved successfully
 *         headers:
 *           X-Total-Count:
 *             description: Tổng số người dùng
 *             schema:
 *               type: integer
 */
router.head('/', authenticateToken, createHeadHandler(async (req, res) => {
  // Mock response for HEAD request
  res.json({
    success: true,
    data: [],
    total: 0
  });
}));

/**
 * @swagger
 * /api/khach_hang:
 *   options:
 *     summary: Get supported HTTP methods for authentication
 *     description: Trả về các HTTP methods được hỗ trợ cho authentication API
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Supported methods information
 */
router.options('/', createOptionsHandler('khach_hang', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']));
router.options('/register', createOptionsHandler('khach_hang/register', ['POST', 'OPTIONS']));
router.options('/login', createOptionsHandler('khach_hang/login', ['POST', 'OPTIONS']));
router.options('/profile', createOptionsHandler('khach_hang/profile', ['GET', 'PUT', 'PATCH', 'HEAD', 'OPTIONS']));

/**
 * @swagger
 * /api/khach_hang:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Lấy danh sách tất cả người dùng trong hệ thống
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (mock check)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập',
        code: 'FORBIDDEN'
      });
    }

    // Mock users data
    const users = [
      {
        id: 1,
        full_name: 'Admin User',
        email: 'admin@restaurant.com',
        phone: '0123456789',
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: users,
      total: users.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách người dùng',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     description: Lấy thông tin người dùng theo ID
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user can access this data (admin or own profile)
    if (!req.user.isAdmin && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập thông tin này',
        code: 'FORBIDDEN'
      });
    }

    // Mock user data
    const user = {
      id: userId,
      full_name: 'Test User',
      email: 'user@example.com',
      phone: '0123456789',
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: user,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin người dùng',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/profile:
 *   patch:
 *     summary: Partially update user profile
 *     description: Cập nhật một phần thông tin profile người dùng
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ho_ten:
 *                 type: string
 *                 example: "Nguyễn Văn B"
 *               so_dien_thoai:
 *                 type: string
 *                 example: "0987654321"
 *               dia_chi:
 *                 type: string
 *                 example: "TP.HCM"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate phone if provided
    if (updates.so_dien_thoai) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(updates.so_dien_thoai)) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại không hợp lệ'
        });
      }
    }

    // Mock update
    const updatedProfile = {
      id: userId,
      ho_ten: updates.ho_ten || req.user.ho_ten,
      email: req.user.email,
      so_dien_thoai: updates.so_dien_thoai || req.user.so_dien_thoai,
      dia_chi: updates.dia_chi || req.user.dia_chi,
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: updatedProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật profile',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/logout:
 *   post:
 *     summary: Logout user
 *     description: Đăng xuất người dùng và invalidate token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you would:
    // 1. Add token to blacklist
    // 2. Clear refresh token from database
    // 3. Log the logout event

    res.json({
      success: true,
      message: 'Đăng xuất thành công',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng xuất',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Gửi yêu cầu reset mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: Email not found
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    // Mock password reset
    res.json({
      success: true,
      message: 'Email reset mật khẩu đã được gửi',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý yêu cầu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/khach_hang/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Xóa người dùng khỏi hệ thống
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền xóa người dùng',
        code: 'FORBIDDEN'
      });
    }

    // Prevent self-deletion
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa chính mình'
      });
    }

    // Mock deletion
    res.json({
      success: true,
      message: 'Xóa người dùng thành công',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa người dùng',
      error: error.message
    });
  }
});

// Add global middleware
router.use(logHttpMethod);
router.use(handleHeadRequest);

module.exports = router;
