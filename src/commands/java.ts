// src/commands/java.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export default {
  data: new SlashCommandBuilder()
    .setName('java')
    .setDescription('Cómo unirse en Java (Computadora)'),
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('¡Cómo unirse en Java! (Computadora)')
      .setDescription('¡Unirse a SpookMC en Java es súper fácil!')
      .setColor(getEmbedColor()) // color dinámico :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
      .addFields(
        {
          name: 'Los pasos',
          value:
            '1. Abre tu Minecraft en cualquier versión superior a 1.8\n' +
            '2. Pulsa "Multijugador"\n' +
            '3. Presiona "Agregar servidor"\n' +
            '4. Completa la "Dirección del servidor" con: `spookmc.net`\n' +
            '5. ¡Presiona y únete al servidor!',
        },
        {
          name: 'Información del servidor',
          value:
            '• Dirección del servidor (IP): `spookmc.net`\n' +
            '• Nombre del servidor: SpookMC\n' +
            '• Versión recomendada: 1.19+',
        }
      )
      .setFooter({ text: '¿Quieres unirte en Bedrock? Ve a #bedrock' })
      .setImage('https://ruta/a/tu/imagen-java.png'); // ajusta la URL de la imagen
    await interaction.reply({ embeds: [embed] });
  },
};
