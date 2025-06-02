// src/utils/originButtonHandler.ts - NUEVO ARCHIVO
import {
  ButtonInteraction,
  EmbedBuilder,
  GuildMember,
  TextChannel
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';

/**
 * Maneja las interacciones de los botones de procedencia para usuarios nuevos
 */
export async function handleOriginButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.customId.startsWith('origin_')) return;

  const [action, origin, userId] = interaction.customId.split('_');
  
  // Verificar que el usuario que presiona el botón es el correcto
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: '❌ Estos botones son solo para el usuario que acaba de ingresar.',
      ephemeral: true
    });
    return;
  }

  // Verificar que estamos en un servidor
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: '❌ Este comando solo funciona en servidores.',
      ephemeral: true
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const guild = interaction.guild;

  // IDs de roles desde variables de entorno
  const newRoleId = process.env.ROLE_NUEVO;
  const memberRoleId = process.env.ROLE_MIEMBRO;
  const networkRoleId = process.env.ROLE_NETWORK;

  // Verificar que los roles están configurados
  if (!newRoleId || !memberRoleId || !networkRoleId) {
    console.error('❌ Variables de entorno de roles no configuradas correctamente');
    await interaction.reply({
      content: '❌ Error de configuración del servidor. Contacta a un administrador.',
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    let rolesToAdd: string[] = [];
    let rolesToRemove: string[] = [];
    let confirmationMessage = '';
    let embedColor = getEmbedColor();

    // Determinar roles según la selección
    switch (origin) {
      case 'community':
        rolesToAdd = [memberRoleId];
        rolesToRemove = [newRoleId];
        confirmationMessage = '¡Perfecto! Has sido marcado como **miembro de la comunidad**. 👥';
        embedColor = getEmbedColor('#43a047'); // Verde
        break;

      case 'network':
        rolesToAdd = [networkRoleId];
        rolesToRemove = [newRoleId];
        confirmationMessage = '¡Excelente! Has sido marcado como **miembro de la network**. 🌐';
        embedColor = getEmbedColor('#1e88e5'); // Azul
        break;

      case 'both':
        rolesToAdd = [memberRoleId, networkRoleId];
        rolesToRemove = [newRoleId];
        confirmationMessage = '¡Increíble! Has sido marcado como **miembro de ambos**. 🤝';
        embedColor = getEmbedColor('#9c27b0'); // Púrpura
        break;

      default:
        await interaction.editReply({
          content: '❌ Opción no válida.'
        });
        return;
    }

    // Aplicar cambios de roles
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove, 'Procedencia seleccionada - remover rol nuevo');
    }

    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd, `Procedencia seleccionada: ${origin}`);
    }

    // Crear embed de confirmación
    const confirmationEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('✅ ¡Rol asignado correctamente!')
      .setDescription(
        `${confirmationMessage}\n\n` +
        `🎉 Ya puedes disfrutar de todos los beneficios del servidor.\n` +
        `¡Bienvenido/a oficialmente a **${guild.name}**!`
      )
      .addFields(
        {
          name: '🎯 Próximos pasos',
          value: 
            '• Explora los canales del servidor\n' +
            '• Configura tus tags con `/tags setup`\n' +
            '• Lee las reglas del servidor\n' +
            '• ¡Preséntate en el canal correspondiente!',
          inline: false
        }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({
        text: `${guild.name} • ¡Disfruta tu estadía!`,
        iconURL: guild.iconURL() ?? undefined
      });

    // Responder con confirmación
    await interaction.editReply({
      embeds: [confirmationEmbed]
    });

    // Remover los botones del mensaje original
    try {
      const originalMessage = interaction.message;
      if (originalMessage && originalMessage.editable) {
        const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
          .setDescription(
            originalMessage.embeds[0].description?.replace(
              'Por favor selecciona una opción para recibir tu rol correspondiente:',
              '✅ **¡Procedencia seleccionada!** Ya no es necesario seleccionar una opción.'
            ) ?? ''
          )
          .setColor(embedColor)
          .setFooter({
            text: `${guild.name} • Procedencia confirmada: ${getOriginLabel(origin)}`,
            iconURL: guild.iconURL() ?? undefined
          });

        await originalMessage.edit({
          embeds: [updatedEmbed],
          components: [] // Remover botones
        });
      }
    } catch (error) {
      console.error('Error actualizando mensaje original:', error);
    }

    // Log del evento
    console.log(`✅ Usuario ${member.user.tag} seleccionó procedencia: ${origin}`);
    
    // Opcional: Enviar notificación a canal de logs si está configurado
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const logChannel = guild.channels.cache.get(logChannelId) as TextChannel;
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('📝 Usuario configuró procedencia')
            .addFields(
              { name: 'Usuario', value: `${member} (${member.user.tag})`, inline: true },
              { name: 'Procedencia', value: getOriginLabel(origin), inline: true },
              { name: 'Roles otorgados', value: rolesToAdd.map(id => `<@&${id}>`).join(', '), inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (error) {
        console.error('Error enviando log de procedencia:', error);
      }
    }

  } catch (error) {
    console.error('Error manejando selección de procedencia:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Ocurrió un error al asignar los roles. Contacta a un administrador.'
      });
    } else {
      await interaction.reply({
        content: '❌ Ocurrió un error al asignar los roles. Contacta a un administrador.',
        ephemeral: true
      });
    }
  }
}

/**
 * Convierte el código de origen a una etiqueta legible
 */
function getOriginLabel(origin: string): string {
  switch (origin) {
    case 'community': return '👥 Comunidad';
    case 'network': return '🌐 Network';
    case 'both': return '🤝 Ambas';
    default: return '❓ Desconocido';
  }
}