import { Client, TextChannel, Snowflake } from 'discord.js';
import pool from '../database';

const tasks = new Map<Snowflake, NodeJS.Timeout>();

export async function initCleanerScheduler(client: Client) {
  const [rows] = (await pool.query(
    'SELECT channel_id, interval_seconds FROM channel_cleaner',
  )) as [{ channel_id: string; interval_seconds: number }[], unknown];

  rows.forEach(({ channel_id, interval_seconds }) =>
    addOrUpdateTask(client, channel_id, interval_seconds),
  );
}

export async function addOrUpdateTask(
  client: Client,
  channelId: Snowflake,
  intervalSeconds: number,
) {
  // Limpia viejo timer
  if (tasks.has(channelId)) clearInterval(tasks.get(channelId)!);

  const run = async () => {
    const ch = (await client.channels.fetch(channelId).catch(() => null)) as
      | TextChannel
      | null;
    if (!ch || !ch.isTextBased()) return;

    try {
      // 1) Borra en lotes (<14d) con ventana anti-rate-limit
      let more = true,
        rounds = 0;
      while (more && rounds < 3) {
        const msgs = await ch.bulkDelete(100, true);
        more = msgs.size === 100;
        rounds++;
      }
      // 2) Mensajes ≥14d
      let lastId: Snowflake | undefined;
      for (;;) {
        const msgs = await ch.messages.fetch({ limit: 100, before: lastId });
        if (msgs.size === 0) break;
        for (const m of msgs.values()) {
          await m.delete().catch(() => null);
          await wait(350); // 3 req/s aprox.
        }
        lastId = msgs.lastKey();
      }

      await pool.execute(
        'UPDATE channel_cleaner SET last_run = NOW() WHERE channel_id = ?',
        [channelId],
      );
      console.log(`[Cleaner] ${ch.name} limpiado`);
    } catch (err) {
      console.error(`[Cleaner] Error en ${channelId}`, err);
    }
  };

  const t = setInterval(run, intervalSeconds * 1000);
  tasks.set(channelId, t);
}

// Pequeña utilidad
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
