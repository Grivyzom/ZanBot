import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import pool from '../database';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('reporte')
  .setDescription('Envía un reporte de un jugador por comportamiento inapropiado')
  .addUserOption(opt =>
    opt.setName('usuario')
       .setDescription('Usuario a reportar')
       .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('razon')
       .setDescription('Razón del reporte')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const reported = interaction.options.getUser('usuario', true);
  const reason = interaction.options.getString('razon', true);
  const reporterId = interaction.user.id;

  // 2.1 Insertar en la BD
  const [result] = await pool.execute(
    'INSERT INTO reports (reporter_id, reported_id, reason, channel_id) VALUES (?, ?, ?, ?)',
    [reporterId, reported.id, reason, interaction.channel?.id ?? null]
  );
  const reportId = (result as any).insertId;

  // 2.2 Notificar al canal de moderación
  // Define en .env: MOD_CHANNEL_ID=<ID del canal de moderación>
  const modChannelId = process.env.MOD_CHANNEL_ID!;
  const modChannel = interaction.guild?.channels.cache.get(modChannelId) as TextChannel;
  if (modChannel && modChannel.isTextBased()) {
    const embed = {
      color: getEmbedColor(),
      title: `🚩 Reporte #${reportId}`,
      fields: [
        { name: 'Reportado', value: `<@${reported.id}>`, inline: true },
        { name: 'Reportado por', value: `<@${reporterId}>`, inline: true },
        { name: 'Razón', value: reason, inline: false },
        { name: 'Canal', value: `<#${interaction.channelId}>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
    await modChannel.send({ embeds: [embed] });
  }

  // 2.3 Confirmación al usuario
  await interaction.reply({
    content: `✅ Gracias por tu reporte. Nuestro equipo de moderación ha sido notificado con el ID \`${reportId}\`.`,
    ephemeral: true
  });
}