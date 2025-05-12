// src/commands/serverInfo.ts
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  GuildPremiumTier,
  PermissionFlagsBits
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Muestra información detallada sobre el servidor')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  const { guild } = interaction;
  
  if (!guild) {
    return interaction.reply({
      content: '❌ Este comando solo puede ser usado en un servidor.',
      ephemeral: true
    });
  }

  // Asegurarse de que el guild esté completamente cargado
  await guild.fetch();
  
  // Fecha de creación formateada
  const createdAt = Math.floor(guild.createdTimestamp / 1000);
  
  // Niveles de verificación
  const verificationLevels = {
    0: 'Ninguno',
    1: 'Bajo',
    2: 'Medio',
    3: 'Alto',
    4: 'Muy Alto'
  };
  
  // Nivel de impulso (boost)
  const boostLevel = {
    [GuildPremiumTier.None]: 'Sin impulsos',
    [GuildPremiumTier.Tier1]: 'Nivel 1',
    [GuildPremiumTier.Tier2]: 'Nivel 2',
    [GuildPremiumTier.Tier3]: 'Nivel 3'
  };

  // Contar canales por tipo
  const channels = guild.channels.cache;
  const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText).size;
  const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice).size;
  const categoryChannels = channels.filter(channel => channel.type === ChannelType.GuildCategory).size;
  const forumChannels = channels.filter(channel => channel.type === ChannelType.GuildForum).size;
  const threadChannels = channels.filter(channel => 
    channel.type === ChannelType.PublicThread || 
    channel.type === ChannelType.PrivateThread || 
    channel.type === ChannelType.AnnouncementThread
  ).size;
  
  // Obtener estadísticas de miembros
  const totalMembers = guild.memberCount;
  let humans = 0;
  let bots = 0;
  let online = 0;
  let offline = 0;

  try {
    // Intentar obtener información más detallada de los miembros si es posible
    const members = await guild.members.fetch({ time: 10000 }).catch(() => null);
    if (members) {
      humans = members.filter(member => !member.user.bot).size;
      bots = members.filter(member => member.user.bot).size;
      online = members.filter(member => member.presence?.status !== 'offline').size;
      offline = members.filter(member => !member.presence || member.presence.status === 'offline').size;
    }
  } catch (error) {
    console.error('Error al obtener miembros detallados:', error);
    // Usamos valores aproximados si no podemos obtener la información detallada
    humans = Math.round(totalMembers * 0.9); // Asumimos que ~90% son humanos
    bots = totalMembers - humans;
  }

  // Permisos del bot
  const botMember = guild.members.me;
  const missingPermissions = [];
  
  const criticalPermissions = [
    { flag: PermissionFlagsBits.ViewChannel, name: 'Ver Canales' },
    { flag: PermissionFlagsBits.SendMessages, name: 'Enviar Mensajes' },
    { flag: PermissionFlagsBits.EmbedLinks, name: 'Insertar Enlaces' },
    { flag: PermissionFlagsBits.AttachFiles, name: 'Adjuntar Archivos' },
    { flag: PermissionFlagsBits.ReadMessageHistory, name: 'Leer Historial' },
    { flag: PermissionFlagsBits.AddReactions, name: 'Añadir Reacciones' },
    { flag: PermissionFlagsBits.UseExternalEmojis, name: 'Usar Emojis Externos' },
  ];
  
  if (botMember) {
    for (const perm of criticalPermissions) {
      if (!botMember.permissions.has(perm.flag)) {
        missingPermissions.push(perm.name);
      }
    }
  }

  // Emojis personalizados
  const regularEmojis = guild.emojis.cache.filter(emoji => !emoji.animated).size;
  const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;
  const totalEmojis = regularEmojis + animatedEmojis;
  const maxEmojis = getMaxEmojis(guild.premiumTier);

  // Stickers
  const stickers = guild.stickers.cache.size;
  const maxStickers = getMaxStickers(guild.premiumTier);

  // Roles (excluir @everyone)
  const roles = guild.roles.cache.size - 1;
  
  // Crear el embed
  const embed = new EmbedBuilder()
    .setColor(getEmbedColor())
    .setTitle(`📊 Información del Servidor: ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) || '')
    .addFields([
      {
        name: '📋 Información General',
        value: [
          `📝 **Nombre:** ${guild.name}`,
          `🆔 **ID:** ${guild.id}`,
          `👑 **Propietario:** <@${guild.ownerId}>`,
          `📅 **Creado:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
          `🔐 **Nivel de Verificación:** ${verificationLevels[guild.verificationLevel]}`,
          `💎 **Nivel de Impulso:** ${boostLevel[guild.premiumTier]} (${guild.premiumSubscriptionCount || 0} impulsos)`,
          `🌐 **Región de Voz Preferida:** ${guild.preferredLocale}`
        ].join('\n'),
        inline: false
      },
      {
        name: '👥 Miembros',
        value: [
          `👤 **Total:** ${totalMembers.toLocaleString()} miembros`,
          `🧑 **Humanos:** ${humans.toLocaleString()}`,
          `🤖 **Bots:** ${bots.toLocaleString()}`,
          online > 0 ? `🟢 **En línea:** ${online.toLocaleString()}` : '',
          offline > 0 ? `⚫ **Desconectados:** ${offline.toLocaleString()}` : ''
        ].filter(Boolean).join('\n'),
        inline: true
      },
      {
        name: '📊 Estadísticas',
        value: [
          `💬 **Canales de Texto:** ${textChannels}`,
          `🔊 **Canales de Voz:** ${voiceChannels}`,
          `📚 **Categorías:** ${categoryChannels}`,
          forumChannels > 0 ? `📝 **Foros:** ${forumChannels}` : '',
          threadChannels > 0 ? `🧵 **Hilos:** ${threadChannels}` : '',
          `👑 **Roles:** ${roles}`,
          `😀 **Emojis:** ${totalEmojis}/${maxEmojis}`,
          stickers > 0 ? `🏷️ **Stickers:** ${stickers}/${maxStickers}` : ''
        ].filter(Boolean).join('\n'),
        inline: true
      }
    ]);

  // Añadir banner o splash si existen
  if (guild.banner) {
    embed.setImage(guild.bannerURL({ size: 512 }) || '');
  } else if (guild.splash) {
    embed.setImage(guild.splashURL({ size: 512 }) || '');
  }

  // Añadir campo de características si hay algunas habilitadas
  if (guild.features.length > 0) {
    const featuresMap: { [key: string]: string } = {
      ANIMATED_BANNER: '🎬 Banner Animado',
      ANIMATED_ICON: '🎭 Ícono Animado',
      BANNER: '🏙️ Banner de Servidor',
      COMMERCE: '🛒 Canales de Comercio',
      COMMUNITY: '🏘️ Servidor Comunitario',
      DISCOVERABLE: '🔍 Servidor Descubrible',
      FEATURABLE: '✨ Destacable',
      INVITE_SPLASH: '💦 Splash de Invitación',
      MEMBER_VERIFICATION_GATE_ENABLED: '🚪 Verificación de Membresía',
      MONETIZATION_ENABLED: '💰 Monetización',
      MORE_STICKERS: '🏷️ Más Stickers',
      NEWS: '📰 Canales de Noticias',
      PARTNERED: '🤝 Servidor Asociado',
      PREVIEW_ENABLED: '👁️ Vista Previa',
      PRIVATE_THREADS: '🔒 Hilos Privados',
      ROLE_ICONS: '🎭 Íconos de Rol',
      TICKETED_EVENTS_ENABLED: '🎟️ Eventos con Entradas',
      VANITY_URL: '🔗 URL Personalizada',
      VERIFIED: '✅ Servidor Verificado',
      VIP_REGIONS: '🌟 Regiones VIP',
      WELCOME_SCREEN_ENABLED: '👋 Pantalla de Bienvenida',
      TEXT_IN_VOICE_ENABLED: '💬 Texto en Voz',
      THREE_DAY_THREAD_ARCHIVE: '3️⃣ Archivo de Hilos de 3 Días',
      SEVEN_DAY_THREAD_ARCHIVE: '7️⃣ Archivo de Hilos de 7 Días',
      APPLICATION_COMMAND_PERMISSIONS_V2: '🛠️ Permisos de Comandos',
      AUTO_MODERATION: '🛡️ Auto-Moderación'
    };

    const relevantFeatures = guild.features
      .map(feature => featuresMap[feature] || feature)
      .filter(Boolean)
      .sort();

    if (relevantFeatures.length > 0) {
      embed.addFields({
        name: '✨ Características',
        value: relevantFeatures.join(', '),
        inline: false
      });
    }
  }

  // Añadir información sobre permisos faltantes si es relevante
  if (missingPermissions.length > 0) {
    embed.addFields({
      name: '⚠️ Permisos faltantes',
      value: `El bot no tiene los siguientes permisos: ${missingPermissions.join(', ')}`,
      inline: false
    });
  }

  // Añadir descripción del servidor si existe
  if (guild.description) {
    embed.setDescription(guild.description);
  }

  // Añadir footer con información adicional
  embed.setFooter({
    text: `Solicitado por ${interaction.user.tag} | Servidor de Discord`,
    iconURL: interaction.user.displayAvatarURL()
  });

  return interaction.reply({ embeds: [embed] });
}

// Función para determinar el número máximo de emojis según el nivel de impulso
function getMaxEmojis(premiumTier: GuildPremiumTier): number {
  switch (premiumTier) {
    case GuildPremiumTier.None:
      return 50;
    case GuildPremiumTier.Tier1:
      return 100;
    case GuildPremiumTier.Tier2:
      return 150;
    case GuildPremiumTier.Tier3:
      return 250;
    default:
      return 50;
  }
}

// Función para determinar el número máximo de stickers según el nivel de impulso
function getMaxStickers(premiumTier: GuildPremiumTier): number {
  switch (premiumTier) {
    case GuildPremiumTier.None:
      return 5;
    case GuildPremiumTier.Tier1:
      return 15;
    case GuildPremiumTier.Tier2:
      return 30;
    case GuildPremiumTier.Tier3:
      return 60;
    default:
      return 5;
  }
}