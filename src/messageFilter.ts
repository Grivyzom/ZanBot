// src/messageFilter.ts
import {
  Client,
  Message,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ChannelType
} from 'discord.js';

// ID del canal de logs (definido en .env)
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID as string;

// Regex para IPs y dominios
const ipRegex = /(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d?\d)){3})(?::\d{1,5})?/g;
const domainRegex = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?/g;

// Configuración de spam
const MESSAGES_THRESHOLD = 5;
const TIME_WINDOW_MS = 60 * 1000; // 1 minuto
const userWarningCounts = new Map<string, { count: number; timestamps: number[] }>();

export function registerMessageFilter(client: Client) {
  // Manejar interacciones de botones
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.guild) return;
    const [action, userId] = interaction.customId.split('_');
    if (action !== 'ipban') return;

    if (interaction.customId.startsWith('ipban_unban')) {
      await interaction.guild.members.unban(userId).catch(console.error);
      await interaction.update({ content: `✅ Usuario <@${userId}> desbaneado.`, embeds: [], components: [] }).catch(console.error);
    } else if (interaction.customId.startsWith('ipban_confirm')) {
      await interaction.update({ content: `🔒 Baneo permanente confirmado para <@${userId}>.`, embeds: [], components: [] }).catch(console.error);
    }
  });

  // Filtro de mensajes
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content;
    const foundIPs = content.match(ipRegex) || [];
    const foundDomains = content.match(domainRegex) || [];
    const ips = foundIPs;
    const domains = foundDomains.filter(d => !ipRegex.test(d));

    if (ips.length > 0 || domains.length > 0) {
      await message.delete().catch(console.error);
      const key = message.author.id;
      const now = Date.now();
      const data = userWarningCounts.get(key) || { count: 0, timestamps: [] };
      data.timestamps = data.timestamps.filter(t => now - t < TIME_WINDOW_MS);
      data.timestamps.push(now);
      data.count = data.timestamps.length;
      userWarningCounts.set(key, data);

      // IP detectada: baneo inmediato + log
      if (ips.length > 0) {
        await message.guild.members.ban(message.author.id, { reason: 'Envío de IP prohibida' }).catch(console.error);
        await sendLogMessage(client, message.guild.id, message.author.id);
        return;
      }

      // Spam por dominios
      if (data.count >= MESSAGES_THRESHOLD) {
        await message.guild.members.ban(message.author.id, { reason: 'Spam de publicidad/IP' }).catch(console.error);
      } else {
        const channel = message.channel;
        if (channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel) {
          channel.send(`⚠️ <@${message.author.id}>, no se permite publicidad o enlaces externos.`)
            .then((msg: Message) => setTimeout(() => msg.delete().catch(console.error), 5000))
            .catch(console.error);
        }
      }
    }
  });
}

// Enviar log con fetch y manejo de canales privados
async function sendLogMessage(client: Client, guildId: string, userId: string) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const fetched = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (!fetched) return;
    // Aceptar varios tipos de canal de texto
    if (
      (fetched.type === ChannelType.GuildText || fetched.type === ChannelType.GuildNews || fetched.type === ChannelType.GuildPublicThread || fetched.type === ChannelType.GuildPrivateThread) &&
      'send' in fetched
    ) {
      const channel = fetched as TextChannel;
      const embed = new EmbedBuilder()
        .setTitle('🚨 Usuario baneado por IP')
        .setDescription(`El usuario <@${userId}> ha sido baneado por enviar una IP prohibida.`)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`ipban_unban_${userId}`)
            .setLabel('Desbanear')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`ipban_confirm_${userId}`)
            .setLabel('Confirmar baneo permanente')
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({ embeds: [embed], components: [row] });
    }
  } catch (err) {
    console.error('Error enviando mensaje de log:', err);
  }
}
