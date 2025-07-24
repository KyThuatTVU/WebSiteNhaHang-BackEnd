// Simple Food Model for Testing
const connection = require('../config/database');

class SimpleFoodModel {
  /**
   * Get all foods with simple query
   */
  static async getAll(filters = {}, pagination = {}) {
    try {
      console.log('🔍 SimpleFoodModel.getAll called with:', { filters, pagination });
      
      // Simple query without complex joins
      let query = `SELECT * FROM mon_an WHERE 1=1`;
      const params = [];
      
      // Add search filter
      if (filters.search) {
        query += ` AND ten_mon LIKE ?`;
        params.push(`%${filters.search}%`);
      }
      
      // Add category filter
      if (filters.category) {
        query += ` AND id_loai = ?`;
        params.push(parseInt(filters.category));
      }
      
      // Add ordering
      query += ` ORDER BY ten_mon ASC`;
      
      // Add pagination
      const limit = parseInt(pagination.limit) || 50;
      const offset = parseInt(pagination.offset) || 0;
      
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      console.log('🔍 Simple Query:', query);
      console.log('🔍 Simple Params:', params);
      
      // Execute query
      const [rows] = await connection.execute(query, params);
      
      // Get total count with simple query
      let countQuery = `SELECT COUNT(*) as total FROM mon_an WHERE 1=1`;
      const countParams = [];
      
      if (filters.search) {
        countQuery += ` AND ten_mon LIKE ?`;
        countParams.push(`%${filters.search}%`);
      }
      
      if (filters.category) {
        countQuery += ` AND id_loai = ?`;
        countParams.push(parseInt(filters.category));
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      console.log('✅ SimpleFoodModel query successful:', { total, count: rows.length });
      
      return {
        data: rows,
        total: total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
      
    } catch (error) {
      console.error('❌ SimpleFoodModel error:', error);
      throw new Error(`Lỗi khi lấy danh sách món ăn: ${error.message}`);
    }
  }
  
  /**
   * Get food by ID
   */
  static async getById(id) {
    try {
      const query = `SELECT * FROM mon_an WHERE id_mon = ?`;
      const [rows] = await connection.execute(query, [parseInt(id)]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
      
    } catch (error) {
      console.error('❌ SimpleFoodModel.getById error:', error);
      throw new Error(`Lỗi khi lấy món ăn: ${error.message}`);
    }
  }
  
  /**
   * Search foods
   */
  static async search(searchTerm, pagination = {}) {
    try {
      const filters = { search: searchTerm };
      return await this.getAll(filters, pagination);
      
    } catch (error) {
      console.error('❌ SimpleFoodModel.search error:', error);
      throw new Error(`Lỗi khi tìm kiếm món ăn: ${error.message}`);
    }
  }
}

module.exports = SimpleFoodModel;
