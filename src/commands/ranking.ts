import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getServerRanking } from '../utils/levelSystem';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('Muestra el ranking de niveles del servidor')
  .addIntegerOption(option =>
    option
      .setName('cantidad')
      .setDescription('Número de usuarios a mostrar (máx. 25)')
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  
  const guildId = interaction.guildId!;
  const limit = interaction.options.getInteger('cantidad') || 10;
  
  try {
    const rankingData = await getServerRanking(guildId, limit);
    
    if (rankingData.length === 0) {
      return await interaction.editReply({
        content: '⚠️ Aún no hay usuarios con niveles en este servidor.'
      });
    }
    
    // Crear un embed para el ranking
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(`🏆 Ranking de Niveles - ${interaction.guild?.name}`)
      .setDescription('Los usuarios más activos del servidor')
      .setThumbnail(interaction.guild?.iconURL() || '')
      .setFooter({ text: `Top ${limit} usuarios • Sistema de niveles v2.0` })
      .setTimestamp();
    
    // Obtener información de todos los usuarios mencionados en el ranking
    const memberPromises = rankingData.map(data => 
      interaction.guild?.members.fetch(data.user_id).catch(() => null)
    );
    
    const members = await Promise.all(memberPromises);
    
    // Construir la lista del ranking
    let description = '';
    const medals = ['🥇', '🥈', '🥉'];
    
    for (let i = 0; i < rankingData.length; i++) {
      const data = rankingData[i];
      const member = members[i];
      const position = i + 1;
      
      const medal = position <= 3 ? medals[position - 1] : `\`${position}.\``;
      const username = member ? member.displayName : 'Usuario Desconocido';
      
      description += `${medal} **${username}** • Nivel ${data.level} (${data.xp} XP)\n`;
      
      // Cada 10 posiciones, crear un nuevo campo para evitar límites de caracteres
      if ((i + 1) % 10 === 0 || i === rankingData.length - 1) {
        embed.addFields({ name: i < 10 ? '📊 Top 10' : `📊 Posiciones ${i - 9} - ${i + 1}`, value: description });
        description = '';
      }
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error al obtener el ranking:', error);
    await interaction.editReply({
      content: '❌ Ha ocurrido un error al obtener el ranking.'
    });
  }
}

export default { data, execute };