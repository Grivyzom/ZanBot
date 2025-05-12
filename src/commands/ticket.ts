// src/commands/ticket.ts
import 'dotenv/config';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';

const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID!;

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Abre un ticket de soporte privado')
  .addStringOption(option =>
    option
      .setName('asunto')
      .setDescription('Asunto del ticket')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild() || !interaction.guild) {
    return interaction.reply({ content: '🚫 Este comando solo funciona dentro de un servidor.', ephemeral: true });
  }

  const asunto = interaction.options.getString('asunto', true);
  const { guild, user } = interaction;

  // Define permisos: nadie excepto el autor y el rol de soporte podrá ver el canal
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: SUPPORT_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  // Crea el canal de ticket
  const channel = await guild.channels.create({
    name: `ticket-${user.username}`.toLowerCase().slice(0, 32),
    type: ChannelType.GuildText,
    topic: `Ticket de ${user.tag}: ${asunto}`,
    permissionOverwrites
  });

  // Mensaje inicial en el canal
  await channel.send({
    content: `📨 ${user}, tu ticket ha sido creado. Un miembro del equipo de soporte te atenderá pronto.`
  });

  // Respuesta al usuario
  await interaction.reply({
    content: `🎫 Ticket creado: ${channel}`,
    ephemeral: true
  });
}
