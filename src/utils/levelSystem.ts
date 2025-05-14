import db from '../database';
import { EmbedBuilder, AttachmentBuilder, Guild, GuildMember } from 'discord.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';

// Constantes para configuración del sistema
const MAX_LEVEL = 369;
const BASE_XP = 100;
const SCALE_FACTOR = 0.3; // Ajusta la dificultad global
const MILESTONE_LEVELS = [5, 10, 25, 50, 100, 200, 300, 369]; // Niveles importantes

// Directorio para almacenar fuentes y recursos
const ASSETS_DIR = path.join(__dirname, '../assets');

// Asegurarse de que el directorio de assets existe
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Registrar fuentes (necesita instalar las fuentes o usar las proporcionadas por canvas)
try {
  registerFont(path.join(ASSETS_DIR, 'Roboto-Bold.ttf'), { family: 'Roboto-Bold' });
  registerFont(path.join(ASSETS_DIR, 'Roboto-Regular.ttf'), { family: 'Roboto-Regular' });
} catch (error) {
  console.warn('⚠️ No se pudieron cargar las fuentes personalizadas, usando fuentes predeterminadas');
}

/**
 * Calcula la cantidad de XP necesaria para subir al siguiente nivel
 * La fórmula se vuelve exponencialmente más difícil en niveles altos
 */
export function calculateXPForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Number.MAX_SAFE_INTEGER;
  
  // Fórmula mejorada con curva más pronunciada para niveles altos
  // Base + (nivel^2.5 * factor de escala)
  return Math.floor(BASE_XP + Math.pow(level, 2.5) * SCALE_FACTOR * (1 + level/100));
}

/**
 * Calcula el XP total necesario desde nivel 1 hasta el nivel especificado
 */
export function calculateTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += calculateXPForNextLevel(i);
  }
  return total;
}

/**
 * Calcula el progreso en porcentaje hacia el siguiente nivel
 */
export function calculateLevelProgress(xp: number, level: number): number {
  const xpForNextLevel = calculateXPForNextLevel(level);
  return Math.min(100, Math.floor((xp / xpForNextLevel) * 100));
}

/**
 * Determina si un nivel dado es un nivel "milestone" con recompensas especiales
 */
export function isMilestoneLevel(level: number): boolean {
  return MILESTONE_LEVELS.includes(level);
}

/**
 * Agrega XP a un usuario y maneja subidas de nivel
 * @returns Un objeto con la información actualizada y si subió de nivel
 */
export async function addXP(userId: string, guildId: string, xpToAdd = 10): Promise<{
  xp: number;
  level: number;
  leveledUp: boolean;
  totalXp: number;
  isMilestone: boolean;
}> {
  // Obtener datos actuales del usuario
  const [rows]: any = await db.execute(
    'SELECT xp, level, (SELECT SUM(xp_earned) FROM user_xp_history WHERE user_id = ? AND guild_id = ?) as total_xp FROM user_xp WHERE user_id = ? AND guild_id = ?', 
    [userId, guildId, userId, guildId]
  );
  
  let xp = 0, level = 1, totalXp = 0, oldLevel = 1;
  
  // Si el usuario existe, cargar sus datos
  if (rows.length) {
    xp = rows[0].xp;
    level = rows[0].level;
    totalXp = rows[0].total_xp || 0;
    oldLevel = level;
  } else {
    // Crear registro para nuevo usuario
    await db.execute('INSERT INTO user_xp (user_id, guild_id) VALUES (?, ?)', [userId, guildId]);
  }
  
  // Añadir XP ganado al historial
  await db.execute(
    'INSERT INTO user_xp_history (user_id, guild_id, xp_earned, source) VALUES (?, ?, ?, ?)',
    [userId, guildId, xpToAdd, 'message']
  );
  
  // Sumar XP al usuario
  xp += xpToAdd;
  totalXp += xpToAdd;
  let leveledUp = false;
  
  // Comprobar si sube de nivel
  let xpForNextLevel = calculateXPForNextLevel(level);
  while (xp >= xpForNextLevel && level < MAX_LEVEL) {
    level++;
    xp -= xpForNextLevel;
    leveledUp = true;
    xpForNextLevel = calculateXPForNextLevel(level);
  }
  
  // Si el usuario alcanzó el nivel máximo, mantener el XP en 0
  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    xp = 0;
  }
  
  // Actualizar los datos en la base de datos
  await db.execute(
    'UPDATE user_xp SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?', 
    [xp, level, userId, guildId]
  );
  
  // Comprobar si se alcanzó un nivel milestone
  const isMilestone = leveledUp && isMilestoneLevel(level);
  
  return { 
    xp, 
    level, 
    leveledUp, 
    totalXp,
    isMilestone
  };
}

/**
 * Obtiene los datos de nivel de un usuario
 */
export async function getLevelData(userId: string, guildId: string): Promise<{
  xp: number;
  level: number;
  totalXp: number;
  xpForNextLevel: number;
  progress: number;
  rank: number;
}> {
  // Consulta completa que obtiene XP, nivel, XP total y ranking
  const [rows]: any = await db.execute(`
    SELECT 
      u.xp, 
      u.level, 
      (SELECT SUM(xp_earned) FROM user_xp_history WHERE user_id = ? AND guild_id = ?) as total_xp,
      (SELECT COUNT(*)+1 FROM user_xp WHERE guild_id = ? AND 
        (level > u.level OR (level = u.level AND xp > u.xp))) as rank
    FROM user_xp u 
    WHERE u.user_id = ? AND u.guild_id = ?
  `, [userId, guildId, guildId, userId, guildId]);
  
  if (!rows.length) {
    return { 
      xp: 0, 
      level: 1, 
      totalXp: 0,
      xpForNextLevel: calculateXPForNextLevel(1),
      progress: 0,
      rank: 0
    };
  }
  
  const userData = rows[0];
  const xpForNextLevel = calculateXPForNextLevel(userData.level);
  const progress = calculateLevelProgress(userData.xp, userData.level);
  
  return {
    xp: userData.xp,
    level: userData.level,
    totalXp: userData.total_xp || 0,
    xpForNextLevel,
    progress,
    rank: userData.rank
  };
}

/**
 * Resetea el nivel de un usuario
 */
export async function resetLevel(userId: string, guildId: string): Promise<void> {
  await db.execute('UPDATE user_xp SET xp = 0, level = 1 WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
}

/**
 * Añade niveles directamente a un usuario
 */
export async function addLevels(userId: string, guildId: string, levelsToAdd: number): Promise<{
  level: number;
  xp: number;
}> {
  const current = await getLevelData(userId, guildId);
  const newLevel = Math.min(MAX_LEVEL, current.level + levelsToAdd);
  
  return await db.execute('UPDATE user_xp SET level = ? WHERE user_id = ? AND guild_id = ?', [newLevel, userId, guildId])
    .then(() => ({ level: newLevel, xp: current.xp }));
}

/**
 * Genera un canvas con la tarjeta de nivel del usuario
 */
export async function generateLevelCard(
  member: GuildMember,
  levelData: {
    xp: number;
    level: number;
    totalXp: number;
    xpForNextLevel: number;
    progress: number;
    rank: number;
  }
): Promise<AttachmentBuilder> {
  // Crear canvas
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Fondo con degradado
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Borde redondeado
  ctx.strokeStyle = '#30475e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
  ctx.stroke();
  
  try {
    // Avatar del usuario
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Dibujar círculo para el avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Dibujar avatar
    ctx.drawImage(avatar, 40, 40, 160, 160);
    ctx.restore();
    
    // Añadir un borde al avatar
    ctx.strokeStyle = levelData.level >= 100 ? '#ffd700' : levelData.level >= 50 ? '#c0c0c0' : '#cd7f32';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
  } catch (error) {
    console.error('Error al cargar avatar:', error);
    // Dibujar placeholder si falla
    ctx.fillStyle = '#555';
    ctx.fillRect(40, 40, 160, 160);
  }
  
  // Información del usuario
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px "Roboto-Bold", sans-serif';
  ctx.fillText(member.user.username, 240, 80);
  
  // Nivel y Rank
  ctx.fillStyle = '#f5f5f5';
  ctx.font = '22px "Roboto-Regular", sans-serif';
  ctx.fillText(`Nivel: ${levelData.level}`, 240, 120);
  ctx.fillText(`Rank: #${levelData.rank || '?'}`, 400, 120);
  
  // XP actual y necesario
  ctx.fillText(`XP: ${levelData.xp} / ${levelData.xpForNextLevel}`, 240, 160);
  ctx.fillText(`Total XP: ${levelData.totalXp}`, 500, 160);
  
  // Barra de progreso (fondo)
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.roundRect(240, 190, 500, 30, 15);
  ctx.fill();
  
  // Barra de progreso (relleno)
  const progressWidth = Math.max(10, (levelData.progress / 100) * 500);
  
  // Color basado en el nivel
  let progressColor;
  if (levelData.level >= 300) progressColor = '#ff2281';      // Rosa intenso
  else if (levelData.level >= 200) progressColor = '#9900ff'; // Púrpura
  else if (levelData.level >= 100) progressColor = '#ffd700'; // Dorado
  else if (levelData.level >= 50) progressColor = '#1e88e5';  // Azul
  else progressColor = '#43a047';                             // Verde
  
  ctx.fillStyle = progressColor;
  ctx.beginPath();
  ctx.roundRect(240, 190, progressWidth, 30, 15);
  ctx.fill();
  
  // Porcentaje de progreso
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px "Roboto-Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${levelData.progress}%`, 240 + 250, 212);
  
  // Mensaje motivacional
  let message = '';
  if (levelData.level >= 350) message = '¡Leyenda absoluta!';
  else if (levelData.level >= 300) message = '¡Increíble dedicación!';
  else if (levelData.level >= 200) message = '¡Maestría impresionante!';
  else if (levelData.level >= 100) message = '¡Gran progreso!';
  else if (levelData.level >= 50) message = '¡Buen trabajo!';
  else if (levelData.level >= 25) message = '¡Sigue así!';
  else message = '¡Apenas empiezas!';
  
  ctx.fillText(message, 490, 250);
  
  // Convertir el canvas a una imagen
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'levelcard.png' });
}

/**
 * Obtiene el ranking de usuarios por nivel en un servidor
 */
export async function getServerRanking(guildId: string, limit = 10): Promise<any[]> {
  const [rows]: any = await db.execute(`
    SELECT user_id, level, xp,
      (SELECT SUM(xp_earned) FROM user_xp_history WHERE user_id = user_xp.user_id AND guild_id = ?) as total_xp
    FROM user_xp 
    WHERE guild_id = ? 
    ORDER BY level DESC, xp DESC 
    LIMIT ?
  `, [guildId, guildId, limit]);
  
  return rows;
}

/**
 * Obtiene las estadísticas de actividad de un usuario
 */
export async function getUserActivityStats(userId: string, guildId: string): Promise<{
  dailyAverage: number;
  weeklyTotal: number;
  mostActiveDay: string;
  xpBySource: Record<string, number>;
}> {
  // XP diario promedio de la última semana
  const [dailyAvg]: any = await db.execute(`
    SELECT AVG(daily_xp) as average
    FROM (
      SELECT DATE(timestamp) as day, SUM(xp_earned) as daily_xp
      FROM user_xp_history
      WHERE user_id = ? AND guild_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
    ) as daily_stats
  `, [userId, guildId]);
  
  // XP total de la semana
  const [weeklyTotal]: any = await db.execute(`
    SELECT SUM(xp_earned) as total
    FROM user_xp_history
    WHERE user_id = ? AND guild_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `, [userId, guildId]);
  
  // Día más activo
  const [activeDay]: any = await db.execute(`
    SELECT DATE_FORMAT(DATE(timestamp), '%W') as day, SUM(xp_earned) as daily_xp
    FROM user_xp_history
    WHERE user_id = ? AND guild_id = ?
    GROUP BY DATE(timestamp)
    ORDER BY daily_xp DESC
    LIMIT 1
  `, [userId, guildId]);
  
  // XP por fuente
  const [sources]: any = await db.execute(`
    SELECT source, SUM(xp_earned) as total
    FROM user_xp_history
    WHERE user_id = ? AND guild_id = ?
    GROUP BY source
  `, [userId, guildId]);
  
  const xpBySource: Record<string, number> = {};
  (sources as any[]).forEach(row => {
    xpBySource[row.source] = row.total;
  });
  
  return {
    dailyAverage: Math.round(dailyAvg[0]?.average || 0),
    weeklyTotal: weeklyTotal[0]?.total || 0,
    mostActiveDay: activeDay[0]?.day || 'N/A',
    xpBySource
  };
}

/**
 * Añade una cantidad de XP personalizada desde una fuente específica
 */
export async function addXPFromSource(
  userId: string, 
  guildId: string, 
  xpAmount: number, 
  source: string
): Promise<{
  xp: number;
  level: number;
  leveledUp: boolean;
}> {
  // Insertar en el historial
  await db.execute(
    'INSERT INTO user_xp_history (user_id, guild_id, xp_earned, source) VALUES (?, ?, ?, ?)',
    [userId, guildId, xpAmount, source]
  );
  
  // Añadir XP normalmente
  return addXP(userId, guildId, xpAmount);
}