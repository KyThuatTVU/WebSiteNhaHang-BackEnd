// Validation Middleware
const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Food item validation rules
const validateFoodItem = [
  body('id_loai')
    .isInt({ min: 1 })
    .withMessage('ID loại món phải là số nguyên dương'),
  
  body('ten_mon')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Tên món phải từ 2-255 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\(\)]+$/)
    .withMessage('Tên món chỉ được chứa chữ cái, số, dấu cách, dấu gạch ngang và dấu ngoặc'),
  
  body('mo_ta')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  
  body('gia')
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số dương')
    .custom((value) => {
      if (value > 10000000) {
        throw new Error('Giá không được vượt quá 10,000,000 VNĐ');
      }
      return true;
    }),
  
  body('so_luong')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm'),
  
  handleValidationErrors
];

// Update food item validation (all fields optional)
const validateFoodItemUpdate = [
  body('id_loai')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID loại món phải là số nguyên dương'),
  
  body('ten_mon')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Tên món phải từ 2-255 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-\(\)]+$/)
    .withMessage('Tên món chỉ được chứa chữ cái, số, dấu cách, dấu gạch ngang và dấu ngoặc'),
  
  body('mo_ta')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được vượt quá 1000 ký tự'),
  
  body('gia')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số dương')
    .custom((value) => {
      if (value > 10000000) {
        throw new Error('Giá không được vượt quá 10,000,000 VNĐ');
      }
      return true;
    }),
  
  body('so_luong')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm'),
  
  handleValidationErrors
];

// Stock update validation
const validateStockUpdate = [
  body('so_luong')
    .isInt({ min: 0 })
    .withMessage('Số lượng phải là số nguyên không âm')
    .custom((value) => {
      if (value > 1000) {
        throw new Error('Số lượng không được vượt quá 1000');
      }
      return true;
    }),
  
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID phải là số nguyên dương'),
  
  handleValidationErrors
];

// Query parameter validation for food list
const validateFoodQuery = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Từ khóa tìm kiếm không được vượt quá 100 ký tự'),
  
  query('category')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category phải là số nguyên dương'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá tối thiểu phải là số không âm'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá tối đa phải là số không âm'),
  
  query('available')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Available phải là true hoặc false'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit phải từ 1-100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset phải là số không âm'),
  
  handleValidationErrors
];

// User registration validation
const validateUserRegistration = [
  body('ten_kh')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên khách hàng phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
    .withMessage('Tên chỉ được chứa chữ cái và dấu cách'),
  
  body('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  
  body('mat_khau')
    .isLength({ min: 6, max: 50 })
    .withMessage('Mật khẩu phải từ 6-50 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('so_dt')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),
  
  body('dia_chi')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Địa chỉ không được vượt quá 255 ký tự'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),
  
  body('mat_khau')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),
  
  handleValidationErrors
];

module.exports = {
  validateFoodItem,
  validateFoodItemUpdate,
  validateStockUpdate,
  validateId,
  validateFoodQuery,
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors
};
