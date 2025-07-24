// Food Controller - Business Logic Layer
const FoodModel = require('../models/FoodModel');
const { formatFoodItem, buildPagination, formatPrice } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const { logApiResponse } = require('../utils/logger');

class FoodController {
  /**
   * Get all food items with filtering and pagination
   */
  static getAllFoods = catchAsync(async (req, res) => {
    const {
      search = '',
      category,
      minPrice,
      maxPrice,
      available,
      limit = 50,
      offset = 0
    } = req.query;

    // Prepare filters - only include price filters if they are provided
    const filters = {
      search: search.trim(),
      category: category ? parseInt(category) : undefined,
      available
    };

    // Only add price filters if they are provided and valid
    if (minPrice !== undefined && minPrice !== '' && !isNaN(parseFloat(minPrice)) && parseFloat(minPrice) > 0) {
      filters.minPrice = parseFloat(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== '' && !isNaN(parseFloat(maxPrice)) && parseFloat(maxPrice) < 999999999) {
      filters.maxPrice = parseFloat(maxPrice);
    }

    // Prepare pagination
    const pagination = {
      limit: Math.min(parseInt(limit), 100), // Max 100 items per request
      offset: parseInt(offset)
    };

    // Get data from model
    const { data, total } = await FoodModel.getAll(filters, pagination);

    // Format response
    const formattedData = data.map(item => formatFoodItem(item, req));
    const paginationInfo = buildPagination(total, pagination.limit, pagination.offset);

    const response = {
      success: true,
      data: formattedData,
      pagination: paginationInfo,
      filters: {
        search: filters.search || null,
        category: filters.category || null,
        priceRange: {
          min: filters.minPrice || null,
          max: filters.maxPrice || null
        },
        available: filters.available || null
      }
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get single food item by ID
   */
  static getFoodById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const food = await FoodModel.getById(parseInt(id));
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Món ăn không tồn tại',
        code: 'FOOD_NOT_FOUND'
      });
    }

    const formattedFood = formatFoodItem(food, req);

    const response = {
      success: true,
      data: formattedFood
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Create new food item
   */
  static createFood = catchAsync(async (req, res) => {
    const { id_loai, ten_mon, mo_ta, gia, so_luong } = req.body;
    
    const foodData = {
      id_loai: parseInt(id_loai),
      ten_mon: ten_mon.trim(),
      mo_ta: mo_ta ? mo_ta.trim() : null,
      gia: parseFloat(gia),
      so_luong: so_luong ? parseInt(so_luong) : 0,
      hinh_anh: req.file ? req.file.filename : null
    };

    const createdFood = await FoodModel.create(foodData);
    const formattedFood = formatFoodItem(createdFood, req);

    const response = {
      success: true,
      message: 'Tạo món ăn thành công',
      data: formattedFood
    };

    logApiResponse(req, res, response);
    res.status(201).json(response);
  });

  /**
   * Update food item
   */
  static updateFood = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { id_loai, ten_mon, mo_ta, gia, so_luong } = req.body;

    const updateData = {};
    
    if (id_loai !== undefined) updateData.id_loai = parseInt(id_loai);
    if (ten_mon !== undefined) updateData.ten_mon = ten_mon.trim();
    if (mo_ta !== undefined) updateData.mo_ta = mo_ta ? mo_ta.trim() : null;
    if (gia !== undefined) updateData.gia = parseFloat(gia);
    if (so_luong !== undefined) updateData.so_luong = parseInt(so_luong);
    if (req.file) updateData.hinh_anh = req.file.filename;

    const updatedFood = await FoodModel.update(parseInt(id), updateData);
    const formattedFood = formatFoodItem(updatedFood, req);

    const response = {
      success: true,
      message: 'Cập nhật món ăn thành công',
      data: formattedFood
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Delete food item
   */
  static deleteFood = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const deletedFood = await FoodModel.delete(parseInt(id));

    const response = {
      success: true,
      message: `Đã xóa món ăn "${deletedFood.ten_mon}" thành công`,
      data: {
        id_mon: deletedFood.id_mon,
        ten_mon: deletedFood.ten_mon
      }
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Update food stock
   */
  static updateStock = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { so_luong } = req.body;

    const result = await FoodModel.updateStock(parseInt(id), parseInt(so_luong));

    const response = {
      success: true,
      message: `Đã cập nhật số lượng từ ${result.old_stock} thành ${result.new_stock}`,
      data: {
        item_name: result.item_name,
        old_stock: result.old_stock,
        new_stock: result.new_stock,
        change: result.new_stock - result.old_stock
      }
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get popular food items
   */
  static getPopularFoods = catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;

    const filters = { available: 'true' };
    const pagination = { limit: Math.min(parseInt(limit), 50), offset: 0 };

    const { data } = await FoodModel.getAll(filters, pagination);
    
    // Sort by price (descending) as popularity indicator
    const sortedData = data.sort((a, b) => b.gia - a.gia);
    const formattedData = sortedData.map(item => formatFoodItem(item, req));

    const response = {
      success: true,
      data: formattedData,
      message: `Top ${formattedData.length} món ăn phổ biến`
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get food statistics
   */
  static getFoodStats = catchAsync(async (req, res) => {
    const { stats, categoryStats } = await FoodModel.getStatistics();

    const response = {
      success: true,
      data: {
        overview: {
          total_items: stats.total || 0,
          available_items: stats.available || 0,
          out_of_stock_items: stats.outOfStock || 0,
          total_stock: stats.totalStock || 0
        },
        pricing: {
          average_price: Math.round(stats.avgPrice || 0),
          max_price: stats.maxPrice || 0,
          min_price: stats.minPrice || 0,
          avg_price_formatted: formatPrice(Math.round(stats.avgPrice || 0)),
          max_price_formatted: formatPrice(stats.maxPrice || 0),
          min_price_formatted: formatPrice(stats.minPrice || 0)
        },
        categories: categoryStats.map(cat => ({
          ...cat,
          gia_trung_binh: Math.round(cat.gia_trung_binh || 0),
          gia_trung_binh_formatted: formatPrice(Math.round(cat.gia_trung_binh || 0))
        }))
      }
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Search food items
   */
  static searchFoods = catchAsync(async (req, res) => {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const filters = { search: query.trim() };
    const pagination = { limit: Math.min(parseInt(limit), 50), offset: 0 };

    const { data, total } = await FoodModel.getAll(filters, pagination);
    const formattedData = data.map(item => formatFoodItem(item, req));

    const response = {
      success: true,
      data: formattedData,
      total,
      query: query.trim(),
      message: `Tìm thấy ${total} kết quả cho "${query.trim()}"`
    };

    logApiResponse(req, res, response);
    res.json(response);
  });
}

module.exports = FoodController;
