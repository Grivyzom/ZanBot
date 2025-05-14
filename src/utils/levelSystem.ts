import db from '../database';

export async function addXP(userId: string, guildId: string, xpToAdd = 10) {
  const [rows]: any = await db.execute('SELECT xp, level FROM user_xp WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
  let xp = 0, level = 1;

  if (rows.length) {
    xp = rows[0].xp;
    level = rows[0].level;
  } else {
    await db.execute('INSERT INTO user_xp (user_id, guild_id) VALUES (?, ?)', [userId, guildId]);
  }

  xp += xpToAdd;
  const xpNeeded = 5 * Math.pow(level, 2) + 50 * level + 100;

  if (xp >= xpNeeded) {
    level++;
    xp -= xpNeeded;
    // Puedes enviar mensaje aquí si quieres notificar que subió de nivel
  }

  await db.execute('UPDATE user_xp SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?', [xp, level, userId, guildId]);
  return { xp, level };

  
}

export async function getLevelData(userId: string, guildId: string) {
  const [rows]: any = await db.execute('SELECT xp, level FROM user_xp WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
  if (rows.length) return rows[0];
  return { xp: 0, level: 1 };
}

export async function resetLevel(userId: string, guildId: string) {
  await db.execute('UPDATE user_xp SET xp = 0, level = 1 WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
}

export async function addLevels(userId: string, guildId: string, levelsToAdd: number) {
  const current = await getLevelData(userId, guildId);
  const newLevel = current.level + levelsToAdd;
  return await db.execute('UPDATE user_xp SET level = ? WHERE user_id = ? AND guild_id = ?', [newLevel, userId, guildId])
    .then(() => ({ level: newLevel, xp: current.xp }));
}
