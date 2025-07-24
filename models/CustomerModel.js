// Customer Model - User Management
const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_db',
    // SSL configuration for secure connections
    ssl: {
        rejectUnauthorized: false // Allow self-signed certificates for cloud MySQL services
    },
    charset: 'utf8mb4'
};

class CustomerModel {
    // Create database connection
    static async getConnection() {
        try {
            const connection = await mysql.createConnection(dbConfig);
            return connection;
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    // Create khach_hang table
    static async createTable() {
        const connection = await this.getConnection();

        try {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS khach_hang (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    full_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    phone VARCHAR(20) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            await connection.execute(createTableQuery);
            console.log('✅ khach_hang table created/verified successfully');
        } catch (error) {
            console.error('❌ Error creating khach_hang table:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const connection = await this.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM khach_hang WHERE email = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Find user by ID
    static async findById(id) {
        const connection = await this.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT id, full_name, email, phone, created_at FROM khach_hang WHERE id = ?',
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Create new user
    static async create(userData) {
        const connection = await this.getConnection();

        try {
            const { full_name, email, password, phone } = userData;

            const [result] = await connection.execute(
                `INSERT INTO khach_hang (full_name, email, password, phone, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [full_name, email, password, phone]
            );

            // Get the created user
            const [newUser] = await connection.execute(
                'SELECT id, full_name, email, phone, created_at FROM khach_hang WHERE id = ?',
                [result.insertId]
            );

            return newUser[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Update user
    static async update(id, userData) {
        const connection = await this.getConnection();

        try {
            const { full_name, phone } = userData;

            await connection.execute(
                'UPDATE khach_hang SET full_name = ?, phone = ? WHERE id = ?',
                [full_name, phone, id]
            );

            // Get updated user
            return await this.findById(id);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Get all users (admin function)
    static async getAll(limit = 50, offset = 0) {
        const connection = await this.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT id, full_name, email, phone, created_at FROM khach_hang ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [limit, offset]
            );
            return rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Count total users
    static async count() {
        const connection = await this.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT COUNT(*) as total FROM khach_hang'
            );
            return rows[0].total;
        } catch (error) {
            console.error('Error counting users:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Delete user (hard delete)
    static async delete(id) {
        const connection = await this.getConnection();

        try {
            await connection.execute(
                'DELETE FROM khach_hang WHERE id = ?',
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }

    // Check if email exists
    static async emailExists(email, excludeId = null) {
        const connection = await this.getConnection();
        
        try {
            let query = 'SELECT id FROM khach_hang WHERE email = ?';
            let params = [email];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            const [rows] = await connection.execute(query, params);
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking email existence:', error);
            throw error;
        } finally {
            await connection.end();
        }
    }
}

module.exports = CustomerModel;
