import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import pool from '../database';

// Definición del comando /tomar-ticket solo para roles específicos
export const data = new SlashCommandBuilder()
  .setName('tomar-ticket')
  .setDescription('Toma un ticket abierto y asigna el canal al staff correspondiente.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false);

/**
 * Ejecuta la toma de un ticket: actualiza estado en BD y notifica en el canal.
 * @param interaction Comando de entrada del usuario
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Validar contexto de servidor y canal de texto
  if (!interaction.guild || interaction.channel?.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Este comando solo funciona dentro de un servidor en un canal de texto de ticket.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const member = interaction.member as GuildMember;
  const channel = interaction.channel as TextChannel;
  const { name } = channel;

  // Extraer ID de ticket del nombre del canal
  const match = name.match(/^ticket-(\d+)$/);
  if (!match) {
    await interaction.editReply({ content: 'No se reconoció este canal como un ticket válido.' });
    return;
  }
  const ticketId = Number(match[1]);

  // Actualizar estado y staff asignado en la base de datos
  try {
    await pool.execute(
      'UPDATE tickets SET status = ?, assigned_staff_id = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?',
      ['ASSIGNED', interaction.user.id, ticketId]
    );
  } catch (err: any) {
    console.error('Error al asignar el ticket:', err);
    await interaction.editReply({ content: 'Error al asignar el ticket en la base de datos.' });
    return;
  }

  // Notificar al canal de ticket
  await interaction.editReply({ content: `Ticket #${ticketId} asignado a <@${interaction.user.id}>.` });
  try {
    await channel.send(`Hola <@${interaction.user.id}>, has tomado el ticket #${ticketId}. Procede a atender al usuario.`);
  } catch (err: any) {
    console.error('Error al enviar mensaje en el canal de ticket:', err);
  }
}
