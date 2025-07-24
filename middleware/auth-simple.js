// Simple Authentication Middleware - File-based storage for testing
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-restaurant-api-2024';

// Data file path
const DATA_FILE = path.join(__dirname, '../data/users.json');

// Ensure data directory exists
async function ensureDataDir() {
    const dataDir = path.dirname(DATA_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Load users from file
async function loadUsers() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is empty, return empty array
        return [];
    }
}

// Save users to file
async function saveUsers(users) {
    await ensureDataDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));
}

// Find user by email
async function findUserByEmail(email) {
    const users = await loadUsers();
    return users.find(user => user.email === email);
}

// Find user by ID
async function findUserById(id) {
    const users = await loadUsers();
    return users.find(user => user.id === id);
}

// Create new user
async function createUser(userData) {
    const users = await loadUsers();
    
    // Generate new ID
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    const newUser = {
        id: newId,
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    await saveUsers(users);
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

// JWT Token verification middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        try {
            // Get user info from file
            const user = await findUserById(decoded.id);
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
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({
                success: false,
                error: 'Authentication error'
            });
        }
    });
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
                    error: 'Vui lòng điền đầy đủ thông tin bắt buộc'
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

            // Check if user already exists
            const existingUser = await findUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email đã được sử dụng'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const user = await createUser({
                full_name,
                email,
                password: hashedPassword,
                phone
            });

            // Create JWT token with short expiry for auto-logout feature
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '2m' } // 2 minutes for auto-logout
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

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công',
                khach_hang: user,
                token,
                refreshToken,
                expiresIn: '2m', // 2 minutes
                tokenExpiry: Date.now() + (2 * 60 * 1000)
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Lỗi server'
            });
        }
    },

    // User login
    login: async (req, res) => {
        try {
            console.log('🔐 Login attempt:', req.body);
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                console.log('❌ Missing email or password');
                return res.status(400).json({
                    success: false,
                    error: 'Email và mật khẩu là bắt buộc'
                });
            }

            console.log('🔍 Finding user by email:', email);
            // Find user by email
            const user = await findUserByEmail(email);
            console.log('👤 User found:', user ? 'Yes' : 'No');
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

            // Create JWT token with short expiry for auto-logout feature
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '2m' } // 2 minutes for auto-logout
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

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                khach_hang: userWithoutPassword,
                token,
                refreshToken,
                expiresIn: '2m', // 2 minutes
                tokenExpiry: Date.now() + (2 * 60 * 1000)
            });

        } catch (error) {
            console.error('Login error:', error);
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
            console.error('Profile error:', error);
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

            // Create new access token with short expiry
            const newToken = jwt.sign(
                {
                    id: decoded.id,
                    email: decoded.email,
                    iat: Math.floor(Date.now() / 1000)
                },
                JWT_SECRET,
                { expiresIn: '2m' } // 2 minutes
            );

            res.json({
                success: true,
                token: newToken,
                expiresIn: '2m',
                tokenExpiry: Date.now() + (2 * 60 * 1000)
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token'
            });
        }
    }
};

module.exports = {
    authenticateToken,
    authEndpoints
};
