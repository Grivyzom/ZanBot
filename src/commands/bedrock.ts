// src/commands/bedrock.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export default {
  data: new SlashCommandBuilder()
    .setName('bedrock')
    .setDescription('Cómo unirse en Bedrock (:mobile_phone: :computer: :video_game:)'),
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('¡Cómo unirse en Bedrock! (Móvil)')
      .setDescription(
        '¡Unirse a Grivyzom en Bedrock es súper fácil!\n\n' +
        'Hay varias formas de unirse a Bedrock Edition. Te recomendamos buscar un tutorial dependiendo de tu plataforma.'
      )
      .setColor(getEmbedColor())
      .addFields({
        name: 'Información del servidor',
        value:
          '• Dirección del servidor (IP): `bedrock.grivyzom.com`\n' +
          '• Puerto del servidor: `21384`\n' +
          '• Nombre del servidor: Grivyzom',
      })
      .setFooter({ text: '¿Quieres unirte con Java? Ve a <#123456789012345678>' })
      .setImage('https://grivyzom.com/bedrock.png');

    await interaction.reply({ embeds: [embed] });
  },
};
