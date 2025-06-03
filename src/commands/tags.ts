// src/commands/tags.ts - VERSIÓN MEJORADA CON DM Y BOTONES DIRECTOS
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  Guild,
  User,
  TextBasedChannel,
  ButtonInteraction
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { TAG_CATEGORIES, getTagCategoryById, formatTagDisplay } from '../config/tagsConfig';
import { setUserTag, getUserTags, removeUserTag } from '../database';

export const data = new SlashCommandBuilder()
  .setName('tags')
  .setDescription('Gestiona tus tags personales')
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup')
      .setDescription('Configura tus tags personales')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('Ver tus tags actuales o los de otro usuario')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario del que ver los tags (opcional)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Eliminar un tag específico')
      .addStringOption(option =>
        option
          .setName('categoria')
          .setDescription('Categoría del tag a eliminar')
          .setRequired(true)
          .addChoices(
            ...TAG_CATEGORIES.map(cat => ({
              name: `${cat.emoji} ${cat.name}`,
              value: cat.id
            }))
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction);
      break;
    case 'view':
      await handleView(interaction);
      break;
    case 'remove':
      await handleRemove(interaction);
      break;
  }
}

// NUEVA FUNCIÓN: Manejo directo del botón de configurar tags
export async function handleTagsSetupButton(interaction: ButtonInteraction) {
  await handleSetup(interaction as any, true); // true indica que viene del botón
}

async function handleSetup(interaction: ChatInputCommandInteraction | ButtonInteraction, fromButton = false) {
  const embed = new EmbedBuilder()
    .setTitle('🏷️ Configuración de Tags')
    .setDescription(
      '✨ **¡Personaliza tu perfil!** ✨\n\n' +
      'Selecciona una categoría para configurar tus tags. Estos te ayudarán a:\n' +
      '🤝 • Conectar con otros miembros que compartan tus intereses\n' +
      '🏆 • Obtener roles automáticos según tus preferencias\n' +
      '📊 • Participar en estadísticas del servidor\n' +
      '🎯 • Ser encontrado por personas con gustos similares\n\n' +
      '**Categorías disponibles:**\n' +
      TAG_CATEGORIES.map(cat => `${cat.emoji} **${cat.name}**: ${cat.description}`).join('\n')
    )
    .setColor(getEmbedColor())
    .setFooter({ text: '🔽 Selecciona una categoría del menú de abajo para empezar' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('tag-category-select')
    .setPlaceholder('🏷️ Elige una categoría...')
    .addOptions(
      TAG_CATEGORIES.map(category =>
        new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setDescription(category.description.substring(0, 100)) // Discord limit
          .setValue(category.id)
          .setEmoji(category.emoji)
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // Respuesta ephemeral para que solo el usuario lo vea
  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true // ✨ Solo visible para el usuario
  });

  // Enviar notificación por DM al usuario
  await sendTagsNotificationDM(interaction.user, 'setup_started');

  // Collector para manejar la selección de categoría
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    filter: (i) => i.user.id === interaction.user.id && i.customId === 'tag-category-select',
    time: 300000 // 5 minutos
  });

  collector?.on('collect', async (selectInteraction) => {
    const categoryId = selectInteraction.values[0];
    await handleCategorySelection(selectInteraction, categoryId);
  });

  collector?.on('end', async () => {
    try {
      await interaction.editReply({
        components: [] // Remover componentes al expirar
      });
    } catch (error) {
      // Ignorar errores cuando la interacción expira
    }
  });
}

async function handleCategorySelection(interaction: StringSelectMenuInteraction, categoryId: string) {
  const category = getTagCategoryById(categoryId);
  if (!category) return;

  const embed = new EmbedBuilder()
    .setTitle(`🏷️ ${category.emoji} ${category.name}`)
    .setDescription(
      `${category.description}\n\n` +
      `${category.multiSelect ? 
        '✅ **Selección múltiple:** Puedes elegir varias opciones' : 
        '⚠️ **Selección única:** Solo puedes elegir una opción'
      }\n\n` +
      '🎯 Elige las opciones que mejor te representen:'
    )
    .setColor(getEmbedColor())
    .setTimestamp();

  // Dividir opciones en múltiples select menus si hay más de 25
  const optionChunks = [];
  for (let i = 0; i < category.options.length; i += 25) {
    optionChunks.push(category.options.slice(i, i + 25));
  }

  const rows = optionChunks.map((chunk, index) => {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`tag-option-select-${categoryId}-${index}`)
      .setPlaceholder(`Selecciona ${category.name.toLowerCase()}...`)
      .addOptions(
        chunk.map(option =>
          new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setDescription(option.description || `Seleccionar ${option.label}`)
            .setValue(option.value)
            .setEmoji(option.emoji || category.emoji || '🏷️')
        )
      );

    if (category.multiSelect) {
      selectMenu.setMaxValues(Math.min(chunk.length, 25));
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  });

  await interaction.update({
    embeds: [embed],
    components: rows
  });

  // Collector para manejar la selección de opciones
  const optionCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(`tag-option-select-${categoryId}`),
    time: 300000 // 5 minutos
  });

  optionCollector?.on('collect', async (optionInteraction) => {
    await handleOptionSelection(optionInteraction, categoryId, optionInteraction.values);
  });
}


async function handleOptionSelection(interaction: StringSelectMenuInteraction, categoryId: string, selectedValues: string[]) {
  const category = getTagCategoryById(categoryId);
  if (!category) return;

  try {
    const guildId = interaction.guild?.id;
    const userId = interaction.user.id;

    if (!guildId) {
      throw new Error('Guild ID no disponible');
    }

    // Guardar las selecciones en la base de datos
    if (category.multiSelect) {
      // Para múltiples selecciones, primero limpiamos los anteriores y luego guardamos los nuevos
      await removeUserTag(userId, guildId, categoryId);
      for (const value of selectedValues) {
        await setUserTag(userId, guildId, categoryId, value);
      }
    } else {
      // Para selección única
      await setUserTag(userId, guildId, categoryId, selectedValues[0]);
    }

    // Obtener las opciones seleccionadas con formato
    const formattedSelections = selectedValues.map(value => {
      const option = category.options.find(opt => opt.value === value);
      return `${option?.emoji || category.emoji} **${option?.label || value}**`;
    });

    // Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setTitle('✅ Tags Actualizados Correctamente')
      .setDescription(
        `🎉 **¡Perfecto!** Has actualizado tu categoría **${category.emoji} ${category.name}**\n\n` +
        `**Selecciones guardadas:**\n${formattedSelections.map(sel => `• ${sel}`).join('\n')}\n\n` +
        `${category.hasRoles ? '🏆 **Roles automáticos:** Se han aplicado los roles correspondientes' : ''}\n` +
        '📊 **Próximos pasos:** Puedes usar `/tags view` para ver todos tus tags o continuar configurando más categorías.'
      )
      .setColor('#00ff00') // Verde para éxito
      .setFooter({ text: '¡Gracias por personalizar tu perfil! 🎯' })
      .setTimestamp();

    // ✨ CAMBIO PRINCIPAL: Usar followUp con ephemeral en lugar de update
    await interaction.update({
      content: '✅ ¡Tags actualizados! Revisa el mensaje privado para más detalles.',
      embeds: [],
      components: [] // Remover componentes después de completar
    });

    // Enviar confirmación detallada como mensaje efímero
    await interaction.followUp({
      embeds: [embed],
      ephemeral: true // 🔑 ESTO HACE QUE SOLO EL USUARIO LO VEA
    });

    // Enviar notificación por DM
    await sendTagsNotificationDM(interaction.user, 'tags_updated', {
      categoryName: category.name,
      categoryEmoji: category.emoji,
      selections: formattedSelections
    });

    // Notificar en el canal de tags si está configurado
    if (interaction.guild) {
      await notifyTagsChannel(interaction.guild, interaction.user, categoryId, selectedValues);
    }

  } catch (error) {
    console.error('Error al guardar tags:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error al Guardar Tags')
      .setDescription(
        '**¡Ups! Algo salió mal** 😔\n\n' +
        'No pudimos guardar tus tags en este momento. Esto puede deberse a:\n' +
        '• Un problema temporal con la base de datos\n' +
        '• Una conexión inestable\n\n' +
        '🔄 **¿Qué hacer?**\n' +
        '• Intenta de nuevo en unos segundos\n' +
        '• Si el problema persiste, contacta al staff\n\n' +
        '💡 **Tip:** Puedes usar `/tags setup` para intentar nuevamente.'
      )
      .setColor('#ff0000') // Rojo para error
      .setTimestamp();

    // También hacer el mensaje de error efímero
    await interaction.update({
      content: '❌ Hubo un error. Revisa el mensaje privado para más detalles.',
      embeds: [],
      components: []
    });

    await interaction.followUp({
      embeds: [errorEmbed],
      ephemeral: true // Error también privado
    });
  }
}

async function handleView(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  const guildId = interaction.guild!.id;

  try {
    const userTags = await getUserTags(targetUser.id, guildId);

    if (userTags.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏷️ Tags de Usuario')
        .setDescription(
          targetUser.id === interaction.user.id
            ? '🤔 **No tienes tags configurados todavía**\n\n' +
              '¿Te gustaría empezar? Usa `/tags setup` para configurar tus primeros tags y:\n' +
              '🤝 • Conectar con la comunidad\n' +
              '🏆 • Obtener roles automáticos\n' +
              '📊 • Participar en estadísticas\n\n' +
              '¡Es súper fácil y rápido! ⚡'
            : `📭 **${targetUser.displayName} no tiene tags configurados**\n\n` +
              'Aún no ha personalizado su perfil con tags.'
        )
        .setColor(getEmbedColor())
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Agrupar tags por categoría
    const tagsByCategory = userTags.reduce((acc, tag) => {
      if (!acc[tag.tag_type]) {
        acc[tag.tag_type] = [];
      }
      acc[tag.tag_type].push(tag.tag_value);
      return acc;
    }, {} as Record<string, string[]>);

    const embed = new EmbedBuilder()
      .setTitle(`🏷️ Tags de ${targetUser.displayName}`)
      .setDescription(`✨ **Perfil personalizado** • ${Object.keys(tagsByCategory).length} categorías configuradas`)
      .setColor(getEmbedColor())
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    // Añadir campos para cada categoría
    Object.entries(tagsByCategory).forEach(([categoryId, values]) => {
      const category = getTagCategoryById(categoryId);
      if (category) {
        const formattedValues = values.map(value => formatTagDisplay(categoryId, value)).join('\n');
        embed.addFields({
          name: `${category.emoji} ${category.name}`,
          value: formattedValues,
          inline: true
        });
      }
    });

    // Footer diferente según si es el propio usuario o no
    if (targetUser.id === interaction.user.id) {
      embed.setFooter({ text: '💡 Usa /tags setup para actualizar • /tags remove para eliminar' });
    } else {
      embed.setFooter({ text: '💡 Usa /tags setup para configurar los tuyos' });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al obtener tags:', error);
    await interaction.reply({
      content: '❌ **Error:** No se pudieron obtener los tags. Inténtalo de nuevo en unos momentos.',
      ephemeral: true
    });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const categoryId = interaction.options.getString('categoria', true);
  const guildId = interaction.guild!.id;
  const userId = interaction.user.id;

  try {
    await removeUserTag(userId, guildId, categoryId);

    const category = getTagCategoryById(categoryId);
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Tag Eliminado')
      .setDescription(
        `✅ **¡Listo!** El tag **${category?.emoji} ${category?.name}** ha sido eliminado correctamente.\n\n` +
        '🔄 **¿Quieres configurar uno nuevo?** Usa `/tags setup`\n' +
        '👀 **¿Ver tus tags actuales?** Usa `/tags view`'
      )
      .setColor('#ff9900') // Naranja para eliminación
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Notificar por DM
    await sendTagsNotificationDM(interaction.user, 'tag_removed', {
      categoryName: category?.name || 'Categoría',
      categoryEmoji: category?.emoji || '🏷️'
    });

  } catch (error) {
    console.error('Error al eliminar tag:', error);
    await interaction.reply({
      content: '❌ **Error:** No se pudo eliminar el tag. Inténtalo de nuevo.',
      ephemeral: true
    });
  }
}

// NUEVA FUNCIÓN: Enviar notificaciones por DM
async function sendTagsNotificationDM(
  user: User, 
  type: 'setup_started' | 'tags_updated' | 'tag_removed',
  data?: any
) {
  try {
    let embed: EmbedBuilder;

    switch (type) {
      case 'setup_started':
        embed = new EmbedBuilder()
          .setTitle('🏷️ ¡Configuración de Tags Iniciada!')
          .setDescription(
            '✨ **¡Hola!** Has comenzado a configurar tus tags personales.\n\n' +
            '🎯 **¿Qué conseguirás?**\n' +
            '• 🤝 Conectar con personas similares\n' +
            '• 🏆 Obtener roles automáticos\n' +
            '• 📊 Participar en estadísticas del servidor\n' +
            '• 🎲 Acceder a eventos especiales\n\n' +
            '💡 **Consejo:** ¡Sé honesto en tus selecciones para obtener la mejor experiencia!'
          )
          .setColor('#00aaff')
          .setFooter({ text: '¡Gracias por personalizar tu experiencia!' })
          .setTimestamp();
        break;

      case 'tags_updated':
        embed = new EmbedBuilder()
          .setTitle('✅ ¡Tags Actualizados!')
          .setDescription(
            `🎉 **¡Perfecto!** Has actualizado tu categoría **${data.categoryEmoji} ${data.categoryName}**\n\n` +
            `**Nuevas selecciones:**\n${data.selections.map((sel: string) => `• ${sel}`).join('\n')}\n\n` +
            '🌟 **¡Ya puedes:**\n' +
            '• Ser encontrado por otros miembros con gustos similares\n' +
            '• Participar en eventos específicos de tu categoría\n' +
            '• Disfrutar de una experiencia más personalizada\n\n' +
            '🔄 ¿Quieres configurar más categorías? ¡Usa `/tags setup` cuando quieras!'
          )
          .setColor('#00ff00')
          .setFooter({ text: '¡Tu perfil está cada vez más completo! 🎯' })
          .setTimestamp();
        break;

      case 'tag_removed':
        embed = new EmbedBuilder()
          .setTitle('🗑️ Tag Eliminado')
          .setDescription(
            `✅ **Confirmado** - Tu tag **${data.categoryEmoji} ${data.categoryName}** ha sido eliminado.\n\n` +
            '🔄 **¿Cambio de planes?** No hay problema:\n' +
            '• Usa `/tags setup` para configurar nuevos tags\n' +
            '• Usa `/tags view` para ver tus tags actuales\n\n' +
            '💡 **Recuerda:** Siempre puedes volver a configurar tus tags cuando quieras.'
          )
          .setColor('#ff9900')
          .setFooter({ text: 'Tu privacidad y preferencias son importantes para nosotros' })
          .setTimestamp();
        break;
    }

    await user.send({ embeds: [embed] });
    
  } catch (error) {
    // Ignorar errores de DM (usuario puede tener DMs desactivados)
    console.log(`No se pudo enviar DM a ${user.tag}: ${error}`);
  }
}

async function notifyTagsChannel(guild: Guild, user: User, categoryId: string, values: string[]) {
  const tagsChannelId = process.env.TAGS_CHANNEL_ID;
  if (!tagsChannelId) return;

  try {
    const channel = await guild.channels.fetch(tagsChannelId);
    if (!channel || !channel.isTextBased()) return;

    const category = getTagCategoryById(categoryId);
    if (!category) return;

    const embed = new EmbedBuilder()
      .setTitle('🏷️ Perfil Actualizado')
      .setDescription(
        `**${user.displayName}** ha actualizado sus tags:\n\n` +
        `**${category.emoji} ${category.name}:**\n` +
        values.map(value => `• ${formatTagDisplay(categoryId, value)}`).join('\n')
      )
      .setColor(getEmbedColor())
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: '¡Cada vez somos una comunidad más conectada! 🌟' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Error al notificar en canal de tags:', error);
  }
}

export default { data, execute, handleTagsSetupButton };