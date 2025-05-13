// src/commands/testBoost.ts
import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import dotenv from 'dotenv';
dotenv.config();

export default {
  data: new SlashCommandBuilder()
    .setName('testboost')
    .setDescription('Envía un embed de prueba de booster'),
  async execute(interaction: CommandInteraction) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({ content: 'Este comando solo funciona en un servidor.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: interaction.guild.name, 
        iconURL: interaction.guild.iconURL() ?? undefined 
      })
      .setColor(getEmbedColor(process.env.EMBED_COLOR ?? 'random'))
      .setTitle('Booster')
      .setDescription('¡Gracias por boostear el servidor!')
      .addFields({ name: 'Booster', value: `<@${interaction.user.id}>` })
      .setFooter({
        text: `${interaction.guild.name} • hoy a las ${new Date().toLocaleTimeString('es-ES',{ hour: '2-digit', minute: '2-digit' })}`
      });

    await interaction.reply({ embeds: [embed] });
  }
};
