// src/commands/java.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { requireRole } from '../utils/requireRole';
import dotenv from 'dotenv';
dotenv.config();

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID!;

export default {
  data: new SlashCommandBuilder()
    .setName('java')
    .setDescription('Cómo unirse en Java (Computadora)')
    // Opcional: evita que se muestre como comando “público” (requiere Administrator para ver)
    .setDefaultMemberPermissions(0),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await requireRole(STAFF_ROLE_ID)(interaction))) return;

    const embed = new EmbedBuilder()
    
      .setTitle('¡Cómo unirse en Java! (Computadora)')
      .setDescription('¡Unirse a Grivyzom en Java es súper fácil!')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: 'Los pasos',
          value:
            '1. Abre tu Minecraft en cualquier versión superior a 1.20.1\n' +
            '2. Pulsa "Multijugador"\n' +
            '3. Presiona "Agregar servidor"\n' +
            '4. Completa la "Dirección del servidor" con: `play.grivyzom.com`\n' +
            '5. ¡Presiona y únete al servidor!',
        },
        {
          name: 'Información del servidor',
          value:
            '• Dirección del servidor (IP): `play.grivyzom.com``\n' +
            '• Nombre del servidor: Grivyzom\n' +
            '• Versión recomendada: 1.21.+',
        }
      )
      .setFooter({ text: '¿Quieres unirte en Bedrock? Ve a <#1371879333651677244>' })
      .setImage('https://grivyzom.com/bedrock.png');

      await interaction.reply({ embeds: [embed] });
  },
};
