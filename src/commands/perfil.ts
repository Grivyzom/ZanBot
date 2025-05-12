import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction  // 👈  NUEVO
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

/**
 * Builds a comprehensive avatar embed with additional features
 */
function buildAvatarEmbed(user: User, member: GuildMember | null, requester: User) {
  // Determine the most vibrant color from user's highest role
  const color = member?.roles.highest?.color || getEmbedColor('random');

  // Create embed with detailed avatar information
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🖼️ Avatar de ${user.username}`)
    .setDescription(`**Formatos disponibles:**\n• PNG\n• JPEG\n• WebP`)
    .addFields(
      { 
        name: '📏 Resoluciones', 
        value: '`16px` • `32px` • `64px` • `128px` • `256px` • `512px` • `1024px` • `4096px`', 
        inline: false 
      }
    )
    .setImage(user.displayAvatarURL({ size: 4096, extension: 'png' }))
    .setTimestamp()
    .setFooter({ 
      text: `Solicitado por ${requester.tag}`, 
      iconURL: requester.displayAvatarURL() 
    });

  return embed;
}

/**
 * Creates download buttons for different avatar formats and sizes
 */
function createAvatarDownloadButtons(user: User) {
  const formats = ['png', 'jpg', 'webp'] as const;
  const sizes = [128, 256, 512, 1024, 4096] as const;

  const buttons = formats.map(format => 
    new ButtonBuilder()
      .setLabel(`Descargar ${format.toUpperCase()}`)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`avatar_${format}_512`)
      .setEmoji('📥')
  );

  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Muestra y descarga el avatar de un usuario.')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres obtener el avatar')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Get target user (self if no user specified)
  const target = interaction.options.getUser('usuario') || interaction.user;
  
  // Fetch guild member if in a guild
  const member = interaction.guild?.members.cache.get(target.id) ?? null;

  // Build embed and download buttons
  const embed = buildAvatarEmbed(target, member, interaction.user);
  const downloadButtons = createAvatarDownloadButtons(target);

  // Reply with embed and buttons
  await interaction.reply({ 
    embeds: [embed], 
    components: [downloadButtons] 
  });
}

// Handle button interactions for avatar downloads
export async function handleAvatarDownload(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('avatar_')) return;

  const [, format, size] = interaction.customId.split('_');
  const avatarURL = interaction.user.displayAvatarURL({ 
    size: parseInt(size as string), 
    extension: format as 'png' | 'jpg' | 'webp' 
  });

  await interaction.reply({
    content: `🖼️ Avatar de ${interaction.user.username}:`,
    files: [avatarURL],
    ephemeral: true
  });
}

export default { data, execute, handleAvatarDownload };