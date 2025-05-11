import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('embed-text')
  .setDescription('Crea un embed de texto personalizado')
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('Título del embed')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('description')
      .setDescription('Descripción del embed')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('field_title')
      .setDescription('Título del campo (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('field_value')
      .setDescription('Valor del campo (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('color')
      .setDescription('Color en formato #RRGGBB o "random" (opcional)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const fieldTitle = interaction.options.getString('field_title');
  const fieldValue = interaction.options.getString('field_value');
  const colorInput = interaction.options.getString('color');

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(getEmbedColor(colorInput))
    .setTimestamp();

  // Sólo añade el campo si vienen ambos valores
  if (fieldTitle && fieldValue) {
    embed.addFields({ name: fieldTitle, value: fieldValue });
  }

  await interaction.reply({ embeds: [embed] });
}
