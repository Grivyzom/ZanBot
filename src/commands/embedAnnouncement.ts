// src/commands/embedAnnouncement.ts
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Role,
  InteractionReplyOptions
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { requireRole } from '../utils/requireRole';

const STAFF_ROLE_ID = '123456789012345678'; // <-- Pon aquí el ID real de tu rol

export const data = new SlashCommandBuilder()
  .setName('embed-announcement')
  .setDescription('Crea un embed de anuncio con formato prefijado')
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('Título del anuncio')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('description')
      .setDescription('Descripción del anuncio')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('Enlace externo (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('color')
      .setDescription('Color en formato #RRGGBB (opcional)')
      .setRequired(false)
  )
  .addRoleOption(option =>
    option
      .setName('mention_role')
      .setDescription('Rol a mencionar (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('footer_text')
      .setDescription('Texto del pie de página (opcional)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // 1) Verificamos rol
  if (!(await requireRole(STAFF_ROLE_ID)(interaction))) return;

  // 2) Obtenemos opciones
  const title       = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const url         = interaction.options.getString('url');
  const colorInput  = interaction.options.getString('color');
  const mentionRole = interaction.options.getRole('mention_role') as Role | null;
  const footerText  = interaction.options.getString('footer_text');

  // 3) Construimos el embed
  const embed = new EmbedBuilder()
    .setTitle(`[ANUNCIO] ${title}`)
    .setDescription(description)
    .setColor(getEmbedColor(colorInput))
    .setTimestamp();

  if (url) {
    embed.setURL(url);
  }

  if (footerText) {
    embed.setFooter({ text: footerText });
  }

  // 4) Preparamos la respuesta
  const replyOptions: InteractionReplyOptions = {
    embeds: [embed],
    ephemeral: false
  };
  if (mentionRole) {
    replyOptions.content = mentionRole.toString();
  }

  // 5) Enviamos
  await interaction.reply(replyOptions);
}
