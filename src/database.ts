import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { config } from 'dotenv';

config();

// Configuración del pool con tipos explícitos
const poolConfig: PoolOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool: Pool = createPool(poolConfig);

// Migración automática
(async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      subject TEXT NOT NULL,
      status ENUM('OPEN','ASSIGNED','CLOSED') NOT NULL DEFAULT 'OPEN',
      assigned_staff_id VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    CHARACTER SET utf8mb4;
  `;
  await pool.execute(sql);
})();

export default pool;