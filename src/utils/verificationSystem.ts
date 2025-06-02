// src/utils/verificationSystem.ts - SISTEMA DE VERIFICACIÓN AUTOMÁTICA
import {
  Guild,
  GuildMember,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';

/**
 * Verifica y corrige los roles de usuarios que puedan estar mal configurados
 */
export async function verifyUserRoles(guild: Guild): Promise<{
  verified: number;
  corrected: number;
  errors: number;
}> {
  const newRoleId = process.env.ROLE_NUEVO!;
  const memberRoleId = process.env.ROLE_MIEMBRO!;
  const networkRoleId = process.env.ROLE_NETWORK!;

  if (!newRoleId || !memberRoleId || !networkRoleId) {
    throw new Error('Variables de entorno de roles no configuradas');
  }

  let verified = 0;
  let corrected = 0;
  let errors = 0;

  try {
    const members = await guild.members.fetch();
    
    for (const [, member] of members) {
      if (member.user.bot) continue;

      try {
        const hasNewRole = member.roles.cache.has(newRoleId);
        const hasMemberRole = member.roles.cache.has(memberRoleId);
        const hasNetworkRole = member.roles.cache.has(networkRoleId);

        // Caso 1: Usuario sin ningún rol de procedencia
        if (!hasNewRole && !hasMemberRole && !hasNetworkRole) {
          await member.roles.add(newRoleId, 'Verificación automática - sin rol de procedencia');
          corrected++;
          console.log(`✅ Corregido: ${member.user.tag} - añadido rol Nuevo`);
        }
        // Caso 2: Usuario con rol "Nuevo" y otros roles (conflicto)
        else if (hasNewRole && (hasMemberRole || hasNetworkRole)) {
          await member.roles.remove(newRoleId, 'Verificación automática - conflicto de roles');
          corrected++;
          console.log(`✅ Corregido: ${member.user.tag} - removido rol Nuevo (tenía otros roles)`);
        }
        // Caso 3: Usuario correctamente configurado
        else {
          verified++;
        }

      } catch (error) {
        console.error(`❌ Error verificando ${member.user.tag}:`, error);
        errors++;
      }
    }

    console.log(`🔍 Verificación completada: ${verified} verificados, ${corrected} corregidos, ${errors} errores`);
    return { verified, corrected, errors };

  } catch (error) {
    console.error('❌ Error en verificación masiva:', error);
    throw error;
  }
}

/**
 * Envía un recordatorio a usuarios con rol "Nuevo" que llevan mucho tiempo sin seleccionar procedencia
 */
export async function sendPendingReminders(guild: Guild): Promise<number> {
  const newRoleId = process.env.ROLE_NUEVO!;
  const welcomeChannelId = process.env.WELCOME_CHANNEL_ID!;

  if (!newRoleId || !welcomeChannelId) {
    throw new Error('Variables de entorno no configuradas para recordatorios');
  }

  const newRole = guild.roles.cache.get(newRoleId);
  if (!newRole) {
    throw new Error('Rol "Nuevo" no encontrado');
  }

  const welcomeChannel = guild.channels.cache.get(welcomeChannelId) as TextChannel;
  if (!welcomeChannel?.isTextBased()) {
    throw new Error('Canal de bienvenida no encontrado o no es de texto');
  }

  let remindersSent = 0;
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 horas atrás

  for (const [, member] of newRole.members) {
    // Verificar si el usuario se unió hace más de 24 horas
    if (member.joinedTimestamp && member.joinedTimestamp < oneDayAgo) {
      try {
        await sendIndividualReminder(member, welcomeChannel);
        remindersSent++;
        
        // Pequeña pausa para evitar spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error enviando recordatorio a ${member.user.tag}:`, error);
      }
    }
  }

  return remindersSent;
}

/**
 * Envía un recordatorio individual a un usuario
 */
async function sendIndividualReminder(member: GuildMember, channel: TextChannel): Promise<void> {
  const reminderButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`origin_community_${member.id}`)
        .setLabel('Comunidad')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👥'),
      new ButtonBuilder()
        .setCustomId(`origin_network_${member.id}`)
        .setLabel('Network')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🌐'),
      new ButtonBuilder()
        .setCustomId(`origin_both_${member.id}`)
        .setLabel('Ambas')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🤝')
    );

  const reminderEmbed = new EmbedBuilder()
    .setColor(getEmbedColor('#ff9800'))
    .setTitle('⏰ Recordatorio: Configura tu procedencia')
    .setDescription(
      `¡Hola ${member}! 👋\n\n` +
      `Notamos que aún no has seleccionado cómo nos conociste. ` +
      `Para tener acceso completo al servidor, necesitas seleccionar tu procedencia:`
    )
    .addFields(
      {
        name: '👥 Comunidad',
        value: 'Si vienes por nuestra comunidad de Discord',
        inline: true
      },
      {
        name: '🌐 Network',
        value: 'Si vienes por nuestros servidores',
        inline: true
      },
      {
        name: '🤝 Ambas',
        value: 'Si nos conoces por ambas partes',
        inline: true
      }
    )
    .setFooter({
      text: `${member.guild.name} • Selecciona una opción arriba`,
      iconURL: member.guild.iconURL() ?? undefined
    })
    .setTimestamp();

  // Enviar recordatorio en el canal público
  await channel.send({
    content: `${member} - ¡No olvides seleccionar tu procedencia! 📝`,
    embeds: [reminderEmbed],
    components: [reminderButtons]
  });

  // También enviar DM si es posible
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(getEmbedColor('#ff9800'))
      .setTitle('⏰ Recordatorio importante')
      .setDescription(
        `¡Hola! Te escribimos desde **${member.guild.name}**.\n\n` +
        `Notamos que aún no has configurado tu procedencia en el servidor. ` +
        `Para tener acceso completo y recibir tu rol correspondiente, ` +
        `ve al canal de bienvenida y selecciona cómo nos conociste.\n\n` +
        `¡Es muy fácil y solo toma unos segundos! ⚡`
      )
      .addFields({
        name: '📍 ¿Dónde seleccionar?',
        value: `Ve a <#${channel.id}> y usa los botones del mensaje de recordatorio.`
      })
      .setFooter({
        text: `${member.guild.name} • ¡Te esperamos!`,
        iconURL: member.guild.iconURL() ?? undefined
      });

    await member.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.warn(`⚠️ No se pudo enviar DM de recordatorio a ${member.user.tag}`);
  }

  console.log(`📨 Recordatorio enviado a ${member.user.tag}`);
}

/**
 * Programa recordatorios automáticos cada 24 horas
 */
export function scheduleAutomaticReminders(guild: Guild): void {
  const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

  setInterval(async () => {
    try {
      const remindersSent = await sendPendingReminders(guild);
      if (remindersSent > 0) {
        console.log(`📨 Recordatorios automáticos enviados: ${remindersSent}`);
      }
    } catch (error) {
      console.error('❌ Error en recordatorios automáticos:', error);
    }
  }, REMINDER_INTERVAL);

  console.log('🔄 Recordatorios automáticos programados cada 24 horas');
}

/**
 * Comando para ejecutar verificación manual (para usar en comandos de admin)
 */
export async function runManualVerification(guild: Guild): Promise<string> {
  try {
    const results = await verifyUserRoles(guild);
    const remindersSent = await sendPendingReminders(guild);

    return `✅ **Verificación completada:**\n` +
           `• Usuarios verificados: ${results.verified}\n` +
           `• Usuarios corregidos: ${results.corrected}\n` +
           `• Errores encontrados: ${results.errors}\n` +
           `• Recordatorios enviados: ${remindersSent}`;
  } catch (error) {
    console.error('❌ Error en verificación manual:', error);
    return `❌ Error durante la verificación: ${error}`;
  }
}