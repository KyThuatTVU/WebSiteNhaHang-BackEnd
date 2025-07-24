// Database Configuration
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'TVU@842004',
  database: process.env.DB_NAME || 'QuanLyNhaHang',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  // Removed invalid options: acquireTimeout, timeout, reconnect
  charset: 'utf8mb4',
  timezone: '+07:00'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log('✅ Database connected successfully!');
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to the database:');
    console.error(err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    const connection = await pool.getConnection();

    // Create dat_ban table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS dat_ban (
        id_datban INT AUTO_INCREMENT PRIMARY KEY,
        ten_khach VARCHAR(100) NOT NULL,
        sdt VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        ngay DATE NOT NULL,
        gio TIME NOT NULL,
        so_luong_khach INT NOT NULL,
        ghi_chu TEXT,
        trang_thai ENUM('cho_xac_nhan','da_xac_nhan','da_huy')
          NOT NULL DEFAULT 'cho_xac_nhan',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ngay_gio (ngay, gio),
        INDEX idx_sdt (sdt),
        INDEX idx_trang_thai (trang_thai),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Table dat_ban initialized successfully');

    // Bảng hóa đơn và chi tiết hóa đơn đã được loại bỏ
    // Sử dụng dữ liệu ảo trong frontend thay thế
    console.log('ℹ️ Skipping hoa_don and chi_tiet_hoa_don tables - using mock data in frontend');

    // Create khach_hang table if not exists
    const createKhachHangQuery = `
      CREATE TABLE IF NOT EXISTS khach_hang (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createKhachHangQuery);
    console.log('✅ Table khach_hang initialized successfully');

    // Create loai_mon table if not exists
    const createLoaiMonQuery = `
      CREATE TABLE IF NOT EXISTS loai_mon (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ten_loai VARCHAR(100) NOT NULL,
        mo_ta TEXT,
        hinh_anh VARCHAR(255),
        thu_tu INT DEFAULT 0,
        trang_thai ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trang_thai (trang_thai),
        INDEX idx_thu_tu (thu_tu)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createLoaiMonQuery);
    console.log('✅ Table loai_mon initialized successfully');

    // Create mon_an table if not exists
    const createMonAnQuery = `
      CREATE TABLE IF NOT EXISTS mon_an (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ten_mon VARCHAR(100) NOT NULL,
        mo_ta TEXT,
        gia DECIMAL(10,2) NOT NULL,
        hinh_anh VARCHAR(255),
        id_loai INT NOT NULL,
        trang_thai ENUM('available','unavailable') DEFAULT 'available',
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_loai) REFERENCES loai_mon(id) ON DELETE CASCADE,
        INDEX idx_id_loai (id_loai),
        INDEX idx_trang_thai (trang_thai),
        INDEX idx_is_featured (is_featured)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createMonAnQuery);
    console.log('✅ Table mon_an initialized successfully');

    // Foreign key constraints for hoa_don table removed - using mock data

    // Insert sample data if tables are empty
    await insertSampleData(connection);

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize tables:', error.message);
    return false;
  }
};

// Initialize database connection
const initDatabase = async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('Database connection failed');
  }

  // Initialize tables
  await initializeTables();
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Database query error:', error.message);
    return { success: false, error: error.message };
  }
};

// Insert sample data
const insertSampleData = async (connection) => {
  try {
    // Check if data already exists
    const [khachHangCount] = await connection.execute('SELECT COUNT(*) as count FROM khach_hang');
    const [loaiMonCount] = await connection.execute('SELECT COUNT(*) as count FROM loai_mon');

    if (khachHangCount[0].count === 0) {
      // Insert sample customers
      const insertCustomers = `
        INSERT INTO khach_hang (full_name, email, phone, password, address) VALUES
        ('Nguyễn Văn A', 'nguyenvana@email.com', '0987654321', '$2b$10$example', '123 Đường ABC, Quận 1, TP.HCM'),
        ('Trần Thị B', 'tranthib@email.com', '0976543210', '$2b$10$example', '456 Đường XYZ, Quận 2, TP.HCM'),
        ('Lê Văn C', 'levanc@email.com', '0965432109', '$2b$10$example', '789 Đường DEF, Quận 3, TP.HCM')
      `;
      await connection.execute(insertCustomers);
      console.log('✅ Sample customers inserted');
    }

    if (loaiMonCount[0].count === 0) {
      // Insert sample categories
      const insertCategories = `
        INSERT INTO loai_mon (ten_loai, mo_ta, thu_tu) VALUES
        ('Món Chính', 'Các món ăn chính của nhà hàng', 1),
        ('Món Khai Vị', 'Các món khai vị hấp dẫn', 2),
        ('Món Tráng Miệng', 'Các món tráng miệng ngọt ngào', 3),
        ('Đồ Uống', 'Các loại đồ uống giải khát', 4),
        ('Lẩu', 'Các món lẩu đặc sắc', 5)
      `;
      await connection.execute(insertCategories);
      console.log('✅ Sample categories inserted');

      // Insert sample dishes
      const insertDishes = `
        INSERT INTO mon_an (ten_mon, mo_ta, gia, hinh_anh, id_loai, is_featured) VALUES
        ('Cơm Tấm Sườn Nướng', 'Cơm tấm thơm ngon với sườn nướng đặc biệt', 45000, 'img/comtam.webp', 1, TRUE),
        ('Phở Bò Tái', 'Phở bò truyền thống với thịt bò tái', 50000, 'img/pho-bo.jpg', 1, TRUE),
        ('Bún Bò Huế', 'Bún bò Huế cay nồng đậm đà', 48000, 'img/bunbohue.png', 1, FALSE),
        ('Bánh Xèo', 'Bánh xèo giòn rụm với tôm thịt', 35000, 'img/banhxeo.jpg', 2, TRUE),
        ('Gỏi Cuốn', 'Gỏi cuốn tươi mát với tôm thịt', 25000, 'img/goicuon.jpg', 2, FALSE),
        ('Chả Giò', 'Chả giò giòn tan thơm ngon', 30000, 'img/chagioPN.jpg', 2, FALSE),
        ('Chè Bà Ba', 'Chè bà ba ngọt mát', 20000, 'img/chebap.webp', 3, FALSE),
        ('Trà Đá', 'Trà đá mát lạnh', 10000, 'img/tratac.jpg', 4, FALSE),
        ('Nước Sam Lạnh', 'Nước sam giải nhiệt', 15000, 'img/nuocsamlanh.jpg', 4, FALSE),
        ('Lẩu Cá Kèo', 'Lẩu cá kèo chua cay đặc sắc', 120000, 'img/laucakeo.jpg', 5, TRUE)
      `;
      await connection.execute(insertDishes);
      console.log('✅ Sample dishes inserted');
    }

  } catch (error) {
    console.log('ℹ️ Sample data insertion skipped or failed:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  initDatabase,
  initializeTables,
  executeQuery,
  insertSampleData
};
