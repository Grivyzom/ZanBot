import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { getLevelData, calculateXPForNextLevel, generateLevelCard, getUserActivityStats } from '../utils/levelSystem';
import { ChatInputCommandInteraction } from 'discord.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import dotenv from 'dotenv';
dotenv.config();

// Importar la función formatNumber del sistema de niveles
// Esta función formatea números grandes de manera legible
// Por ejemplo: 1500 -> 1.5K, 1500000 -> 1.5M

const LEVEL_CHANNEL_ID = process.env.LEVEL_CHANNEL_ID as string;

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}


export const data = new SlashCommandBuilder()
  .setName('nivel')
  .setDescription('Consulta tu nivel y experiencia actual o de otro usuario')
  .addUserOption(option => 
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres ver el nivel (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('vista')
      .setDescription('Tipo de vista para mostrar la información')
      .setRequired(false)
      .addChoices(
        { name: 'Tarjeta', value: 'card' },
        { name: 'Detallado', value: 'detail' },
        { name: 'Estadísticas', value: 'stats' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // Usar defer para tener tiempo para generar la tarjeta
  
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  const viewType = interaction.options.getString('vista') || 'card';
  const canvas = createCanvas(800, 250);
  
  // Obtener datos del nivel
  const guildId = interaction.guildId!;
  const stats = await getLevelData(targetUser.id, guildId);
  
  // Obtener el miembro del servidor para acceder a su avatar, nickname, etc.
  const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
  
  if (!member) {
    return await interaction.editReply({
      content: '❌ No se pudo encontrar al usuario en este servidor.'
    });
  }
  
  switch (viewType) {
    case 'card':
      // Generar la tarjeta de nivel visual
      const levelCard = await generateLevelCard(member, stats);
      
      await interaction.editReply({ files: [levelCard] });
      if (LEVEL_CHANNEL_ID) {
        const levelCh = await interaction.client.channels.fetch(LEVEL_CHANNEL_ID) as TextChannel;
        if (levelCh && levelCh.isTextBased()) {
          await levelCh.send({ files: [levelCard] });
        }
      }
       break;
      
    case 'detail':
      // Vista detallada con embed
      const xpCurrentLevel = calculateXPForNextLevel(stats.level - 1) || 0;
      const xpNextLevel = calculateXPForNextLevel(stats.level);
      const totalXpForCurrentLevel = stats.totalXp - stats.xp;
      
      const embed = new EmbedBuilder()
        .setColor(stats.level >= 100 ? '#ffd700' : stats.level >= 50 ? '#1e88e5' : '#43a047')
        .setTitle(`📊 Perfil de Nivel: ${member.displayName}`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '📈 Nivel', value: `${stats.level}`, inline: true },
          { name: '🏆 Ranking', value: `#${stats.rank || '?'}`, inline: true },
          { name: '⭐ XP Actual', value: `${formatNumber(stats.xp)}/${formatNumber(xpNextLevel)}`, inline: true },
          { name: '📊 Progreso', value: `${stats.progress}%`, inline: true },
          { name: '🔮 XP Total Acumulado', value: `${formatNumber(stats.totalXp)}`, inline: true },
          { name: '📋 XP Nivel Actual', value: `${formatNumber(totalXpForCurrentLevel)}`, inline: true },
        )
        .setFooter({ text: `Sistema de niveles v2.0 • Próximo nivel: ${stats.level + 1}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      break;
      
    case 'stats':
      // Vista de estadísticas de actividad
      const activityStats = await getUserActivityStats(targetUser.id, guildId);
      
      const statsEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📊 Estadísticas de Actividad: ${member.displayName}`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '📈 Nivel Actual', value: `${stats.level}`, inline: true },
          { name: '🏆 Ranking', value: `#${stats.rank || '?'}`, inline: true },
          { name: '⭐ XP Total', value: `${formatNumber(stats.totalXp)}`, inline: true },
          { name: '📈 Promedio Diario', value: `${formatNumber(activityStats.dailyAverage)} XP`, inline: true },
          { name: '📅 XP Semanal', value: `${formatNumber(activityStats.weeklyTotal)} XP`, inline: true },
          { name: '🗓️ Día Más Activo', value: activityStats.mostActiveDay, inline: true },
        )
        .setFooter({ text: 'Sistema de niveles v2.0 • Estadísticas de los últimos 7 días' })
        .setTimestamp();
      
      // Añadir fuentes de XP si existen
      const sources = Object.entries(activityStats.xpBySource);
      if (sources.length > 0) {
        let sourcesText = '';
        sources.forEach(([source, xp]) => {
          sourcesText += `${getSourceEmoji(source)} ${source}: ${formatNumber(xp)} XP\n`;
        });
        statsEmbed.addFields({ name: '🎯 Fuentes de XP', value: sourcesText });
      }
        
      await interaction.editReply({ embeds: [statsEmbed] });
      break;
  }
  
  // Si no es el propio usuario viendo su nivel, mantener el mensaje como no efímero
  if (targetUser.id !== interaction.user.id) {
    // Añadir botones para otras vistas (solo si está viendo su propio nivel)
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`nivel_card_${targetUser.id}`)
          .setLabel('Ver Tarjeta')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(viewType === 'card'),
        new ButtonBuilder()
          .setCustomId(`nivel_detail_${targetUser.id}`)
          .setLabel('Ver Detalles')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(viewType === 'detail'),
        new ButtonBuilder()
          .setCustomId(`nivel_stats_${targetUser.id}`)
          .setLabel('Ver Estadísticas')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(viewType === 'stats')
      );
      
    await interaction.editReply({ components: [row] });
  }
}

// Función auxiliar para obtener emoji según la fuente de XP
function getSourceEmoji(source: string): string {
  switch (source.toLowerCase()) {
    case 'message': return '💬';
    case 'voice': return '🎙️';
    case 'daily': return '📅';
    case 'bonus': return '🎁';
    case 'reaction': return '👍';
    case 'command': return '🤖';
    default: return '⭐';
  }
}

export default { data, execute };