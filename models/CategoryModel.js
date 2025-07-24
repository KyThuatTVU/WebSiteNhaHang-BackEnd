// Category Model - Data Access Layer
const { pool } = require('../config/database');
const { logDatabaseQuery } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class CategoryModel {
  /**
   * Get all categories with food count
   * @returns {Promise<Array>} Categories list
   */
  static async getAll() {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      const query = `
        SELECT l.id_loai, l.ten_loai, l.mo_ta,
               COUNT(m.id_mon) as so_luong_mon,
               COUNT(CASE WHEN m.so_luong > 0 THEN 1 END) as so_luong_con_hang
        FROM loai_mon l
        LEFT JOIN mon_an m ON l.id_loai = m.id_loai
        GROUP BY l.id_loai, l.ten_loai, l.mo_ta
        ORDER BY l.ten_loai ASC
      `;
      
      const startTime = Date.now();
      const [rows] = await connection.query(query);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [], duration);
      
      return rows;
      
    } catch (error) {
      throw new AppError(`Lỗi khi lấy danh sách loại món: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object|null>} Category or null
   */
  static async getById(id) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      const query = `
        SELECT l.id_loai, l.ten_loai, l.mo_ta,
               COUNT(m.id_mon) as so_luong_mon,
               COUNT(CASE WHEN m.so_luong > 0 THEN 1 END) as so_luong_con_hang
        FROM loai_mon l
        LEFT JOIN mon_an m ON l.id_loai = m.id_loai
        WHERE l.id_loai = ?
        GROUP BY l.id_loai, l.ten_loai, l.mo_ta
      `;
      
      const startTime = Date.now();
      const [rows] = await connection.query(query, [id]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [id], duration);
      
      return rows.length > 0 ? rows[0] : null;
      
    } catch (error) {
      throw new AppError(`Lỗi khi lấy thông tin loại món: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get food items by category
   * @param {number} categoryId - Category ID
   * @param {Object} pagination - Pagination parameters
   * @returns {Promise<Object>} Food items and total count
   */
  static async getFoodsByCategory(categoryId, pagination = {}) {
    const { limit = 20, offset = 0 } = pagination;
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if category exists
      const category = await this.getById(categoryId);
      if (!category) {
        throw new AppError('Loại món không tồn tại', 404);
      }
      
      // Get food items
      const query = `
        SELECT m.id_mon, m.id_loai, m.ten_mon, m.mo_ta, m.gia, m.hinh_anh, m.so_luong,
               l.ten_loai
        FROM mon_an m
        JOIN loai_mon l ON m.id_loai = l.id_loai
        WHERE m.id_loai = ?
        ORDER BY m.ten_mon ASC
        LIMIT ? OFFSET ?
      `;
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM mon_an 
        WHERE id_loai = ?
      `;
      
      const startTime = Date.now();
      const [countResult] = await connection.query(countQuery, [categoryId]);
      const [rows] = await connection.query(query, [categoryId, limit, offset]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [categoryId, limit, offset], duration);
      
      const total = countResult[0].total;
      
      return {
        category: category.ten_loai,
        data: rows,
        total
      };
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi lấy món ăn theo loại: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Create new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  static async create(categoryData) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if name already exists
      const nameCheck = await connection.query(
        'SELECT ten_loai FROM loai_mon WHERE ten_loai = ?',
        [categoryData.ten_loai]
      );

      if (nameCheck[0].length > 0) {
        throw new AppError('Tên loại món đã tồn tại', 409);
      }

      const query = `
        INSERT INTO loai_mon (ten_loai, mo_ta)
        VALUES (?, ?)
      `;

      const params = [
        categoryData.ten_loai,
        categoryData.mo_ta || null
      ];

      const startTime = Date.now();
      const [result] = await connection.query(query, params);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, params, duration);
      
      // Get the created category
      return await this.getById(result.insertId);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi tạo loại món: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update category
   * @param {number} id - Category ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated category
   */
  static async update(id, updateData) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if category exists
      const existingCategory = await this.getById(id);
      if (!existingCategory) {
        throw new AppError('Loại món không tồn tại', 404);
      }
      
      // Check name conflict if provided
      if (updateData.ten_loai && updateData.ten_loai !== existingCategory.ten_loai) {
        const nameCheck = await connection.query(
          'SELECT ten_loai FROM loai_mon WHERE ten_loai = ? AND id_loai != ?',
          [updateData.ten_loai, id]
        );

        if (nameCheck[0].length > 0) {
          throw new AppError('Tên loại món đã tồn tại', 409);
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
      
      const query = `UPDATE loai_mon SET ${updates.join(', ')} WHERE id_loai = ?`;
      
      const startTime = Date.now();
      await connection.query(query, params);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, params, duration);
      
      // Return updated category
      return await this.getById(id);
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi cập nhật loại món: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Delete category
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Deleted category info
   */
  static async delete(id) {
    let connection;
    
    try {
      connection = await pool.getConnection();
      
      // Check if category exists
      const existingCategory = await this.getById(id);
      if (!existingCategory) {
        throw new AppError('Loại món không tồn tại', 404);
      }
      
      // Check if category has food items
      if (existingCategory.so_luong_mon > 0) {
        throw new AppError('Không thể xóa loại món đang có món ăn', 400);
      }
      
      const query = 'DELETE FROM loai_mon WHERE id_loai = ?';
      
      const startTime = Date.now();
      await connection.query(query, [id]);
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(query, [id], duration);
      
      return existingCategory;
      
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Lỗi khi xóa loại món: ${error.message}`, 500);
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = CategoryModel;
