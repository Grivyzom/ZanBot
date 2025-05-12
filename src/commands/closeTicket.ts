import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, GuildMember } from 'discord.js';
import pool from '../database';
////mport { requireRole } from '../utils/requireRole';
import { config } from 'dotenv';

config();

export const data = new SlashCommandBuilder()
  .setName('cerrar-ticket')
  .setDescription('Cierra un ticket')
  .addIntegerOption(opt =>
    opt.setName('id')
       .setDescription('ID del ticket')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getInteger('id', true);
  const member = interaction.member! as GuildMember;
  
  // Consulta modificada usando execute
  const [rows] = await pool.execute(
    'SELECT * FROM tickets WHERE ticket_id = ?', 
    [id]
  ) as any[];
  
  const ticket = rows[0];
  if (!ticket) {
    return interaction.reply({ content: `Ticket #${id} no existe.`, ephemeral: true });
  }
  if (ticket.status === 'CLOSED') {
    return interaction.reply({ content: `Ticket #${id} ya está cerrado.`, ephemeral: true });
  }
  
 // Solo quien tomó el ticket o Admin
  if (
    ticket.assigned_staff_id !== interaction.user.id &&
    !member.roles.cache.has(process.env.ADMIN_ROLE_ID!)
  ) {
     return interaction.reply({ content: 'No tienes permiso.', ephemeral: true });
   }


  await pool.execute(
    'UPDATE tickets SET status = "CLOSED" WHERE ticket_id = ?', 
    [id]
  );

  const channel = interaction.guild!.channels.cache.find(c => c.name === `ticket-${id}`);
  if (channel && channel.type === ChannelType.GuildText) {
    await channel.setName(`ticket-${id}-closed`);
    await channel.permissionOverwrites.create(ticket.user_id, { SendMessages: false });
    await channel.send(`✔️ Ticket #${id} cerrado por <@${interaction.user.id}>\nEstado: 🔴 CLOSED`);
  }

  await interaction.reply({ content: `Ticket #${id} ha sido cerrado.`, ephemeral: true });
}