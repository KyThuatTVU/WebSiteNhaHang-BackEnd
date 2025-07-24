// Authentication Middleware - Unified Auth System

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'restaurant_user',
  password: process.env.DB_PASSWORD || 'TVU@842004',
  database: process.env.DB_NAME || 'QuanLyNhaHang',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  // SSL configuration for secure connections
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates for cloud MySQL services
  },
  // Removed invalid options: acquireTimeout, timeout, reconnect
  charset: 'utf8mb4',
  timezone: '+07:00'
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Create database connection
async function getConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        return connection;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
}

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database to ensure user still exists
        const connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT id, email, ho_ten, so_dien_thoai, dia_chi FROM khach_hang WHERE id = ? AND trang_thai = "active"',
            [decoded.id]
        );
        await connection.end();

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Add user info to request
        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

// Auth endpoints
const authEndpoints = {
    // Health check
    health: (req, res) => {
        res.json({
            success: true,
            message: 'Auth service is healthy',
            timestamp: new Date().toISOString()
        });
    },

    // Test endpoint
    test: (req, res) => {
        res.json({
            success: true,
            message: 'Auth API is working',
            timestamp: new Date().toISOString()
        });
    },

    // User registration
    register: async (req, res) => {
        try {
            const { full_name, email, password, phone } = req.body;

            // Validate required fields
            if (!full_name || !email || !password || !phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Họ tên, email và mật khẩu là bắt buộc'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Email không hợp lệ'
                });
            }

            const connection = await getConnection();

            // Check if user already exists
            const [existingUsers] = await connection.execute(
                'SELECT id FROM khach_hang WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                await connection.end();
                return res.status(400).json({
                    success: false,
                    error: 'Email đã được sử dụng'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Insert new user
            const [result] = await connection.execute(
                `INSERT INTO khach_hang (full_name, email, password, phone, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [full_name, email, hashedPassword, phone]
            );

            // Get the created user
            const [newUser] = await connection.execute(
                'SELECT id, full_name, email, phone, created_at FROM khach_hang WHERE id = ?',
                [result.insertId]
            );

            await connection.end();

            // Create JWT token with long expiry (frontend handles inactivity logout)
            const token = jwt.sign(
                {
                    id: newUser[0].id,
                    email: newUser[0].email
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Create refresh token
            const refreshToken = jwt.sign(
                {
                    id: newUser[0].id,
                    email: newUser[0].email,
                    tokenType: 'refresh'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            logger.info('User registered successfully:', newUser[0].email);

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công',
                khach_hang: newUser[0],
                token,
                refreshToken,
                expiresIn: '24h'
            });

        } catch (error) {
            logger.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Lỗi server'
            });
        }
    },

    // User login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email và mật khẩu là bắt buộc'
                });
            }

            const connection = await getConnection();

            // Find user by email
            const [users] = await connection.execute(
                'SELECT id, full_name, email, password, phone, created_at FROM khach_hang WHERE email = ?',
                [email]
            );

            await connection.end();

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Email hoặc mật khẩu không đúng'
                });
            }

            const user = users[0];

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Email hoặc mật khẩu không đúng'
                });
            }

            // Create JWT token with long expiry (frontend handles inactivity logout)
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '24h' } // 24 hours (frontend handles 2min inactivity logout)
            );

            // Create refresh token
            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    tokenType: 'refresh'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;

            logger.info('User logged in successfully:', userWithoutPassword.email);

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                khach_hang: userWithoutPassword,
                token,
                refreshToken,
                expiresIn: '24h', // 24 hours
                tokenExpiry: Date.now() + (24 * 60 * 60 * 1000) // Timestamp when token expires
            });

        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Lỗi server'
            });
        }
    },

    // Get user profile (protected route)
    profile: async (req, res) => {
        try {
            res.json({
                success: true,
                user: req.user
            });
        } catch (error) {
            logger.error('Profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Lỗi server'
            });
        }
    },

    // Refresh token
    refresh: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token required'
                });
            }

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            
            if (decoded.tokenType !== 'refresh') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
            }

            // Create new access token with long expiry
            const newToken = jwt.sign(
                {
                    id: decoded.id,
                    email: decoded.email,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '24h' } // 24 hours
            );

            res.json({
                success: true,
                token: newToken,
                expiresIn: '24h',
                tokenExpiry: Date.now() + (24 * 60 * 60 * 1000)
            });

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token expired'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
            }
            
            logger.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                error: 'Token refresh failed'
            });
        }
    }
};

module.exports = {
    authenticateToken,
    authEndpoints
};
