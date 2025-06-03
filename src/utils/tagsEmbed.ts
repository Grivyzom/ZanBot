// src/utils/tagsEmbed.ts - VERSIÓN ACTUALIZADA CON BOTONES DIRECTOS

import {
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';
import { TAG_CATEGORIES } from '../config/tagsConfig';
import { handleTagsSetupButton } from '../commands/tags';
import { getUserTags } from '../database';

export async function publishTagsEmbed(channel: TextChannel): Promise<void> {
  try {
    // Verificar si ya existe un embed de tags
    const messages = await channel.messages.fetch({ limit: 50 });
    const existingEmbed = messages.find(msg => 
      msg.author.id === channel.client.user!.id && 
      msg.embeds[0]?.title?.includes('🏷️ Tags Personales')
    );

    if (existingEmbed) {
      console.log('✅ El embed de tags ya existe en el canal');
      return;
    }

    // Embed principal mejorado
    const mainEmbed = new EmbedBuilder()
      .setTitle('🏷️ Tags Personales - ¡Conecta con la Comunidad!')
      .setDescription(
        '**¿Por qué usar tags?** 🌟\n\n' +
        '🎯 **Encuentra tu tribu** - Conecta con personas que comparten tus intereses\n' +
        '🏆 **Roles automáticos** - Obtén roles especiales basados en tus gustos\n' +
        '📊 **Eventos personalizados** - Participa en actividades de tu categoría\n' +
        '🌍 **Comunidad global** - Descubre miembros de tu país o región\n' +
        '💻 **Networking** - Conecta con desarrolladores de tu stack tecnológico\n\n' +
        '**Categorías disponibles:**\n' +
        TAG_CATEGORIES.map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`).join('\n') +
        '\n\n🚀 **¡Empieza ahora!** Solo te tomará 30 segundos configurar tu perfil perfecto.'
      )
      .setColor(getEmbedColor())
      .setThumbnail(channel.guild.iconURL() || null)
      .setImage('https://grivyzom.com/banner-discord-grv.gif') // Banner opcional
      .setFooter({ 
        text: '✨ Haz tu experiencia única • Configura tus tags ahora', 
        iconURL: channel.client.user?.displayAvatarURL() 
      })
      .setTimestamp();

    // Botones mejorados con emojis y estilos
    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tags-setup-direct')
          .setLabel('Configurar Mis Tags')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🚀'),
        new ButtonBuilder()
          .setCustomId('tags-view-direct')
          .setLabel('Ver Mis Tags')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👁️'),
        new ButtonBuilder()
          .setCustomId('tags-help-detailed')
          .setLabel('Guía Completa')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📚')
      );

    // Enviar el embed con los botones
    await channel.send({ 
      embeds: [mainEmbed], 
      components: [buttonsRow] 
    });
    
    console.log('✅ Embed de tags mejorado publicado correctamente');

  } catch (error) {
    console.error('❌ Error al publicar embed de tags:', error);
  }
}

// Manejo mejorado de botones con ejecución directa
export async function handleTagsButtonInteraction(interaction: ButtonInteraction) {
  if (!interaction.isButton()) return;

  try {
    switch (interaction.customId) {
      case 'tags-setup-direct':
        // 🚀 EJECUTAR DIRECTAMENTE el setup en lugar de solo dar instrucciones
        await handleTagsSetupButton(interaction);
        break;

      case 'tags-view-direct':
        // 👁️ MOSTRAR DIRECTAMENTE los tags del usuario
        await handleTagsViewDirect(interaction);
        break;

      case 'tags-help-detailed':
        // 📚 MOSTRAR GUÍA COMPLETA Y DETALLADA
        await handleTagsHelpDetailed(interaction);
        break;

      // Mantener compatibilidad con botones antiguos
      case 'tags-setup-button':
        await handleTagsSetupButton(interaction);
        break;

      case 'tags-view-button':
        await handleTagsViewDirect(interaction);
        break;

      case 'tags-help-button':
        await handleTagsHelpDetailed(interaction);
        break;
    }
  } catch (error) {
    console.error('Error en interacción de botón de tags:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ **Oops!** Hubo un problema procesando tu solicitud. Inténtalo de nuevo en unos segundos.',
        ephemeral: true
      });
    }
  }
}

// 👁️ Función para ver tags directamente
async function handleTagsViewDirect(interaction: ButtonInteraction) {
  try {
    const guildId = interaction.guild!.id;
    const userId = interaction.user.id;
    
    const userTags = await getUserTags(userId, guildId);

    if (userTags.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏷️ Tus Tags Personales')
        .setDescription(
          '🤔 **¡Parece que aún no has configurado ningún tag!**\n\n' +
          '**¿Por qué deberías hacerlo?** ✨\n' +
          '• 🎯 Encuentra personas con tus mismos intereses\n' +
          '• 🏆 Obtén roles automáticos cool\n' +
          '• 🌟 Accede a eventos exclusivos\n' +
          '• 🚀 Mejora tu experiencia en el servidor\n\n' +
          '**¡Es súper fácil!** Solo haz clic en "Configurar Mis Tags" y sigue los pasos. ' +
          'Te tomará menos de un minuto y transformará tu experiencia. 💫'
        )
        .setColor('#ffaa00')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: '💡 ¡Tu perfil perfecto te está esperando!' })
        .setTimestamp();

      // Botón para ir directamente al setup
      const setupButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('tags-setup-direct')
            .setLabel('¡Configurar Ahora!')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🚀')
        );

      return await interaction.reply({ 
        embeds: [embed], 
        components: [setupButton],
        ephemeral: true 
      });
    }

    // Mostrar tags existentes
    const tagsByCategory = userTags.reduce((acc, tag) => {
      if (!acc[tag.tag_type]) {
        acc[tag.tag_type] = [];
      }
      acc[tag.tag_type].push(tag.tag_value);
      return acc;
    }, {} as Record<string, string[]>);

    const embed = new EmbedBuilder()
      .setTitle('🏷️ Tus Tags Personales')
      .setDescription(
        `✨ **¡Perfil configurado!** Tienes ${Object.keys(tagsByCategory).length} categorías activas.\n\n` +
        '🎯 **Beneficios activos:**\n' +
        '• Otros miembros pueden encontrarte por tus intereses\n' +
        '• Roles automáticos aplicados según tus tags\n' +
        '• Acceso a eventos específicos de tus categorías\n' +
        '• Participación en estadísticas del servidor'
      )
      .setColor(getEmbedColor())
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    // Agregar campos para cada categoría
    Object.entries(tagsByCategory).forEach(([categoryId, values]) => {
      const category = TAG_CATEGORIES.find(cat => cat.id === categoryId);
      if (category) {
        const formattedValues = values.map(value => {
          const option = category.options.find(opt => opt.value === value);
          return `${option?.emoji || category.emoji} ${option?.label || value}`;
        }).join('\n');
        
        embed.addFields({
          name: `${category.emoji} ${category.name}`,
          value: formattedValues,
          inline: true
        });
      }
    });

    embed.setFooter({ text: '🔄 Puedes actualizar tus tags cuando quieras' });

    // Botones para gestionar tags
    const manageButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tags-setup-direct')
          .setLabel('Actualizar Tags')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId('tags-help-detailed')
          .setLabel('Más Info')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('ℹ️')
      );

    await interaction.reply({ 
      embeds: [embed], 
      components: [manageButtons],
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error mostrando tags del usuario:', error);
    await interaction.reply({
      content: '❌ **Error:** No se pudieron cargar tus tags. Inténtalo de nuevo.',
      ephemeral: true
    });
  }
}

// 📚 Función para mostrar ayuda detallada
async function handleTagsHelpDetailed(interaction: ButtonInteraction) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('📚 Guía Completa de Tags')
    .setDescription(
      '**¡Bienvenido al sistema de tags!** 🎉\n\n' +
      'Los tags son tu forma de personalizar tu experiencia en el servidor y conectar con la comunidad.'
    )
    .addFields(
      {
        name: '🏷️ ¿Qué son los Tags?',
        value: 
          'Son etiquetas personales que describen:\n' +
          '• Tu país de origen 🌍\n' +
          '• Tu edad 🎂\n' +
          '• Tus juegos favoritos 🎮\n' +
          '• Tus lenguajes de programación 💻\n' +
          '• Tus intereses generales 🌟',
        inline: false
      },
      {
        name: '✨ Beneficios de Usar Tags',
        value:
          '🤝 **Networking:** Encuentra personas con gustos similares\n' +
          '🏆 **Roles automáticos:** Obtén roles especiales instantáneamente\n' +
          '🎯 **Eventos personalizados:** Accede a actividades de tu interés\n' +
          '📊 **Estadísticas:** Participa en rankings y competencias\n' +
          '🌟 **Visibilidad:** Sé encontrado por otros miembros\n' +
          '🎮 **Gaming:** Conecta con jugadores de tus mismos juegos',
        inline: false
      },
      {
        name: '🚀 Cómo Configurar (Paso a Paso)',
        value:
          '**1.** Haz clic en "Configurar Mis Tags" 🖱️\n' +
          '**2.** Selecciona una categoría del menú 📋\n' +
          '**3.** Elige tus opciones favoritas ✅\n' +
          '**4.** ¡Listo! Tus tags están guardados 🎉\n' +
          '**5.** Repite para más categorías si quieres 🔄',
        inline: false
      },
      {
        name: '⚙️ Comandos Útiles',
        value:
          '`/tags setup` - Configurar nuevos tags\n' +
          '`/tags view` - Ver tus tags actuales\n' +
          '`/tags view @usuario` - Ver tags de otro usuario\n' +
          '`/tags remove` - Eliminar una categoría\n' +
          '💡 **Tip:** También puedes usar los botones de aquí',
        inline: false
      },
      {
        name: '🔄 Actualizaciones y Cambios',
        value:
          '• Puedes cambiar tus tags **cuando quieras**\n' +
          '• Los roles se actualizan **automáticamente**\n' +
          '• Las notificaciones llegan por **mensaje privado**\n' +
          '• Tus tags son **visibles para otros** miembros\n' +
          '• Algunas categorías permiten **múltiples selecciones**',
        inline: false
      },
      {
        name: '🎯 Consejos Pro',
        value:
          '🔥 **Sé específico:** Mientras más tags tengas, mejor networking\n' +
          '🌟 **Mantén actualizado:** Cambia tus tags si evolucionan tus gustos\n' +
          '👥 **Explora otros perfiles:** Usa `/tags view @usuario` para conocer gente\n' +
          '🏆 **Aprovecha los roles:** Los roles automáticos te dan privilegios especiales\n' +
          '📊 **Participa:** Los tags te incluyen en estadísticas y eventos',
        inline: false
      }
    )
    .setColor('#0099ff')
    .setThumbnail(interaction.guild?.iconURL() || null)
    .setFooter({ 
      text: '¿Listo para empezar? ¡Usa el botón de abajo! 🚀', 
      iconURL: interaction.client.user?.displayAvatarURL() 
    })
    .setTimestamp();

  // Botón para ir directamente al setup
  const startButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('tags-setup-direct')
        .setLabel('¡Configurar Ahora!')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀'),
      new ButtonBuilder()
        .setCustomId('tags-view-direct')
        .setLabel('Ver Mis Tags')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👁️')
    );

  await interaction.reply({
    embeds: [helpEmbed],
    components: [startButton],
    ephemeral: true
  });
}