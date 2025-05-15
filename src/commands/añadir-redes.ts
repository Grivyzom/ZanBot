// src/commands/añadir-redes.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { setSocialNetworks } from '../database';
import 'dotenv/config';

export default {
  data: new SlashCommandBuilder()
    .setName('añadir-redes')
    .setDescription('Añade o actualiza tus redes sociales')
    .addStringOption(option =>
      option
        .setName('instagram')
        .setDescription('Tu usuario de Instagram (sin @)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('twitter')
        .setDescription('Tu usuario de Twitter/X (sin @)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('youtube')
        .setDescription('Tu canal de YouTube (nombre de usuario)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('github')
        .setDescription('Tu usuario de GitHub')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('twitch')
        .setDescription('Tu usuario de Twitch')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Verificar rol por ID desde .env
    if (!interaction.guild) {
      await interaction.reply({ content: 'Este comando solo puede usarse en un servidor.', ephemeral: true });
      return;
    }
    const guildMember = await interaction.guild.members.fetch(interaction.user.id);
    const allowed = process.env.ALLOWED_ROLES?.split(',') || [];
    const hasAccess = guildMember.roles.cache.some(r => allowed.includes(r.id));
    if (!hasAccess) {
      await interaction.reply({ content: 'No tienes permisos suficientes para usar este comando.', ephemeral: true });
      return;
    }
    try {
      const userId = interaction.user.id;
      if (!interaction.guild) {
            await interaction.reply({
            content: 'Este comando sólo puede ejecutarse en un servidor.',
            ephemeral: true,
            });
            return;
      }

      // aquí interaction.guild ya no es null
      const guildId = interaction.guild.id;  
      // Obtener valores de los options
      const instagram = interaction.options.getString('instagram');
      const twitter = interaction.options.getString('twitter');
      const youtube = interaction.options.getString('youtube');
      const github = interaction.options.getString('github');
      const twitch = interaction.options.getString('twitch');
      
      // Eliminar caracteres @ si están presentes
      const cleanInstagram = instagram ? instagram.replace(/^@/, '') : null;
      const cleanTwitter = twitter ? twitter.replace(/^@/, '') : null;
      const cleanYoutube = youtube ? youtube.replace(/^@/, '') : null;
      const cleanGithub = github ? github.replace(/^@/, '') : null;
      const cleanTwitch = twitch ? twitch.replace(/^@/, '') : null;
      
      // Guardar en la base de datos
      await setSocialNetworks(userId, guildId, {
        instagram: cleanInstagram,
        twitter: cleanTwitter,
        youtube: cleanYoutube,
        github: cleanGithub,
        twitch: cleanTwitch
      });
      
      await interaction.reply({
        content: '✅ ¡Tus redes sociales han sido actualizadas correctamente!',
        ephemeral: true // Solo visible para el usuario que usó el comando
      });
    } catch (error) {
      console.error('Error al guardar redes sociales:', error);
      await interaction.reply({
        content: '❌ Ocurrió un error al guardar tus redes sociales. Por favor, inténtalo de nuevo más tarde.',
        ephemeral: true
      });
    }
  }
};