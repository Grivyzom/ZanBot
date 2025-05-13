// src/commands/bedrock.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export default {
  data: new SlashCommandBuilder()
    .setName('bedrock')
    .setDescription('Cómo unirse en Bedrock (Móvil)'),
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('¡Cómo unirse en Bedrock! (Móvil)')
      .setDescription('¡Unirse a SpookMC en Bedrock es súper fácil!')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: 'Información del servidor',
          value:
            '• Dirección del servidor (IP): `spookmc.net`\n' +
            '• Puerto del servidor: `19132`\n' +
            '• Nombre del servidor: SpookMC',
        }
      )
      .setFooter({ text: '¿Quieres unirte en Java? Ve a #java' })
      .setImage('https://ruta/a/tu/imagen-bedrock.png'); // ajusta la URL de la imagen
    await interaction.reply({ embeds: [embed] });
  },
};

