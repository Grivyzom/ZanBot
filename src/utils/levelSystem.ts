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
