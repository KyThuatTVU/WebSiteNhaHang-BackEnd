require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-restaurant-api-2024';

// Middleware
app.use(express.json());
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mock users database
const mockUsers = [
    {
        id: 1,
        email: 'test@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // password: 123456
        full_name: 'Test User',
        phone: '0123456789'
    },
    {
        id: 2,
        email: 'admin@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // password: 123456
        full_name: 'Admin User',
        phone: '0987654321'
    }
];

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired'
                });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
            return res.status(403).json({
                success: false,
                error: 'Token verification failed'
            });
        }

        // Find user
        const user = mockUsers.find(u => u.id === decoded.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Remove password from user object
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        next();
    });
};

// Routes
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'JWT Test Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// Login endpoint
app.post('/api/khach_hang/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email và mật khẩu là bắt buộc'
            });
        }

        // Find user
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                iat: Math.floor(Date.now() / 1000)
            },
            JWT_SECRET,
            { expiresIn: '24h' }
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

        console.log('✅ User logged in successfully:', userWithoutPassword.email);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            khach_hang: userWithoutPassword,
            token,
            refreshToken,
            expiresIn: '24h',
            tokenExpiry: Date.now() + (24 * 60 * 60 * 1000)
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server'
        });
    }
});

// Register endpoint
app.post('/api/khach_hang/register', async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        if (!full_name || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Tất cả các trường là bắt buộc'
            });
        }

        // Check if user exists
        const existingUser = mockUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const newUser = {
            id: mockUsers.length + 1,
            full_name,
            email,
            password: hashedPassword,
            phone,
            created_at: new Date().toISOString()
        };

        mockUsers.push(newUser);

        // Create JWT token
        const token = jwt.sign(
            {
                id: newUser.id,
                email: newUser.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Create refresh token
        const refreshToken = jwt.sign(
            {
                id: newUser.id,
                email: newUser.email,
                tokenType: 'refresh'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        console.log('✅ User registered successfully:', userWithoutPassword.email);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            khach_hang: userWithoutPassword,
            token,
            refreshToken,
            expiresIn: '24h'
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi server'
        });
    }
});

// Protected profile endpoint
app.get('/api/khach_hang/profile', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Refresh token endpoint
app.post('/api/khach_hang/refresh', (req, res) => {
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

        // Create new access token
        const newToken = jwt.sign(
            {
                id: decoded.id,
                email: decoded.email,
                iat: Math.floor(Date.now() / 1000)
            },
            JWT_SECRET,
            { expiresIn: '24h' }
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
        
        console.error('❌ Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed'
        });
    }
});

// Test protected endpoint
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'This is a protected endpoint',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 JWT Test Server running on port ${PORT}`);
    console.log(`📚 Test endpoints:`);
    console.log(`   POST http://localhost:${PORT}/api/khach_hang/login`);
    console.log(`   POST http://localhost:${PORT}/api/khach_hang/register`);
    console.log(`   GET  http://localhost:${PORT}/api/khach_hang/profile (protected)`);
    console.log(`   POST http://localhost:${PORT}/api/khach_hang/refresh`);
    console.log(`   GET  http://localhost:${PORT}/api/protected (protected)`);
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`\n📝 Test credentials:`);
    console.log(`   Email: test@example.com`);
    console.log(`   Password: 123456`);
});
