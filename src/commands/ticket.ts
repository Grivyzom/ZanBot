import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import pool from '../database';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Crea un nuevo ticket')
  .addStringOption(opt =>
    opt.setName('asunto')
       .setDescription('Asunto del ticket')
       .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subject = interaction.options.getString('asunto', true);
  const userId = interaction.user.id;
  
  // Inserta en DB
  const [result] = await pool.query(
    'INSERT INTO tickets (user_id, subject) VALUES (?, ?)',
    [userId, subject]
  );
  const ticketId = (result as any).insertId;

  // Busca categoría 'Tickets'
  const cat = interaction.guild!.channels.cache
    .find(c => c.name.toLowerCase() === 'tickets' && c.type === ChannelType.GuildCategory);

  // Crea canal privado
  const channel = await interaction.guild!.channels.create({
    name: `ticket-${ticketId}`,
    type: ChannelType.GuildText,
    parent: cat?.id,
    permissionOverwrites: [
      { id: interaction.guild!.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: interaction.client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: process.env.STAFF_ROLE_ID!, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  const embed = {
    color: getEmbedColor(),
    title: `🎫 Ticket #${ticketId}`,
    fields: [
      { name: 'Usuario', value: `<@${userId}>`, inline: true },
      { name: 'Asunto', value: subject, inline: true },
      { name: 'Estado', value: '🟢 OPEN', inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: `Tu ticket #${ticketId} ha sido creado: ${channel}`, ephemeral: true });
}