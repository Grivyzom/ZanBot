// src/commands/tags.ts
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
  TextBasedChannel
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

async function handleSetup(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('🏷️ Configuración de Tags')
    .setDescription(
      'Selecciona una categoría para configurar tus tags. Estos te ayudarán a conectar con otros miembros que compartan tus intereses.\n\n' +
      '**Categorías disponibles:**\n' +
      TAG_CATEGORIES.map(cat => `${cat.emoji} **${cat.name}**: ${cat.description}`).join('\n')
    )
    .setColor(getEmbedColor())
    .setFooter({ text: 'Selecciona una categoría del menú de abajo' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('tag-category-select')
    .setPlaceholder('Selecciona una categoría...')
    .addOptions(
      TAG_CATEGORIES.map(category =>
        new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setDescription(category.description)
          .setValue(category.id)
          .setEmoji(category.emoji)
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true
  });

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
        components: []
      });
    } catch (error) {
      // Ignore errors when editing expired interactions
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
      (category.multiSelect ? '✅ Puedes seleccionar múltiples opciones' : '⚠️ Solo puedes seleccionar una opción')
    )
    .setColor(getEmbedColor());

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
            .setEmoji(category.emoji || '❓')
        )
      );

    if (category.multiSelect) {
      selectMenu.setMaxValues(chunk.length);
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
      // Para múltiples selecciones, guardamos cada una por separado
      for (const value of selectedValues) {
        await setUserTag(userId, guildId, categoryId, value);
      }
    } else {
      // Para selección única
      await setUserTag(userId, guildId, categoryId, selectedValues[0]);
    }

    // Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setTitle('✅ Tags Actualizados')
      .setDescription(
        `**${category.emoji} ${category.name}** actualizado correctamente:\n\n` +
        selectedValues.map(value => `• ${formatTagDisplay(categoryId, value)}`).join('\n')
      )
      .setColor(getEmbedColor())
      .setFooter({ text: 'Puedes usar /tags view para ver todos tus tags' });

    await interaction.update({
      embeds: [embed],
      components: []
    });

    // Enviar notificación al canal de tags si está configurado
    if (interaction.guild) {
      await notifyTagsChannel(interaction.guild, interaction.user, categoryId, selectedValues);
    }

  } catch (error) {
    console.error('Error al guardar tags:', error);
    await interaction.update({
      content: '❌ Hubo un error al guardar tus tags. Inténtalo de nuevo.',
      embeds: [],
      components: []
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
        .setTitle('🏷️ Tags')
        .setDescription(
          targetUser.id === interaction.user.id
            ? 'No tienes tags configurados. Usa `/tags setup` para configurarlos.'
            : `${targetUser.displayName} no tiene tags configurados.`
        )
        .setColor(getEmbedColor());

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
      .setColor(getEmbedColor())
      .setThumbnail(targetUser.displayAvatarURL());

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

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al obtener tags:', error);
    await interaction.reply({
      content: '❌ Hubo un error al obtener los tags.',
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
      .setTitle('✅ Tag Eliminado')
      .setDescription(`El tag **${category?.emoji} ${category?.name}** ha sido eliminado correctamente.`)
      .setColor(getEmbedColor());

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al eliminar tag:', error);
    await interaction.reply({
      content: '❌ Hubo un error al eliminar el tag.',
      ephemeral: true
    });
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
      .setTitle('🏷️ Tag Actualizado')
      .setDescription(
        `**${user.displayName}** ha actualizado sus tags:\n\n` +
        `**${category.emoji} ${category.name}:**\n` +
        values.map(value => `• ${formatTagDisplay(categoryId, value)}`).join('\n')
      )
      .setColor(getEmbedColor())
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Error al notificar en canal de tags:', error);
  }
}

export default { data, execute };