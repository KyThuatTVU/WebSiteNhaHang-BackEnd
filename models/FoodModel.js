// Food Model - Data Access Layer
const { pool } = require('../config/database');
const { logDatabaseQuery } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class FoodModel {
  /**
   * Get all food items with filtering and pagination
   * @param {Object} filters - Filter parameters
   * @param {Object} pagination - Pagination parameters
   * @returns {Promise<Object>} Food items and total count
   */
  static async getAll(filters = {}, pagination = {}) {
    const { limit = 50, offset = 0 } = pagination;
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Build base query
      let query = `
        SELECT m.id_mon, m.id_loai, m.ten_mon, m.mo_ta, m.gia, m.hinh_anh, m.so_luong,
               l.ten_loai, l.mo_ta as mo_ta_loai
        FROM mon_an m
        LEFT JOIN loai_mon l ON m.id_loai = l.id_loai
        WHERE 1=1
      `;
      
      const params = [];
      
      // Apply filters
      if (filters.search) {
        query += ` AND (m.ten_mon LIKE ? OR m.mo_ta LIKE ? OR l.ten_loai LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.category) {
        query += ` AND m.id_loai = ?`;
        params.push(filters.category);
      }
      
      if (filters.minPrice !== undefined && filters.minPrice !== null && filters.minPrice > 0) {
        query += ` AND m.gia >= ?`;
        params.push(filters.minPrice);
      }

      if (filters.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice < 999999999) {
        query += ` AND m.gia <= ?`;
        params.push(filters.maxPrice);
      }
      
      if (filters.available === 'true') {
        query += ` AND m.so_luong > 0`;
      } else if (filters.available === 'false') {
        query += ` AND m.so_luong = 0`;
      }
      
      // Build count query separately
      let countQuery = `SELECT COUNT(*) as total FROM mon_an m LEFT JOIN loai_mon l ON m.id_loai = l.id_loai WHERE 1=1`;

      const countParams = [];

      // Apply same filters to count query
      if (filters.search) {
        countQuery += ` AND (m.ten_mon LIKE ? OR m.mo_ta LIKE ? OR l.ten_loai LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.category) {
        countQuery += ` AND m.id_loai = ?`;
        countParams.push(filters.category);
      }

      if (filters.minPrice !== undefined && filters.minPrice !== null && filters.minPrice > 0) {
        countQuery += ` AND m.gia >= ?`;
        countParams.push(filters.minPrice);
      }

      if (filters.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice < 999999999) {
        countQuery += ` AND m.gia <= ?`;
        countParams.push(filters.maxPrice);
      }

      if (filters.available === 'true') {
        countQuery += ` AND m.so_luong > 0`;
      } else if (filters.available === 'false') {
        countQuery += ` AND m.so_luong = 0`;
      }

      const startTime = Date.now();

      // Debug logging
      console.log('🔍 Count Query:', countQuery);
      console.log('🔍 Count Params:', countParams);

      const [countResult] = await connection.query(countQuery, countParams);
      const total = countResult[0].total;

      // Add ordering and pagination
      query += ` ORDER BY m.ten_mon ASC LIMIT ? OFFSET ?`;

      // Ensure limit and offset are numbers
      const finalLimit = parseInt(limit) || 50;
      const finalOffset = parseInt(offset) || 0;

      params.push(finalLimit, finalOffset);

      // Debug logging
      console.log('🔍 Main Query:', query);
      console.log('🔍 Main Params:', params);
      console.log('🔍 Param Types:', params.map(p => typeof p));

      const [rows] = await connection.query(query, params);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, params, duration);
      
      return { data: rows, total };
      
    } catch (error) {
      throw new AppError(`Lỗi khi lấy danh sách món ăn: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get food item by ID
   * @param {number} id - Food item ID
   * @returns {Promise<Object|null>} Food item or null
   */
  static async getById(id) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      const query = `
        SELECT m.id_mon, m.id_loai, m.ten_mon, m.mo_ta, m.gia, m.hinh_anh, m.so_luong,
               l.ten_loai, l.mo_ta as mo_ta_loai
        FROM mon_an m
        LEFT JOIN loai_mon l ON m.id_loai = l.id_loai
        WHERE m.id_mon = ?
      `;
      
      const startTime = Date.now();
      const [rows] = await connection.query(query, [id]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [id], duration);
      
      return rows.length > 0 ? rows[0] : null;
      
    } catch (error) {
      throw new AppError(`Lỗi khi lấy thông tin món ăn: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Create new food item
   * @param {Object} foodData - Food item data
   * @returns {Promise<Object>} Created food item
   */
  static async create(foodData) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if category exists
      const categoryCheck = await connection.query(
        'SELECT id_loai FROM loai_mon WHERE id_loai = ?',
        [foodData.id_loai]
      );

      if (categoryCheck[0].length === 0) {
        throw new AppError('Loại món không tồn tại', 400);
      }

      // Check if name already exists
      const nameCheck = await connection.query(
        'SELECT ten_mon FROM mon_an WHERE ten_mon = ?',
        [foodData.ten_mon]
      );

      if (nameCheck[0].length > 0) {
        throw new AppError('Tên món ăn đã tồn tại', 409);
      }
      
      const query = `
        INSERT INTO mon_an (id_loai, ten_mon, mo_ta, gia, hinh_anh, so_luong)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        foodData.id_loai,
        foodData.ten_mon,
        foodData.mo_ta || null,
        foodData.gia,
        foodData.hinh_anh || null,
        foodData.so_luong || 0
      ];
      
      const startTime = Date.now();
      const [result] = await connection.query(query, params);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, params, duration);
      
      // Get the created item
      return await this.getById(result.insertId);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi tạo món ăn: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update food item
   * @param {number} id - Food item ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated food item
   */
  static async update(id, updateData) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if item exists
      const existingItem = await this.getById(id);
      if (!existingItem) {
        throw new AppError('Món ăn không tồn tại', 404);
      }
      
      // Check category if provided
      if (updateData.id_loai) {
        const categoryCheck = await connection.query(
          'SELECT id_loai FROM loai_mon WHERE id_loai = ?',
          [updateData.id_loai]
        );

        if (categoryCheck[0].length === 0) {
          throw new AppError('Loại món không tồn tại', 400);
        }
      }

      // Check name conflict if provided
      if (updateData.ten_mon && updateData.ten_mon !== existingItem.ten_mon) {
        const nameCheck = await connection.query(
          'SELECT ten_mon FROM mon_an WHERE ten_mon = ? AND id_mon != ?',
          [updateData.ten_mon, id]
        );

        if (nameCheck[0].length > 0) {
          throw new AppError('Tên món ăn đã tồn tại', 409);
        }
      }
      
      // Build dynamic update query
      const updates = [];
      const params = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      if (updates.length === 0) {
        throw new AppError('Không có dữ liệu để cập nhật', 400);
      }
      
      params.push(id);
      
      const query = `UPDATE mon_an SET ${updates.join(', ')} WHERE id_mon = ?`;
      
      const startTime = Date.now();
      await connection.query(query, params);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, params, duration);
      
      // Return updated item
      return await this.getById(id);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi cập nhật món ăn: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Delete food item
   * @param {number} id - Food item ID
   * @returns {Promise<Object>} Deleted item info
   */
  static async delete(id) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if item exists
      const existingItem = await this.getById(id);
      if (!existingItem) {
        throw new AppError('Món ăn không tồn tại', 404);
      }
      
      const query = 'DELETE FROM mon_an WHERE id_mon = ?';
      
      const startTime = Date.now();
      await connection.query(query, [id]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [id], duration);
      
      return existingItem;
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi xóa món ăn: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update stock quantity
   * @param {number} id - Food item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Update result
   */
  static async updateStock(id, quantity) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Get current stock
      const currentItem = await this.getById(id);
      if (!currentItem) {
        throw new AppError('Món ăn không tồn tại', 404);
      }
      
      const query = 'UPDATE mon_an SET so_luong = ? WHERE id_mon = ?';
      
      const startTime = Date.now();
      await connection.query(query, [quantity, id]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [quantity, id], duration);
      
      return {
        old_stock: currentItem.so_luong,
        new_stock: quantity,
        item_name: currentItem.ten_mon
      };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi cập nhật số lượng: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get food statistics
   * @returns {Promise<Object>} Statistics data
   */
  static async getStatistics() {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      const queries = {
        total: 'SELECT COUNT(*) as count FROM mon_an',
        available: 'SELECT COUNT(*) as count FROM mon_an WHERE so_luong > 0',
        outOfStock: 'SELECT COUNT(*) as count FROM mon_an WHERE so_luong = 0',
        avgPrice: 'SELECT AVG(gia) as avg_price FROM mon_an',
        maxPrice: 'SELECT MAX(gia) as max_price FROM mon_an',
        minPrice: 'SELECT MIN(gia) as min_price FROM mon_an WHERE gia > 0',
        totalStock: 'SELECT SUM(so_luong) as total_stock FROM mon_an'
      };
      
      const stats = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const [result] = await connection.query(query);
        stats[key] = result[0][Object.keys(result[0])[0]];
      }

      // Get category breakdown
      const categoryQuery = `
        SELECT l.ten_loai, COUNT(m.id_mon) as so_luong_mon,
               AVG(m.gia) as gia_trung_binh,
               SUM(m.so_luong) as tong_so_luong
        FROM loai_mon l
        LEFT JOIN mon_an m ON l.id_loai = m.id_loai
        GROUP BY l.id_loai, l.ten_loai
        ORDER BY so_luong_mon DESC
      `;

      const [categoryStats] = await connection.query(categoryQuery);
      
      return { stats, categoryStats };
      
    } catch (error) {
      throw new AppError(`Lỗi khi lấy thống kê: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = FoodModel;
