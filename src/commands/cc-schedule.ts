import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  GuildMember,
} from 'discord.js';
import pool from '../database';
import { addOrUpdateTask } from '../utils/cleanerScheduler';

const MIN_INTERVAL = 10 * 60; // 10 min en segundos

export const data = new SlashCommandBuilder()
  .setName('cc-schedule')
  .setDescription('Programa o actualiza la limpieza periódica de un canal.')
  .addChannelOption((opt) =>
    opt
      .setName('canal')
      .setDescription('Canal a limpiar')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText),
  )
  .addStringOption((opt) =>
    opt
      .setName('tiempo')
      .setDescription('Frecuencia (30m, 6h, 1d, …)')
      .setRequired(true),
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages | PermissionFlagsBits.ManageChannels,
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  if (
    !member.permissions.has([
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageChannels,
    ])
  )
    return interaction.reply({
      content: '❌ No tienes permisos suficientes.',
      ephemeral: true,
    });

  const channel = interaction.options.getChannel('canal', true) as TextChannel;
  const raw = interaction.options.getString('tiempo', true);
  const match = raw.match(/^(\d+)([smhdwM])$/i);
  if (!match)
    return interaction.reply({
      content: 'Formato inválido. Ej: 30m, 6h, 1d.',
      ephemeral: true,
    });

  const [_, value, unit] = match;
  const v = Number(value);
  const factor: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    M: 2592000,
  };
  const seconds = v * factor[unit];
  if (seconds < MIN_INTERVAL)
    return interaction.reply({
      content: `El intervalo mínimo es de 10 min.`,
      ephemeral: true,
    });

  await pool.execute(
    `INSERT INTO channel_cleaner (channel_id, interval_seconds, last_run)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE interval_seconds = VALUES(interval_seconds)`,
    [channel.id, seconds],
  );

  await addOrUpdateTask(interaction.client, channel.id, seconds);

  interaction.reply({
    content: `🗑️ El canal <#${channel.id}> se limpiará cada **${raw}**.`,
    ephemeral: true,
  });
}
