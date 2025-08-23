// src/commands/wiki.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('wiki')
  .setDescription('Accede a la wiki oficial de Grivyzom');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 Wiki Oficial de Grivyzom')
    .setDescription(
      '¡Hola! 👋\n\n' +
      'Si necesitas aprender sobre algún tema, en nuestra **Wikipedia** está toda la información sobre nuestros servidores.\n\n' +
      '**El link para ingresar es:**\n' +
      '🔗 **wiki.grivyzom.com**\n\n' +
      '**¿Qué encontrarás en nuestra wiki?**\n' +
      '• 📋 Reglas y normativas del servidor\n' +
      '• 🛠️ Comandos y funciones especiales\n' +
      '• 💰 Sistema económico y trabajos\n' +
      '• 🏰 Guía de protecciones (Claims)\n' +
      '• 🎮 Modos de juego disponibles\n' +
      '• 🏆 Sistema de rangos y permisos\n' +
      '• 🎪 Eventos y competencias\n' +
      '• 💡 Tips y trucos exclusivos\n\n' +
      '¡Toda la información que necesitas para dominar Grivyzom! 🚀'
    )
    .setColor(getEmbedColor())
    .setThumbnail(interaction.guild?.iconURL() || null)
    .setImage('https://wiki.grivyzom.com/assets/banner.png')
    .setFooter({ 
      text: 'Wiki Grivyzom • Tu guía completa del servidor',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  // Botón para acceder directamente a la wiki
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Abrir Wiki')
        .setStyle(ButtonStyle.Link)
        .setURL('https://wiki.grivyzom.com')
        .setEmoji('📚')
    );

  await interaction.reply({ 
    embeds: [embed], 
    components: [row]
  });
}

export default { data, execute };