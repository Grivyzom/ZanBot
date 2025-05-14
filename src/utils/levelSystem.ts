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
  registerFont(path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf'), { family: 'Roboto' });
} catch (error) {
  console.warn('⚠️ No se pudieron cargar las fuentes personalizadas, usando fuentes predeterminadas');
}

/**
 * Formatea números grandes de manera legible
 * Por ejemplo: 1500 -> 1.5K, 1500000 -> 1.5M
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
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
  
  // Fondo con degradado más atractivo
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  
  // Seleccionar colores basados en el nivel
  if (levelData.level >= 300) {
    // Tema legendario (púrpura y dorado)
    gradient.addColorStop(0, '#1a0033');
    gradient.addColorStop(1, '#4d0099');
  } else if (levelData.level >= 200) {
    // Tema épico (azul oscuro y morado)
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#330066');
  } else if (levelData.level >= 100) {
    // Tema dorado (azul marino y dorado)
    gradient.addColorStop(0, '#002B36');
    gradient.addColorStop(1, '#073642');
  } else if (levelData.level >= 50) {
    // Tema avanzado (azul oscuro)
    gradient.addColorStop(0, '#0A192F');
    gradient.addColorStop(1, '#172A45');
  } else {
    // Tema inicial (gris oscuro y azul)
    gradient.addColorStop(0, '#1E1E2C');
    gradient.addColorStop(1, '#2D3748');
  }
  
  // Aplicar gradiente de fondo
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Efecto de brillo/glow para niveles altos
  if (levelData.level >= 300) {
    // Añadir un sutil brillo dorado en los bordes
    const glowGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 50,
      canvas.width / 2, canvas.height / 2, 400
    );
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0.15)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Borde redondeado con efecto de brillo
  ctx.strokeStyle = levelData.level >= 300 ? '#ffd700' : 
                    levelData.level >= 200 ? '#9370db' : 
                    levelData.level >= 100 ? '#c0c0c0' : 
                    levelData.level >= 50 ? '#4682b4' : '#607d8b';
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
    
    // Añadir un borde al avatar con color basado en nivel
    let borderColor;
    if (levelData.level >= 300) borderColor = '#ffd700'; // Dorado para legendario
    else if (levelData.level >= 200) borderColor = '#9370db'; // Púrpura para épico
    else if (levelData.level >= 100) borderColor = '#c0c0c0'; // Plata para avanzado
    else if (levelData.level >= 50) borderColor = '#4682b4'; // Azul para intermedio
    else borderColor = '#cd7f32'; // Bronce para principiante
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(120, 120, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    
    // Añadir un efecto de brillo para niveles altos
    if (levelData.level >= 100) {
      ctx.strokeStyle = levelData.level >= 300 ? 'rgba(255, 215, 0, 0.5)' : 
                        levelData.level >= 200 ? 'rgba(147, 112, 219, 0.5)' : 
                        'rgba(192, 192, 192, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(120, 120, 90, 0, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();
    }
  } catch (error) {
    console.error('Error al cargar avatar:', error);
    // Dibujar placeholder si falla
    ctx.fillStyle = '#555';
    ctx.fillRect(40, 40, 160, 160);
  }
  
  // Información del usuario con mejor estilo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Roboto-Bold", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(member.user.username, 240, 80);
  
  // Nivel y Rank con iconos
  ctx.fillStyle = '#f5f5f5';
  ctx.font = 'bold 24px "Roboto-Bold", sans-serif';
  
  // Iconos para nivel y rank
  ctx.fillText(`⚡ Nivel: ${levelData.level}`, 240, 120);
  ctx.fillText(`🏆 Rank: #${levelData.rank || '?'}`, 450, 120);
  
  // XP actual y necesario con formato para números grandes
  ctx.font = '22px "Roboto-Regular", sans-serif';
  ctx.fillText(`✨ XP: ${formatNumber(levelData.xp)} / ${formatNumber(levelData.xpForNextLevel)}`, 240, 160);
  ctx.fillText(`📊 Total: ${formatNumber(levelData.totalXp)} XP`, 500, 160);
  
  // Barra de progreso (fondo)
  ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
  ctx.beginPath();
  ctx.roundRect(240, 190, 500, 25, 12.5);
  ctx.fill();
  
  // Barra de progreso (relleno)
  const progressWidth = Math.max(10, (levelData.progress / 100) * 500);
  
  // Colores de nivel para la barra de progreso
  let progressGradient = ctx.createLinearGradient(240, 0, 240 + progressWidth, 0);
  
  if (levelData.level >= 300) {
    // Púrpura legendario a dorado
    progressGradient.addColorStop(0, '#9900ff');
    progressGradient.addColorStop(1, '#ffd700');
  } else if (levelData.level >= 200) {
    // Púrpura intenso
    progressGradient.addColorStop(0, '#9900ff');
    progressGradient.addColorStop(1, '#cc00ff');
  } else if (levelData.level >= 100) {
    // Dorado
    progressGradient.addColorStop(0, '#ffd700');
    progressGradient.addColorStop(1, '#ffcc00');
  } else if (levelData.level >= 50) {
    // Azul
    progressGradient.addColorStop(0, '#1e88e5');
    progressGradient.addColorStop(1, '#64b5f6');
  } else {
    // Verde
    progressGradient.addColorStop(0, '#43a047');
    progressGradient.addColorStop(1, '#66bb6a');
  }
  
  ctx.fillStyle = progressGradient;
  ctx.beginPath();
  ctx.roundRect(240, 190, progressWidth, 25, 12.5);
  ctx.fill();
  
  // Porcentaje de progreso
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Roboto-Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${levelData.progress}%`, 240 + 250, 208);
  
  // Mensaje motivacional con mejor estilo
  let message = '';
  if (levelData.level >= 350) message = '✨ ¡LEYENDA ABSOLUTA! ✨';
  else if (levelData.level >= 300) message = '🌟 ¡Increíble dedicación! 🌟';
  else if (levelData.level >= 200) message = '💫 ¡Maestría impresionante! 💫';
  else if (levelData.level >= 100) message = '🔥 ¡Gran progreso! 🔥';
  else if (levelData.level >= 50) message = '👏 ¡Buen trabajo! 👏';
  else if (levelData.level >= 25) message = '👍 ¡Sigue así! 👍';
  else message = '🚀 ¡Apenas empiezas! 🚀';
  
  ctx.font = 'bold 20px "Roboto-Bold", sans-serif';
  ctx.fillText(message, 490, 250);
  
  // Añadir marca de tiempo sutil
  ctx.font = '14px "Roboto-Regular", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`Generado: ${new Date().toLocaleDateString()}`, canvas.width - 20, canvas.height - 15);
  
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