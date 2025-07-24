const express = require('express');
const router = express.Router();

// Try to import database, but handle gracefully if it fails
let db = null;
let executeQuery = null;

try {
    const dbModule = require('../config/database');
    db = dbModule.pool;
    executeQuery = dbModule.executeQuery;
    console.log('✅ Database module loaded successfully');
} catch (error) {
    console.log('⚠️ Database module not available, using mock data');
}

// Validation helper functions
const validateReservationData = (data) => {
  const errors = [];

  // Validate ten_khach
  if (!data.ten_khach || data.ten_khach.trim().length < 2) {
    errors.push('Họ tên phải có ít nhất 2 ký tự');
  }
  if (data.ten_khach && data.ten_khach.length > 100) {
    errors.push('Họ tên không được quá 100 ký tự');
  }
  if (data.ten_khach && !/^[a-zA-ZÀ-ỹ\s]+$/u.test(data.ten_khach)) {
    errors.push('Họ tên chỉ được chứa chữ cái và khoảng trắng');
  }

  // Validate sdt
  if (!data.sdt) {
    errors.push('Số điện thoại là bắt buộc');
  }
  const phone = data.sdt ? data.sdt.replace(/\s/g, '') : '';
  if (phone && !/^[0-9]{10,11}$/.test(phone)) {
    errors.push('Số điện thoại phải có 10-11 chữ số');
  }

  // Validate email if provided
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email không đúng định dạng');
  }
  if (data.email && data.email.length > 100) {
    errors.push('Email không được quá 100 ký tự');
  }

  // Validate ngay
  if (!data.ngay) {
    errors.push('Ngày đặt bàn là bắt buộc');
  }
  if (data.ngay) {
    const reservationDate = new Date(data.ngay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reservationDate < today) {
      errors.push('Không thể đặt bàn cho ngày trong quá khứ');
    }
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (reservationDate > maxDate) {
      errors.push('Chỉ có thể đặt bàn trong vòng 30 ngày tới');
    }
  }

  // Validate gio
  if (!data.gio) {
    errors.push('Giờ đặt bàn là bắt buộc');
  }
  if (data.gio) {
    const [hours, minutes] = data.gio.split(':').map(Number);
    if (hours < 10 || hours > 21 || (hours === 21 && minutes > 30)) {
      errors.push('Giờ đặt bàn phải trong khung 10:00 - 21:30');
    }
    
    // Check if time has passed for today
    if (data.ngay) {
      const reservationDate = new Date(data.ngay);
      const today = new Date();
      
      if (reservationDate.toDateString() === today.toDateString()) {
        const reservationTime = new Date(`${data.ngay} ${data.gio}`);
        if (reservationTime <= new Date()) {
          errors.push('Không thể đặt bàn cho giờ đã qua');
        }
      }
    }
  }

  // Validate so_luong_khach
  if (!data.so_luong_khach) {
    errors.push('Số lượng khách là bắt buộc');
  }
  const guests = parseInt(data.so_luong_khach);
  if (isNaN(guests) || guests < 1 || guests > 20) {
    errors.push('Số lượng khách phải từ 1 đến 20 người');
  }

  // Validate ghi_chu
  if (data.ghi_chu && data.ghi_chu.length > 500) {
    errors.push('Ghi chú không được quá 500 ký tự');
  }

  return errors;
};

// Check for duplicate reservations
const checkDuplicateReservation = async (sdt, ngay, gio, excludeId = null) => {
  try {
    let query = `
      SELECT COUNT(*) as count FROM dat_ban 
      WHERE sdt = ? AND ngay = ? AND gio = ? AND trang_thai != 'da_huy'
    `;
    let params = [sdt, ngay, gio];
    
    if (excludeId) {
      query += ' AND id_datban != ?';
      params.push(excludeId);
    }
    
    const result = await executeQuery(query, params);
    return result.success && result.data[0].count > 0;
  } catch (error) {
    console.error('Error checking duplicate reservation:', error);
    return false;
  }
};

// POST /api/datban - Create new reservation
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // Validate input data
    const validationErrors = validateReservationData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validationErrors
      });
    }

    // Check for duplicate reservations
    const isDuplicate = await checkDuplicateReservation(data.sdt, data.ngay, data.gio);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã có đặt bàn vào thời gian này rồi'
      });
    }

    // Insert reservation
    const insertQuery = `
      INSERT INTO dat_ban (ten_khach, sdt, email, ngay, gio, so_luong_khach, ghi_chu, trang_thai) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'cho_xac_nhan')
    `;
    
    const params = [
      data.ten_khach.trim(),
      data.sdt.trim(),
      data.email ? data.email.trim() : null,
      data.ngay,
      data.gio,
      parseInt(data.so_luong_khach),
      data.ghi_chu ? data.ghi_chu.trim() : null
    ];

    const result = await executeQuery(insertQuery, params);
    
    if (result.success) {
      // Get the created reservation
      const selectQuery = 'SELECT * FROM dat_ban WHERE id_datban = ?';
      const selectResult = await executeQuery(selectQuery, [result.data.insertId]);
      
      res.status(201).json({
        success: true,
        message: 'Đặt bàn thành công! Chúng tôi sẽ liên hệ xác nhận trong vòng 15 phút.',
        data: selectResult.data[0],
        id: result.data.insertId
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại sau.'
    });
  }
});

// GET /api/datban - Get all reservations with pagination and filters
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting reservations list...');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const status = req.query.status;
    const date = req.query.date;
    const phone = req.query.phone;

    let whereConditions = [];
    let params = [];

    if (status && status !== 'all') {
      whereConditions.push('trang_thai = ?');
      params.push(status);
    }

    if (date) {
      whereConditions.push('ngay = ?');
      params.push(date);
    }

    if (phone) {
      whereConditions.push('(ten_khach LIKE ? OR sdt LIKE ? OR email LIKE ?)');
      const searchTerm = `%${phone}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    console.log('🔍 Query conditions:', whereConditions);
    console.log('🔍 Query params:', params);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM dat_ban ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult.success ? countResult.data[0].total : 0;

    // Get reservations
    const selectQuery = `
      SELECT * FROM dat_ban ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const selectParams = [...params];
    const result = await executeQuery(selectQuery, selectParams);

    if (result.success) {
      console.log(`✅ Found ${result.data.length} reservations (${total} total)`);
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ Error getting reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh sách đặt bàn',
      error: error.message
    });
  }
});

// GET /api/datban/:id - Get single reservation
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }

    const query = 'SELECT * FROM dat_ban WHERE id_datban = ?';
    const result = await executeQuery(query, [id]);
    
    if (result.success && result.data.length > 0) {
      res.json({
        success: true,
        data: result.data[0]
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn'
      });
    }

  } catch (error) {
    console.error('Error getting reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy thông tin đặt bàn'
    });
  }
});

// PUT /api/datban/:id - Update reservation
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }

    // Check if reservation exists
    const checkQuery = 'SELECT * FROM dat_ban WHERE id_datban = ?';
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn'
      });
    }

    // Validate input data
    const validationErrors = validateReservationData(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: validationErrors
      });
    }

    // Check for duplicate reservations (excluding current reservation)
    const isDuplicate = await checkDuplicateReservation(data.sdt, data.ngay, data.gio, id);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Đã có đặt bàn khác vào thời gian này'
      });
    }

    // Update reservation
    const updateQuery = `
      UPDATE dat_ban SET
        ten_khach = ?, sdt = ?, email = ?, ngay = ?, gio = ?,
        so_luong_khach = ?, ghi_chu = ?, trang_thai = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_datban = ?
    `;

    const params = [
      data.ten_khach.trim(),
      data.sdt.trim(),
      data.email ? data.email.trim() : null,
      data.ngay,
      data.gio,
      parseInt(data.so_luong_khach),
      data.ghi_chu ? data.ghi_chu.trim() : null,
      data.trang_thai || 'cho_xac_nhan',
      id
    ];

    const result = await executeQuery(updateQuery, params);

    if (result.success) {
      // Get updated reservation
      const selectResult = await executeQuery(checkQuery, [id]);

      res.json({
        success: true,
        message: 'Cập nhật đặt bàn thành công',
        data: selectResult.data[0]
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật đặt bàn'
    });
  }
});

// DELETE /api/datban/:id - Delete reservation
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }

    // Check if reservation exists
    const checkQuery = 'SELECT * FROM dat_ban WHERE id_datban = ?';
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn'
      });
    }

    // Delete reservation
    const deleteQuery = 'DELETE FROM dat_ban WHERE id_datban = ?';
    const result = await executeQuery(deleteQuery, [id]);

    if (result.success) {
      res.json({
        success: true,
        message: 'Xóa đặt bàn thành công'
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa đặt bàn'
    });
  }
});

// PATCH /api/datban/:id/status - Update reservation status only
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { trang_thai } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }

    if (!trang_thai || !['cho_xac_nhan', 'da_xac_nhan', 'da_huy'].includes(trang_thai)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    // Check if reservation exists
    const checkQuery = 'SELECT * FROM dat_ban WHERE id_datban = ?';
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn'
      });
    }

    // Update status
    const updateQuery = `
      UPDATE dat_ban SET
        trang_thai = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_datban = ?
    `;

    const result = await executeQuery(updateQuery, [trang_thai, id]);

    if (result.success) {
      // Get updated reservation
      const selectResult = await executeQuery(checkQuery, [id]);

      res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: selectResult.data[0]
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật trạng thái'
    });
  }
});

// ==================== NEW HTTP METHODS ====================

/**
 * HEAD /api/datban - Get reservations metadata
 */
router.head('/', async (req, res) => {
  try {
    // Get count for metadata
    const countQuery = 'SELECT COUNT(*) as total FROM dat_ban';
    const countResult = await executeQuery(countQuery, []);

    const total = countResult.success ? countResult.data[0].total : 0;

    // Set metadata headers
    res.set({
      'X-Total-Count': total.toString(),
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Last-Modified': new Date().toUTCString()
    });

    res.status(200).end();
  } catch (error) {
    res.status(500).end();
  }
});

/**
 * OPTIONS /api/datban - Get supported methods
 */
router.options('/', (req, res) => {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Allow': methods.join(', ')
  });

  res.json({
    resource: 'datban',
    methods: methods,
    endpoints: [
      {
        method: 'GET',
        url: '/api/datban',
        description: 'Get all reservations',
        parameters: ['page', 'limit', 'status', 'date', 'phone']
      },
      {
        method: 'GET',
        url: '/api/datban/:id',
        description: 'Get reservation by ID'
      },
      {
        method: 'POST',
        url: '/api/datban',
        description: 'Create new reservation'
      },
      {
        method: 'PUT',
        url: '/api/datban/:id',
        description: 'Update reservation completely'
      },
      {
        method: 'PATCH',
        url: '/api/datban/:id',
        description: 'Update reservation partially'
      },
      {
        method: 'PATCH',
        url: '/api/datban/:id/status',
        description: 'Update reservation status'
      },
      {
        method: 'DELETE',
        url: '/api/datban/:id',
        description: 'Delete/cancel reservation'
      },
      {
        method: 'DELETE',
        url: '/api/datban/bulk',
        description: 'Delete multiple reservations'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * PATCH /api/datban/:id - Partially update reservation
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }

    // Check if reservation exists
    const checkQuery = 'SELECT * FROM dat_ban WHERE id_datban = ?';
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || checkResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn'
      });
    }

    // Build update query dynamically
    const allowedFields = ['ten_khach', 'sdt', 'email', 'ngay', 'gio', 'so_luong_khach', 'ghi_chu', 'trang_thai'];
    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field) && updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }

    // Add updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE dat_ban SET ${updateFields.join(', ')} WHERE id_datban = ?`;
    const result = await executeQuery(updateQuery, updateValues);

    if (result.success) {
      // Get updated reservation
      const selectResult = await executeQuery(checkQuery, [id]);

      res.json({
        success: true,
        message: 'Cập nhật đặt bàn thành công',
        data: selectResult.data[0],
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật đặt bàn',
      error: error.message
    });
  }
});

/**
 * DELETE /api/datban/bulk - Delete multiple reservations
 */
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách ID không hợp lệ'
      });
    }

    // Validate all IDs are numbers
    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có ID hợp lệ'
      });
    }

    // Check which reservations exist
    const placeholders = validIds.map(() => '?').join(',');
    const checkQuery = `SELECT id_datban FROM dat_ban WHERE id_datban IN (${placeholders})`;
    const checkResult = await executeQuery(checkQuery, validIds);

    if (!checkResult.success) {
      throw new Error(checkResult.error);
    }

    const existingIds = checkResult.data.map(row => row.id_datban);

    if (existingIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt bàn nào'
      });
    }

    // Delete reservations
    const deletePlaceholders = existingIds.map(() => '?').join(',');
    const deleteQuery = `DELETE FROM dat_ban WHERE id_datban IN (${deletePlaceholders})`;
    const result = await executeQuery(deleteQuery, existingIds);

    if (result.success) {
      res.json({
        success: true,
        message: `Xóa thành công ${existingIds.length} đặt bàn`,
        data: {
          deletedIds: existingIds,
          deletedCount: existingIds.length,
          requestedCount: validIds.length
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error bulk deleting reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xóa đặt bàn',
      error: error.message
    });
  }
});

/**
 * GET /api/datban/availability - Check table availability
 */
router.get('/availability', async (req, res) => {
  try {
    const { date, time, guests } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Ngày và giờ là bắt buộc'
      });
    }

    // Mock availability check (in real app, this would check actual table capacity)
    const availabilityQuery = `
      SELECT COUNT(*) as booked_tables
      FROM dat_ban
      WHERE ngay = ? AND gio = ? AND trang_thai IN ('cho_xac_nhan', 'da_xac_nhan')
    `;

    const result = await executeQuery(availabilityQuery, [date, time]);

    if (result.success) {
      const bookedTables = result.data[0].booked_tables;
      const totalTables = 20; // Mock total tables
      const availableTables = totalTables - bookedTables;

      res.json({
        success: true,
        message: 'Kiểm tra tình trạng bàn thành công',
        data: {
          date,
          time,
          requestedGuests: guests ? parseInt(guests) : null,
          totalTables,
          bookedTables,
          availableTables,
          isAvailable: availableTables > 0,
          recommendedTimes: availableTables === 0 ? [
            '18:00', '18:30', '19:30', '20:00', '20:30'
          ] : null
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi kiểm tra tình trạng bàn',
      error: error.message
    });
  }
});

module.exports = router;
