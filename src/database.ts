import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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

  const sqlXP = `
  CREATE TABLE IF NOT EXISTS user_xp (
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, guild_id)
  ) CHARACTER SET utf8mb4;
  `;
  try {
    await pool.execute(sqlXP);
    console.log('✅ Tabla `user_xp` asegurada en la base de datos');
  } catch (err) {
    console.error('❌ Error en migración de la tabla `user_xp`:', err);
  }

  // Tabla para redes sociales
  const sqlSocialNetworks = `
    CREATE TABLE IF NOT EXISTS social_networks (
      user_id VARCHAR(20) NOT NULL,
      guild_id VARCHAR(20) NOT NULL,
      instagram VARCHAR(50),
      twitter VARCHAR(50),
      youtube VARCHAR(50),
      github VARCHAR(50),
      twitch VARCHAR(50),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, guild_id)
    ) CHARACTER SET utf8mb4;
  `;
  try {
    await pool.execute(sqlSocialNetworks);
    console.log('✅ Tabla `social_networks` asegurada en la base de datos');
  } catch (err) {
    console.error('❌ Error en migración de la tabla `social_networks`:', err);
  }

  // Funciones para gestionar mutes

  const sqlXpHistory = `
    CREATE TABLE IF NOT EXISTS user_xp_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id  VARCHAR(20) NOT NULL,
      guild_id VARCHAR(20) NOT NULL,
      xp_earned INT NOT NULL,
      source VARCHAR(32) NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id, guild_id)
    ) CHARACTER SET utf8mb4;
  `;
  try {
    await pool.execute(sqlXpHistory);
    console.log('✅ Tabla `user_xp_history` asegurada');
  } catch (err) {
    console.error('❌ Error en migración de `user_xp_history`:', err);
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

  const sqlMutes = `
    CREATE TABLE IF NOT EXISTS mutes (
      mute_id INT AUTO_INCREMENT PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      reason TEXT,
      expires_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_expires_at (expires_at)
    ) CHARACTER SET utf8mb4;
`;
  try {
    await pool.execute(sqlMutes);
    console.log('✅ Tabla `mutes` asegurada en la base de datos');
  } catch (err: any) {
    console.error('❌ Error en migración de la tabla `mutes`:', err);
  }

})();

  // Funciones para gestionar mutes
  export async function addMute(
    guildId: string,
    userId: string,
    reason: string | null,
    expiresAt: Date | null
  ): Promise<void> {
    const expires = expiresAt
      ? expiresAt.toISOString().slice(0, 19).replace('T', ' ')
      : null;
    await pool.execute(
      'INSERT INTO mutes (guild_id, user_id, reason, expires_at) VALUES (?, ?, ?, ?)',
      [guildId, userId, reason, expires]
    );
  }
  export async function getExpiredMutes(): Promise<any[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= NOW()'
    );
    return rows as any[];
  }
  export async function removeMuteById(muteId: number): Promise<void> {
    await pool.execute('DELETE FROM mutes WHERE mute_id = ?', [muteId]);
  }
  export async function removeMute(
    guildId: string,
    userId: string
  ): Promise<void> {
    await pool.execute(
      'DELETE FROM mutes WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
  }

  /**
   * Obtiene el registro de mute de un usuario, o null si no existe.
   */
  export async function getMute(
    guildId: string,
    userId: string
  ): Promise<{ mute_id: number; guild_id: string; user_id: string; reason: string | null; expires_at: Date | null } | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM mutes WHERE guild_id = ? AND user_id = ? LIMIT 1',
      [guildId, userId]
    );
    const list = rows as any[];
    return list.length ? {
      mute_id: list[0].mute_id,
      guild_id: list[0].guild_id,
      user_id: list[0].user_id,
      reason: list[0].reason,
      expires_at: list[0].expires_at
    } : null;
  }

  // Funciones para gestionar redes sociales
  export async function setSocialNetworks(
    userId: string,
    guildId: string,
    networks: {
      instagram?: string | null;
      twitter?: string | null;
      youtube?: string | null;
      github?: string | null;
      twitch?: string | null;
    }
  ): Promise<void> {
    // Comprobar si el usuario ya tiene redes sociales registradas
    const [rows] = await pool.execute(
      'SELECT * FROM social_networks WHERE user_id = ? AND guild_id = ?',
      [userId, guildId]
    );
    
    if ((rows as any[]).length === 0) {
      // Insertar nuevo registro
      await pool.execute(
        `INSERT INTO social_networks 
        (user_id, guild_id, instagram, twitter, youtube, github, twitch) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, 
          guildId, 
          networks.instagram || null, 
          networks.twitter || null, 
          networks.youtube || null, 
          networks.github || null, 
          networks.twitch || null
        ]
      );
    } else {
      // Actualizar registro existente manteniendo valores actuales si no se proporcionan nuevos
      const current = (rows as any[])[0];
      await pool.execute(
        `UPDATE social_networks SET 
        instagram = ?, 
        twitter = ?, 
        youtube = ?, 
        github = ?, 
        twitch = ? 
        WHERE user_id = ? AND guild_id = ?`,
        [
          networks.instagram !== undefined ? networks.instagram : current.instagram,
          networks.twitter !== undefined ? networks.twitter : current.twitter,
          networks.youtube !== undefined ? networks.youtube : current.youtube,
          networks.github !== undefined ? networks.github : current.github,
          networks.twitch !== undefined ? networks.twitch : current.twitch,
          userId,
          guildId
        ]
      );
    }
  }

  export async function getSocialNetworks(
    userId: string,
    guildId: string
  ): Promise<{
    instagram: string | null;
    twitter: string | null;
    youtube: string | null;
    github: string | null;
    twitch: string | null;
  } | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM social_networks WHERE user_id = ? AND guild_id = ?',
      [userId, guildId]
    );
    
    const list = rows as any[];
    if (list.length === 0) return null;
    
    return {
      instagram: list[0].instagram,
      twitter: list[0].twitter,
      youtube: list[0].youtube,
      github: list[0].github,
      twitch: list[0].twitch
    };
  }
export default pool;
