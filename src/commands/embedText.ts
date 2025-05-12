// src/commands/embedText.ts
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { requireRole } from '../utils/requireRole';

const STAFF_ROLE_ID = '123456789012345678'; // <-- ID real de tu rol

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
  // 1) Verificación de rol
  if (!(await requireRole(STAFF_ROLE_ID)(interaction))) return;

  // 2) Obtener opciones
  const title       = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const fieldTitle  = interaction.options.getString('field_title');
  const fieldValue  = interaction.options.getString('field_value');
  const colorInput  = interaction.options.getString('color');

  // 3) Construir el embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(getEmbedColor(colorInput))
    .setTimestamp();

  if (fieldTitle && fieldValue) {
    embed.addFields({ name: fieldTitle, value: fieldValue });
  }

  // 4) Enviar respuesta
  await interaction.reply({ embeds: [embed] });
}
