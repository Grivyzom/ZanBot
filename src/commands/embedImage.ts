import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('embed-image')
  .setDescription('Crea un embed con una imagen')
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
      .setName('image_url')
      .setDescription('URL de la imagen')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const fieldTitle = interaction.options.getString('field_title');
  const fieldValue = interaction.options.getString('field_value');
  const imageUrl = interaction.options.getString('image_url', true);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setImage(imageUrl)
    .setColor('#0099ff')
    .setTimestamp();

  if (fieldTitle && fieldValue) {
    embed.addFields({ name: fieldTitle, value: fieldValue });
  }

  await interaction.reply({ embeds: [embed] });
}
