import 'dotenv/config';
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { requireRole } from '../utils/requireRole';

/**
 * Variables de entorno (definidas en .env.example):
 * STAFF_ROLE_IDS         Lista CSV de roles autorizados para usar /clearmsg
 * CLEARMSG_PER_MINUTE    Límite de ejecuciones por usuario/minuto (default 3)
 * LOG_CHANNEL_ID         ID del canal de logs de moderación (opcional)
 * EXCLUDED_CHANNEL_IDS   Lista CSV de IDs de canales donde /clearmsg está deshabilitado
 */
const STAFF_ROLE_IDS = (process.env.STAFF_ROLE_IDS ?? '').split(',').filter(Boolean);
const MAX_PER_MINUTE = Number(process.env.CLEARMSG_PER_MINUTE ?? 3);
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const EXCLUDED_CHANNEL_IDS = (process.env.EXCLUDED_CHANNEL_IDS ?? '').split(',').filter(Boolean);

// Rate-limit en memoria (se limpia cada minuto)
const RATE_LIMIT = new Map<string, { count: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [userId, { reset }] of RATE_LIMIT) {
    if (now >= reset) RATE_LIMIT.delete(userId);
  }
}, 60_000);

export const data = new SlashCommandBuilder()
  .setName('clearmsg')
  .setDescription('Elimina mensajes en lote de forma segura y registrada')
  .addIntegerOption(opt =>
    opt.setName('cantidad')
      .setDescription('Número de mensajes a borrar (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

type Interaction = ChatInputCommandInteraction & { inCachedGuild(): boolean };

export async function execute(interaction: Interaction) {
  const amount = interaction.options.getInteger('cantidad', true);

  // Solo en servidores
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: '🚫 Disponible solo en servidores.', ephemeral: true });
  }

  // Obtener el canal actual
  const channel = interaction.channel;
  if (!channel || !(channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
    return interaction.reply({ content: '❌ Solo funciona en canales de texto.', ephemeral: true });
  }

  // Canales excluidos
  if (EXCLUDED_CHANNEL_IDS.includes(channel.id)) {
    return interaction.reply({ content: '🚫 Este comando está deshabilitado en este canal.', ephemeral: true });
  }

  // Solo staff autorizado
  if (STAFF_ROLE_IDS.length) {
    const member = interaction.member;
    const hasRole = STAFF_ROLE_IDS.some(roleId => (member.roles as any).cache.has(roleId));
    if (!hasRole) {
      return interaction.reply({ content: '🚫 No tienes permiso para usar este comando.', ephemeral: true });
    }
  }

  // Rate-limit por usuario
  const now = Date.now();
  const entry = RATE_LIMIT.get(interaction.user.id);
  if (entry && now < entry.reset && entry.count >= MAX_PER_MINUTE) {
    const wait = Math.ceil((entry.reset - now) / 1000);
    return interaction.reply({ content: `⏳ Espera ${wait}s antes de volver a usar /clearmsg.`, ephemeral: true });
  }
  if (!entry || now >= entry.reset) {
    RATE_LIMIT.set(interaction.user.id, { count: 1, reset: now + 60_000 });
  } else {
    entry.count++;
  }

  // Comprueba permisos del bot
  const bot = await interaction.guild!.members.fetchMe();
  if (!bot.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: '⚠️ No tengo permiso para borrar mensajes aquí.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const deleted = await channel.bulkDelete(amount, true);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Mensajes eliminados')
      .setDescription(`🗑️ ${deleted.size} mensajes borrados en <#${channel.id}>`)
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Registro en canal de logs
    if (LOG_CHANNEL_ID) {
      const log = await interaction.guild!.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (log?.isTextBased()) {
        await log.send({ embeds: [embed.setColor('#ff0000')] });
      }
    }
  } catch (err: any) {
    console.error('Error clearmsg:', err);
    const msg = err.code === 50034
      ? '⚠️ No se pueden borrar mensajes con más de 14 días.'
      : '⚠️ Error al borrar mensajes.';
    await interaction.editReply({ content: msg });
  }
}

export default { data, execute };
