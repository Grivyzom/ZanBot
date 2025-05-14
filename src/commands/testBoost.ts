// src/commands/testBoost.ts
import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import dotenv from 'dotenv';
dotenv.config();

export default {
  data: new SlashCommandBuilder()
    .setName('testboost')
    .setDescription('Envía un embed de prueba de booster'),
  async execute(interaction: CommandInteraction) {
    // ① Validar que sea en un servidor y que tengamos al miembro
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({ content: 'Este comando solo funciona en un servidor.', ephemeral: true });
    }

    const member = interaction.member as GuildMember;
    // ② Comprobar rol “Developer”
    if (!member.roles.cache.some(r => r.name === 'Developer')) {
      return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    }

    // ③ Si pasa el filtro, enviamos el embed de prueba
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
