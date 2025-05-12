// src/commands/closeTicket.ts
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  TextChannel
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('cerrar-ticket')
  .setDescription('Cierra el ticket actual y elimina el canal');

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;
  if (
    !(channel instanceof TextChannel) ||
    !channel.name.startsWith('ticket-')
  ) {
    return interaction.reply({
      content: '🚫 Este comando solo puede usarse en canales de ticket.',
      ephemeral: true
    });
  }

  await interaction.reply({
    content: '🔒 Cerrando ticket...',
    ephemeral: true
  });
  await channel.delete(`Ticket cerrado por ${interaction.user.tag}`);
}
