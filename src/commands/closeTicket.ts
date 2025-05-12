import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import pool from '../database';

// Definición del comando /cerrar-ticket solo para roles específicos
export const data = new SlashCommandBuilder()
  .setName('cerrar-ticket')
  .setDescription('Cierra el canal de ticket actual y archiva el ticket en la base de datos.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false);

/**
 * Ejecuta el cierre del ticket: actualiza el estado en la base de datos y elimina el canal.
 * @param interaction Comando de entrada del usuario
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Validar contexto de servidor y canal de texto
  if (!interaction.guild || !(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: 'Este comando solo funciona dentro de un servidor en un canal de texto.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const member = interaction.member as GuildMember;
  const channel = interaction.channel as TextChannel;
  const { name } = channel;

  // Extraer ID de ticket del nombre del canal
  const match = name.match(/^ticket-(\d+)$/);
  if (!match) {
    await interaction.editReply({ content: 'No se ha reconocido este canal como un ticket válido.' });
    return;
  }
  const ticketId = Number(match[1]);

  // Consultar el ticket en la base de datos
  let ticketRecord;
  try {
    const [rows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [ticketId]);
    ticketRecord = (rows as any[])[0];
  } catch (err: any) {
    console.error('Error al consultar el ticket:', err);
    await interaction.editReply({ content: 'Error interno al cerrar el ticket.' });
    return;
  }

  if (!ticketRecord) {
    await interaction.editReply({ content: `No existe el ticket #${ticketId} en la base de datos.` });
    return;
  }

  // Validar permisos: asignado o Admin
  const isAdmin = member.roles.cache.has(process.env.ADMIN_ROLE_ID!);
  if (ticketRecord.assigned_staff_id !== interaction.user.id && !isAdmin) {
    await interaction.editReply({ content: 'No tienes permisos para cerrar este ticket.' });
    return;
  }

  // Actualizar estado a CLOSED en la base de datos
  try {
    await pool.execute(
      'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?',
      ['CLOSED', ticketId]
    );
  } catch (err: any) {
    console.error('Error al actualizar el estado del ticket:', err);
    await interaction.editReply({ content: 'Error al actualizar el ticket en la base de datos.' });
    return;
  }

  // Confirmación al usuario
  await interaction.editReply({ content: `Ticket #${ticketId} cerrado correctamente. Eliminando canal...` });

  // Eliminar canal de Discord
  if (channel.deletable) {
    try {
      await channel.delete('Ticket cerrado y canal eliminado');
    } catch (err: any) {
      console.error('Error al eliminar el canal de ticket:', err);
    }
  }
}
