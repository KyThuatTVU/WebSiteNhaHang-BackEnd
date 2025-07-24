// Category Controller - Business Logic Layer
const CategoryModel = require('../models/CategoryModel');
const { formatFoodItem, buildPagination } = require('../utils/helpers');
const { catchAsync } = require('../middleware/errorHandler');
const { logApiResponse } = require('../utils/logger');

class CategoryController {
  /**
   * Get all categories
   */
  static getAllCategories = catchAsync(async (req, res) => {
    const categories = await CategoryModel.getAll();

    const response = {
      success: true,
      data: categories,
      total: categories.length
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get category by ID
   */
  static getCategoryById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const category = await CategoryModel.getById(parseInt(id));
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Loại món không tồn tại',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const response = {
      success: true,
      data: category
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Get food items by category
   */
  static getFoodsByCategory = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const pagination = {
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset)
    };

    const { category, data, total } = await CategoryModel.getFoodsByCategory(
      parseInt(id), 
      pagination
    );

    const formattedData = data.map(item => formatFoodItem(item, req));
    const paginationInfo = buildPagination(total, pagination.limit, pagination.offset);

    const response = {
      success: true,
      category,
      data: formattedData,
      pagination: paginationInfo
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Create new category
   */
  static createCategory = catchAsync(async (req, res) => {
    const { ten_loai, mo_ta } = req.body;
    
    const categoryData = {
      ten_loai: ten_loai.trim(),
      mo_ta: mo_ta ? mo_ta.trim() : null
    };

    const createdCategory = await CategoryModel.create(categoryData);

    const response = {
      success: true,
      message: 'Tạo loại món thành công',
      data: createdCategory
    };

    logApiResponse(req, res, response);
    res.status(201).json(response);
  });

  /**
   * Update category
   */
  static updateCategory = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { ten_loai, mo_ta } = req.body;

    const updateData = {};
    
    if (ten_loai !== undefined) updateData.ten_loai = ten_loai.trim();
    if (mo_ta !== undefined) updateData.mo_ta = mo_ta ? mo_ta.trim() : null;

    const updatedCategory = await CategoryModel.update(parseInt(id), updateData);

    const response = {
      success: true,
      message: 'Cập nhật loại món thành công',
      data: updatedCategory
    };

    logApiResponse(req, res, response);
    res.json(response);
  });

  /**
   * Delete category
   */
  static deleteCategory = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const deletedCategory = await CategoryModel.delete(parseInt(id));

    const response = {
      success: true,
      message: `Đã xóa loại món "${deletedCategory.ten_loai}" thành công`,
      data: {
        id_loai: deletedCategory.id_loai,
        ten_loai: deletedCategory.ten_loai
      }
    };

    logApiResponse(req, res, response);
    res.json(response);
  });
}

module.exports = CategoryController;
