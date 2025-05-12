import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, GuildMember } from 'discord.js';
import pool from '../database';

export const data = new SlashCommandBuilder()
  .setName('tomar-ticket')
  .setDescription('Toma un ticket abierto')
  .addIntegerOption(opt =>
    opt.setName('id')
       .setDescription('ID del ticket')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // convertir a GuildMember para asegurar que `.roles.cache` existe
  const member = interaction.member! as GuildMember;
  // Permiso Staff
  if (!member.roles.cache.has(process.env.STAFF_ROLE_ID!)) {
     return interaction.reply({ content: 'No tienes permiso.', ephemeral: true });
   }

  const id = interaction.options.getInteger('id', true);
  
  // Consulta modificada usando execute en lugar de query
  const [rows] = await pool.execute(
    'SELECT * FROM tickets WHERE ticket_id = ? AND status = "OPEN"', 
    [id]
  ) as any[];
  
  if (!rows.length) {
    return interaction.reply({ content: `Ticket #${id} no disponible.`, ephemeral: true });
  }

  await pool.execute(
    'UPDATE tickets SET status = "ASSIGNED", assigned_staff_id = ? WHERE ticket_id = ?',
    [interaction.user.id, id]
  );

  const channel = interaction.guild!.channels.cache.find(c => c.name === `ticket-${id}`);
  if (channel && channel.type === ChannelType.GuildText) {
    await channel.send(`👤 Ticket #${id} asignado a <@${interaction.user.id}>\nEstado: 🟡 ASSIGNED`);
  }
  await interaction.reply({ content: `Has tomado el ticket #${id}.`, ephemeral: true });
}