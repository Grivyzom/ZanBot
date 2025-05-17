// src/api/statusGRV.ts
import express from 'express';
import cors from 'cors';
import type { Client } from 'discord.js';

export function initStatusApi(client: Client) {
  const app  = express();
  app.use(cors());                 // 👈 permite peticiones cross-origin
  const port = Number(process.env.API_PORT ?? 3001);
  const guildId = process.env.GUILD_ID!;          // mismo que ya usas en .env

  app.get('/status-grv', async (_req, res) => {
    try {
      // Aseguramos datos actualizados
      const guild  = await client.guilds.fetch(guildId);
      await guild.members.fetch({ withPresences: true });

      /* Datos útiles */
      const totalMembers = guild.memberCount;
      const onlineMembers = guild.members.cache
        .filter(m => m.presence && m.presence.status !== 'offline').size;

      const voiceUsers = guild.channels.cache
        .filter(c => c.isVoiceBased())
        .reduce((acc, c: any) => acc + c.members.size, 0);

      res.json({
        guildId,
        guildName: guild.name,
        totalMembers,
        onlineMembers,
        voiceUsers,
        boosts: guild.premiumSubscriptionCount,
        fetchedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[StatusGRV] Error al obtener datos:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  return app.listen(port, () =>
    console.log(`📡 StatusGRV API escuchando en http://localhost:${port}/status-grv`)
  );
}
export default initStatusApi;
