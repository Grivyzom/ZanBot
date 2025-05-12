import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Configuración y creación del pool de conexión con límites optimizados
const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASS!,
  database: process.env.DB_NAME!,
  port: Number(process.env.DB_PORT!),
  waitForConnections: true,
  connectionLimit: 100, // Aumentado para manejar mayor carga de 10 a 100
  queueLimit: 50, // Habilitado para manejar picos de conexiones de 0 a 50
});

// Crear la base de datos si no existe y seleccionarla
(async () => {
  const dbName = process.env.DB_NAME!;
  try {
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await pool.query(`USE \`${dbName}\`;`);
  } catch (err: any) {
    console.error('❌ No se pudo crear o seleccionar la base de datos:', err);
    return;
  }

  // Asegurar que la tabla tickets exista
  const sql = `
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      subject TEXT NOT NULL,
      status ENUM('OPEN','ASSIGNED','CLOSED') NOT NULL DEFAULT 'OPEN',
      assigned_staff_id VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;
  `;
  try {
    await pool.execute(sql);
    console.log('✅ Tabla `tickets` asegurada en la base de datos');
  } catch (err: any) {
    console.error('❌ Error en migración de la tabla `tickets`:', err);
  }

  // Asegurar que la tabla reports exista
  const sqlReports = `
    CREATE TABLE IF NOT EXISTS reports (
      report_id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      reason TEXT NOT NULL,
      reported_by VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4;
  `;
  try {
    await pool.execute(sqlReports);
    console.log('✅ Tabla `reports` asegurada en la base de datos');
  } catch (err: any) {
    console.error('❌ Error en migración de la tabla `reports`:', err);
  }
})();

export default pool;
