import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  User,
  roleMention,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

/**
 * Converts a locale to an emoji flag with more comprehensive handling
 */
function localeToFlag(locale?: string | null): { flag: string; name: string } {
  const localeMap: { [key: string]: { flag: string; name: string } } = {
    'en-US': { flag: '🇺🇸', name: 'Estados Unidos' },
    'en-GB': { flag: '🇬🇧', name: 'Reino Unido' },
    'es-ES': { flag: '🇪🇸', name: 'España' },
    'es-MX': { flag: '🇲🇽', name: 'México' },
    'fr-FR': { flag: '🇫🇷', name: 'Francia' },
    'pt-BR': { flag: '🇧🇷', name: 'Brasil' },
    'de-DE': { flag: '🇩🇪', name: 'Alemania' },
    'it-IT': { flag: '🇮🇹', name: 'Italia' },
    'ja-JP': { flag: '🇯🇵', name: 'Japón' },
    'ko-KR': { flag: '🇰🇷', name: 'Corea del Sur' },
    'ru-RU': { flag: '🇷🇺', name: 'Rusia' },
    'zh-CN': { flag: '🇨🇳', name: 'China' }
  };

  if (!locale) return { flag: '🌐', name: 'Desconocido' };
  return localeMap[locale] || { flag: '🌐', name: 'Desconocido' };
}

/**
 * Calculate account age and provide human-readable description
 */
function getAccountAge(createdTimestamp: number): string {
  const now = Date.now();
  const diffMs = now - createdTimestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} año${diffYears !== 1 ? 's' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
  }
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
  }
  return `${diffDays} día${diffDays !== 1 ? 's' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
}

function buildProfileEmbed(user: User, member: GuildMember | null, requester: User) {
  // Color based on highest role
  const color = member?.roles.highest?.color
    ? member.roles.highest.color
    : getEmbedColor('random');

  // Determine locale information
  const localeInfo = localeToFlag((user as any).locale ?? null);

  // Calculate account creation and server join details
  const accountAge = getAccountAge(user.createdTimestamp);
  const serverJoinAge = member?.joinedTimestamp 
    ? getAccountAge(member.joinedTimestamp) 
    : '—';

  // Roles formatting with more details
  const rolesField = member
    ? member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r.name} (${roleMention(r.id)})`)
        .join('\n') || 'Sin roles'
    : '—';

  // Construct rich embed
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`👤 Perfil de ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .setImage(member?.bannerURL({ size: 512 }) || null)
    .addFields(
      { 
        name: '🆔 Identificación', 
        value: `\`${user.id}\``, 
        inline: true 
      },
      { 
        name: '🌐 Región', 
        value: `${localeInfo.flag} ${localeInfo.name}`, 
        inline: true 
      },
      { 
        name: '📅 Cuenta creada', 
        value: `Hace ${accountAge}`, 
        inline: true 
      },
      { 
        name: '📥 Unión al servidor', 
        value: member?.joinedTimestamp ? `Hace ${serverJoinAge}` : '—', 
        inline: true 
      },
      { 
        name: '📜 Roles', 
        value: rolesField, 
        inline: false 
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: `Solicitado por ${requester.tag}`, 
      iconURL: requester.displayAvatarURL() 
    });

  return embed;
}

// Create action buttons for additional profile interactions
function createProfileActionButtons(user: User) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_avatar_${user.id}`)
        .setLabel('Ver Avatar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🖼️'),
      new ButtonBuilder()
        .setCustomId(`profile_banner_${user.id}`)
        .setLabel('Ver Banner')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌄'),
      new ButtonBuilder()
        .setLabel('Copiar ID')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📋')
        .setCustomId(`profile_copy_id_${user.id}`)
    );
}

export const data = new SlashCommandBuilder()
  .setName('perfil')
  .setDescription('Muestra información detallada del perfil de un usuario.')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres obtener el perfil')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('usuario') || interaction.user;
  const member = interaction.guild?.members.cache.get(target.id) ?? null;
  
  const embed = buildProfileEmbed(target, member, interaction.user);
  const actionButtons = createProfileActionButtons(target);

  await interaction.reply({ 
    embeds: [embed], 
    components: [actionButtons] 
  });
}

// Handle button interactions for profile actions
export async function handleProfileInteraction(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('profile_')) return;

  const [, action, userId] = interaction.customId.split('_');
  const user = await interaction.client.users.fetch(userId);

  switch (action) {
    case 'avatar':
      await interaction.reply({
        content: `🖼️ Avatar de ${user.username}:`,
        files: [user.displayAvatarURL({ size: 4096 })],
        ephemeral: true
      });
      break;
    
    case 'banner':
      const bannerURL = user.bannerURL({ size: 4096 });
      if (bannerURL) {
        await interaction.reply({
          content: `🌄 Banner de ${user.username}:`,
          files: [bannerURL],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Este usuario no tiene banner.',
          ephemeral: true
        });
      }
      break;
    
    case 'copy_id':
      await interaction.reply({
        content: `📋 ID de ${user.username}: \`${user.id}\``,
        ephemeral: true
      });
      break;
  }
}

export default { data, execute, handleProfileInteraction };