import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
import pool from '../database';  // ← ajusta la ruta si tu pool está en otro sitio

// ────────────────────────────────────────────────
// /cc-schedule canal:#general tiempo:1d
// ────────────────────────────────────────────────
export const data = new SlashCommandBuilder()
  .setName('cc-schedule')
  .setDescription('Programa el borrado periódico de todos los mensajes de un canal.')
  .addChannelOption((opt) =>
    opt
      .setName('canal')
      .setDescription('Canal que se limpiará')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption((opt) =>
    opt
      .setName('tiempo')
      .setDescription('Frecuencia (ej. 30m, 12h, 1d, 2w, 1M)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel('canal', true) as TextChannel;
  const rawInterval = interaction.options.getString('tiempo', true);

  const match = rawInterval.match(/^(\d+)([smhdwM])$/i);
  if (!match) {
    return interaction.reply({
      content:
        '❌ Formato incorrecto. Usa s, m, h, d, w, M. Ej: 30m, 12h, 1d, 2w, 1M',
      ephemeral: true,
    });
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToSeconds: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
    M: 60 * 60 * 24 * 30,
  };

  const seconds = value * unitToSeconds[unit];

  // Guarda (o actualiza) en DB
  await pool.execute(
    `INSERT INTO channel_cleaner (channel_id, interval_seconds, last_run)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE interval_seconds = VALUES(interval_seconds)`,
    [channel.id, seconds],
  );

  await interaction.reply({
    content: `🗑️ El canal <#${channel.id}> se limpiará cada **${rawInterval}**.`,
    ephemeral: true,
  });
}
