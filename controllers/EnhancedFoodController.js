// Enhanced Food Controller - Sử dụng chuẩn RESTful API
const FoodModel = require('../models/FoodModel');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { 
  successResponse, 
  ERROR_CODES, 
  HTTP_STATUS, 
  SUCCESS_MESSAGES 
} = require('../utils/responseFormatter');
const { buildCompleteQuery, buildCountQuery } = require('../middleware/pagination');
const logger = require('../utils/logger');

/**
 * Format food item for response
 */
const formatFoodItem = (food, req) => {
  if (!food) return null;

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  return {
    id: food.id_mon,
    name: food.ten_mon,
    description: food.mo_ta,
    price: parseFloat(food.gia),
    image: food.hinh_anh ? `${baseUrl}/images/${food.hinh_anh}` : null,
    stock: food.so_luong || 0,
    status: food.trang_thai,
    category: {
      id: food.id_loai,
      name: food.ten_loai
    },
    createdAt: food.created_at,
    updatedAt: food.updated_at
  };
};

class EnhancedFoodController {
  /**
   * Get all foods with advanced filtering, sorting, and pagination
   * GET /api/foods?page=1&limit=20&category=1&search=phở&sort=price&order=asc&status=available
   */
  static getAllFoods = catchAsync(async (req, res) => {
    // Base query for getting foods
    const baseQuery = `
      SELECT m.id_mon, m.id_loai, m.ten_mon, m.mo_ta, m.gia, m.hinh_anh, 
             m.so_luong, m.trang_thai, m.created_at, m.updated_at,
             l.ten_loai
      FROM mon_an m
      LEFT JOIN loai_mon l ON m.id_loai = l.id_loai
    `;

    // Base count query
    const baseCountQuery = `
      SELECT COUNT(*) as total
      FROM mon_an m
      LEFT JOIN loai_mon l ON m.id_loai = l.id_loai
    `;

    // Build complete queries using pagination middleware data
    const { query: dataQuery, params: dataParams } = buildCompleteQuery(baseQuery, req);
    const { query: countQuery, params: countParams } = buildCountQuery(baseCountQuery, req);

    // Execute queries
    const [foods, countResult] = await Promise.all([
      FoodModel.executeQuery(dataQuery, dataParams),
      FoodModel.executeQuery(countQuery, countParams)
    ]);

    const total = countResult[0]?.total || 0;
    const formattedFoods = foods.map(food => formatFoodItem(food, req));
    const pagination = req.createPaginationResponse(total);

    // Log successful operation
    logger.info('Foods retrieved successfully', {
      total,
      page: req.pagination.page,
      limit: req.pagination.limit,
      filters: req.filters,
      search: req.search.search
    });

    return res.success(
      formattedFoods,
      SUCCESS_MESSAGES.RETRIEVED,
      pagination,
      {
        filters: req.filters,
        search: req.search.search,
        sort: req.sort
      }
    );
  });

  /**
   * Get food by ID
   * GET /api/foods/:id
   */
  static getFoodById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      throw new AppError('ID món ăn không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    const food = await FoodModel.getById(foodId);

    if (!food) {
      throw new AppError('Món ăn không tồn tại', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const formattedFood = formatFoodItem(food, req);

    logger.info('Food retrieved by ID', { foodId, foodName: food.ten_mon });

    return res.success(formattedFood, SUCCESS_MESSAGES.RETRIEVED);
  });

  /**
   * Create new food
   * POST /api/foods
   */
  static createFood = catchAsync(async (req, res) => {
    const { id_loai, ten_mon, mo_ta, gia, so_luong } = req.body;

    // Validate required fields
    if (!id_loai || !ten_mon || !gia) {
      throw new AppError(
        'Thiếu thông tin bắt buộc: id_loai, ten_mon, gia',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      );
    }

    const foodData = {
      id_loai: parseInt(id_loai),
      ten_mon: ten_mon.trim(),
      mo_ta: mo_ta ? mo_ta.trim() : null,
      gia: parseFloat(gia),
      so_luong: so_luong ? parseInt(so_luong) : 0,
      hinh_anh: req.file ? req.file.filename : null
    };

    // Validate price
    if (foodData.gia <= 0) {
      throw new AppError('Giá món ăn phải lớn hơn 0', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Validate stock
    if (foodData.so_luong < 0) {
      throw new AppError('Số lượng không được âm', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    const createdFood = await FoodModel.create(foodData);
    const formattedFood = formatFoodItem(createdFood, req);

    logger.info('Food created successfully', {
      foodId: createdFood.id_mon,
      foodName: createdFood.ten_mon,
      price: createdFood.gia
    });

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse(formattedFood, SUCCESS_MESSAGES.CREATED)
    );
  });

  /**
   * Update food
   * PUT /api/foods/:id
   */
  static updateFood = catchAsync(async (req, res) => {
    const { id } = req.params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      throw new AppError('ID món ăn không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Check if food exists
    const existingFood = await FoodModel.getById(foodId);
    if (!existingFood) {
      throw new AppError('Món ăn không tồn tại', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const { id_loai, ten_mon, mo_ta, gia, so_luong } = req.body;
    const updateData = {};

    // Only update provided fields
    if (id_loai !== undefined) updateData.id_loai = parseInt(id_loai);
    if (ten_mon !== undefined) updateData.ten_mon = ten_mon.trim();
    if (mo_ta !== undefined) updateData.mo_ta = mo_ta ? mo_ta.trim() : null;
    if (gia !== undefined) {
      const price = parseFloat(gia);
      if (price <= 0) {
        throw new AppError('Giá món ăn phải lớn hơn 0', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }
      updateData.gia = price;
    }
    if (so_luong !== undefined) {
      const stock = parseInt(so_luong);
      if (stock < 0) {
        throw new AppError('Số lượng không được âm', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }
      updateData.so_luong = stock;
    }
    if (req.file) updateData.hinh_anh = req.file.filename;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      throw new AppError('Không có dữ liệu để cập nhật', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    const updatedFood = await FoodModel.update(foodId, updateData);
    const formattedFood = formatFoodItem(updatedFood, req);

    logger.info('Food updated successfully', {
      foodId,
      updatedFields: Object.keys(updateData),
      foodName: updatedFood.ten_mon
    });

    return res.success(formattedFood, SUCCESS_MESSAGES.UPDATED);
  });

  /**
   * Delete food
   * DELETE /api/foods/:id
   */
  static deleteFood = catchAsync(async (req, res) => {
    const { id } = req.params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      throw new AppError('ID món ăn không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Check if food exists
    const existingFood = await FoodModel.getById(foodId);
    if (!existingFood) {
      throw new AppError('Món ăn không tồn tại', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    await FoodModel.delete(foodId);

    logger.info('Food deleted successfully', {
      foodId,
      foodName: existingFood.ten_mon
    });

    return res.status(HTTP_STATUS.NO_CONTENT).send();
  });

  /**
   * Update food stock
   * PATCH /api/foods/:id/stock
   */
  static updateStock = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { so_luong } = req.body;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      throw new AppError('ID món ăn không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    if (so_luong === undefined || isNaN(so_luong) || so_luong < 0) {
      throw new AppError('Số lượng không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Check if food exists
    const existingFood = await FoodModel.getById(foodId);
    if (!existingFood) {
      throw new AppError('Món ăn không tồn tại', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const updatedFood = await FoodModel.updateStock(foodId, parseInt(so_luong));
    const formattedFood = formatFoodItem(updatedFood, req);

    logger.info('Food stock updated successfully', {
      foodId,
      oldStock: existingFood.so_luong,
      newStock: so_luong,
      foodName: existingFood.ten_mon
    });

    return res.success(formattedFood, 'Cập nhật số lượng thành công');
  });

  /**
   * Get foods by category
   * GET /api/foods/category/:categoryId
   */
  static getFoodsByCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const catId = parseInt(categoryId);

    if (isNaN(catId)) {
      throw new AppError('ID loại món không hợp lệ', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Add category filter to request
    req.filters = { ...req.filters, id_loai: catId };

    // Use the same logic as getAllFoods
    return this.getAllFoods(req, res);
  });
}

module.exports = EnhancedFoodController;
