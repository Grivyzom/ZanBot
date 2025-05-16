import { Client, TextChannel } from 'discord.js';
import  pool  from '../database';

type Task = { channel_id: string; interval_seconds: number };

export async function initCleanerScheduler(client: Client) {
  const [rows] = (await pool.query(
    'SELECT channel_id, interval_seconds FROM channel_cleaner',
  )) as [Task[], unknown];

  rows.forEach(({ channel_id, interval_seconds }) =>
    scheduleTask(client, channel_id, interval_seconds),
  );
}

function scheduleTask(client: Client, channelId: string, interval: number) {
  const intervalMs = interval * 1000;

  setInterval(async () => {
    const channel = (await client.channels.fetch(channelId).catch(() => null)) as
      | TextChannel
      | null;
    if (!channel || !channel.isTextBased()) return;

    try {
      // bulkDelete solo admite mensajes <14 d; los más antiguos se borran 1×1
      let fetched;
      do {
        fetched = await channel.bulkDelete(100, true);
      } while (fetched.size === 100);

      await pool.execute(
        'UPDATE channel_cleaner SET last_run = NOW() WHERE channel_id = ?',
        [channelId],
      );
      console.log(`[Cleaner] Limpieza realizada en #${channel.name}`);
    } catch (err) {
      console.error(`[Cleaner] Error limpiando #${channelId}`, err);
    }
  }, intervalMs);
}
