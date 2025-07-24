// Simple Food Controller for Testing
const SimpleFoodModel = require('../models/SimpleFoodModel');

class SimpleFoodController {
  /**
   * Get all foods
   */
  static async getAllFoods(req, res) {
    try {
      console.log('🔍 SimpleFoodController.getAllFoods called');
      console.log('🔍 Query params:', req.query);
      
      // Extract query parameters
      const filters = {
        search: req.query.search,
        category: req.query.category
      };
      
      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };
      
      // Get data from model
      const result = await SimpleFoodModel.getAll(filters, pagination);
      
      // Format response
      const response = {
        success: true,
        data: result.data,
        total: result.total,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ SimpleFoodController response:', { 
        total: result.total, 
        count: result.data.length 
      });
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ SimpleFoodController.getAllFoods error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Get food by ID
   */
  static async getFoodById(req, res) {
    try {
      const { id } = req.params;
      
      const food = await SimpleFoodModel.getById(id);
      
      if (!food) {
        return res.status(404).json({
          success: false,
          error: 'Món ăn không tồn tại'
        });
      }
      
      res.json({
        success: true,
        data: food
      });
      
    } catch (error) {
      console.error('❌ SimpleFoodController.getFoodById error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Search foods
   */
  static async searchFoods(req, res) {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required'
        });
      }
      
      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };
      
      const result = await SimpleFoodModel.search(searchTerm, pagination);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        pagination: result.pagination,
        searchTerm
      });
      
    } catch (error) {
      console.error('❌ SimpleFoodController.searchFoods error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = SimpleFoodController;
