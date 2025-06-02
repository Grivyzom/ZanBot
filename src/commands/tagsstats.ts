// src/commands/tagsstats.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { getAllTagStats, getUsersByTag } from '../database';
import { TAG_CATEGORIES, getTagCategoryById, formatTagDisplay } from '../config/tagsConfig';

export default {
  data: new SlashCommandBuilder()
    .setName('tagsstats')
    .setDescription('[ADMIN] Ver estadísticas de tags del servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('general')
        .setDescription('Ver estadísticas generales de todos los tags')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Ver estadísticas de una categoría específica')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Categoría a analizar')
            .setRequired(true)
            .addChoices(
              ...TAG_CATEGORIES.map(cat => ({
                name: `${cat.emoji} ${cat.name}`,
                value: cat.id
              }))
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('users')
        .setDescription('Ver usuarios con un tag específico')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Categoría del tag')
            .setRequired(true)
            .addChoices(
              ...TAG_CATEGORIES.map(cat => ({
                name: `${cat.emoji} ${cat.name}`,
                value: cat.id
              }))
            )
        )
        .addStringOption(option =>
          option
            .setName('valor')
            .setDescription('Valor específico del tag (opcional)')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    // Verificar permisos
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const member = interaction.member as any;

    if (!member?.roles?.cache?.has(adminRoleId) && !member?.roles?.cache?.has(staffRoleId)) {
      return await interaction.reply({
        content: '❌ No tienes permisos para usar este comando.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'general':
        await handleGeneralStats(interaction);
        break;
      case 'category':
        await handleCategoryStats(interaction);
        break;
      case 'users':
        await handleUsersStats(interaction);
        break;
    }
  }
};

async function handleGeneralStats(interaction: ChatInputCommandInteraction) {
  try {
    const guildId = interaction.guild!.id;
    const allStats = await getAllTagStats(guildId);

    if (allStats.length === 0) {
      return await interaction.reply({
        content: '📊 No hay estadísticas de tags disponibles.',
        ephemeral: true
      });
    }

    // Agrupar por categoría
    const statsByCategory = allStats.reduce((acc, stat) => {
      if (!acc[stat.tag_type]) {
        acc[stat.tag_type] = [];
      }
      acc[stat.tag_type].push({ value: stat.tag_value, count: stat.count });
      return acc;
    }, {} as Record<string, Array<{ value: string; count: number }>>);

    const embed = new EmbedBuilder()
      .setTitle('📊 Estadísticas Generales de Tags')
      .setColor(getEmbedColor())
      .setDescription('Resumen de todos los tags configurados en el servidor')
      .setTimestamp();

    // Añadir campo para cada categoría
    Object.entries(statsByCategory).forEach(([categoryId, stats]) => {
      const category = getTagCategoryById(categoryId);
      if (!category) return;

      const totalUsers = stats.reduce((sum, stat) => sum + stat.count, 0);
      const topValues = stats
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(stat => `• ${formatTagDisplay(categoryId, stat.value)}: **${stat.count}**`)
        .join('\n');

      embed.addFields({
        name: `${category.emoji} ${category.name} (${totalUsers} usuarios)`,
        value: topValues || 'Sin datos',
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    await interaction.reply({
      content: '❌ Hubo un error al obtener las estadísticas.',
      ephemeral: true
    });
  }
}

async function handleCategoryStats(interaction: ChatInputCommandInteraction) {
  try {
    const categoryId = interaction.options.getString('categoria', true);
    const guildId = interaction.guild!.id;
    const category = getTagCategoryById(categoryId);

    if (!category) {
      return await interaction.reply({
        content: '❌ Categoría no válida.',
        ephemeral: true
      });
    }

    const allStats = await getAllTagStats(guildId);
    const categoryStats = allStats.filter(stat => stat.tag_type === categoryId);

    if (categoryStats.length === 0) {
      return await interaction.reply({
        content: `📊 No hay estadísticas disponibles para **${category.emoji} ${category.name}**.`,
        ephemeral: true
      });
    }

    const totalUsers = categoryStats.reduce((sum, stat) => sum + stat.count, 0);
    const sortedStats = categoryStats.sort((a, b) => b.count - a.count);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${category.emoji} ${category.name}`)
      .setDescription(`Estadísticas detalladas - **${totalUsers}** usuarios con esta categoría configurada`)
      .setColor(getEmbedColor())
      .setTimestamp();

    // Dividir en chunks para no exceder el límite de caracteres
    const chunks = [];
    for (let i = 0; i < sortedStats.length; i += 10) {
      chunks.push(sortedStats.slice(i, i + 10));
    }

    chunks.forEach((chunk, index) => {
      const fieldValue = chunk
        .map((stat, i) => {
          const position = index * 10 + i + 1;
          const percentage = ((stat.count / totalUsers) * 100).toFixed(1);
          return `**${position}.** ${formatTagDisplay(categoryId, stat.tag_value)}\n   └ ${stat.count} usuarios (${percentage}%)`;
        })
        .join('\n\n');

      embed.addFields({
        name: index === 0 ? 'Ranking' : `Ranking (continuación ${index + 1})`,
        value: fieldValue,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al obtener estadísticas de categoría:', error);
    await interaction.reply({
      content: '❌ Hubo un error al obtener las estadísticas.',
      ephemeral: true
    });
  }
}

async function handleUsersStats(interaction: ChatInputCommandInteraction) {
  try {
    const categoryId = interaction.options.getString('categoria', true);
    const tagValue = interaction.options.getString('valor');
    const guildId = interaction.guild!.id;
    const category = getTagCategoryById(categoryId);

    if (!category) {
      return await interaction.reply({
        content: '❌ Categoría no válida.',
        ephemeral: true
      });
    }

    const users = await getUsersByTag(guildId, categoryId, tagValue || undefined);

    if (users.length === 0) {
      const message = tagValue 
        ? `No hay usuarios con el tag **${formatTagDisplay(categoryId, tagValue)}**.`
        : `No hay usuarios con tags en la categoría **${category.emoji} ${category.name}**.`;
      
      return await interaction.reply({
        content: `📊 ${message}`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`👥 Usuarios con ${category.emoji} ${category.name}`)
      .setColor(getEmbedColor())
      .setTimestamp();

    if (tagValue) {
      embed.setDescription(`Usuarios con el tag: **${formatTagDisplay(categoryId, tagValue)}**\n**Total:** ${users.length} usuarios`);
      
      const userList = users
        .map(user => `• <@${user.user_id}>`)
        .join('\n');

      // Dividir en múltiples campos si hay muchos usuarios
      const chunks = [];
      const lines = userList.split('\n');
      for (let i = 0; i < lines.length; i += 20) {
        chunks.push(lines.slice(i, i + 20).join('\n'));
      }

      chunks.forEach((chunk, index) => {
        embed.addFields({
          name: index === 0 ? 'Usuarios' : `Usuarios (continuación ${index + 1})`,
          value: chunk,
          inline: false
        });
      });
    } else {
      // Agrupar por valor del tag
      const usersByValue = users.reduce((acc, user) => {
        if (!acc[user.tag_value]) {
          acc[user.tag_value] = [];
        }
        acc[user.tag_value].push(user.user_id);
        return acc;
      }, {} as Record<string, string[]>);

      embed.setDescription(`Todos los usuarios en esta categoría\n**Total:** ${users.length} usuarios`);

      Object.entries(usersByValue).forEach(([value, userIds]) => {
        const displayValue = formatTagDisplay(categoryId, value);
        const userMentions = userIds.slice(0, 10).map(id => `<@${id}>`).join(', ');
        const extraCount = userIds.length > 10 ? ` y ${userIds.length - 10} más` : '';
        
        embed.addFields({
          name: `${displayValue} (${userIds.length})`,
          value: userMentions + extraCount,
          inline: false
        });
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error al obtener usuarios por tag:', error);
    await interaction.reply({
      content: '❌ Hubo un error al obtener los usuarios.',
      ephemeral: true
    });
  }
}