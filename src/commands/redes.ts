// src/commands/redes.ts
import { SlashCommandBuilder, AttachmentBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { getSocialNetworks } from '../database';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs/promises';

export default {
  data: new SlashCommandBuilder()
    .setName('redes')
    .setDescription('Muestra las redes sociales de un usuario')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario del que mostrar las redes sociales (opcional)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {

// Sólo Member (o superior) puede usar este comando
    const member = interaction.member;
    if (!(member instanceof GuildMember)) {
      await interaction.reply({ content: 'Este comando solo puede usarse en un servidor.', ephemeral: true });
      return;
    }
    const minRole = interaction.guild?.roles.cache.find(r => r.name.toLowerCase() === 'member');
    if (minRole && member.roles.highest.position < minRole.position) {
      await interaction.reply({ content: 'No tienes permisos suficientes para usar este comando.', ephemeral: true });
      return;
    }
    await interaction.deferReply(); // Diferir la respuesta porque la creación del canvas puede tomar tiempo
      if (!interaction.guild) {
      await interaction.followUp({ content: 'Este comando sólo funciona en servidores.', ephemeral: true });
      return;
      }
    try {
      // Determinar de qué usuario se mostrarán las redes
      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      if (!interaction.guild) {
      await interaction.reply({
      content: 'Este comando sólo puede ejecutarse en un servidor.',
      ephemeral: true,
      });
      return;
      }
      // aquí interaction.guild ya no es null
      const guildId = interaction.guild.id;
      
      // Obtener las redes sociales de la base de datos
      const networks = await getSocialNetworks(targetUser.id, guildId);
      
      if (!networks) {
      await interaction.editReply(
      targetUser.id === interaction.user.id
            ? '❌ No tienes redes sociales registradas. Usa `/añadir-redes` para añadirlas.'
            : `❌ ${targetUser.username} no tiene redes sociales registradas.`
      );
      return;
      }
      
      // Verificar si el usuario tiene al menos una red social
      const hasAnyNetwork = Object.values(networks).some(value => value !== null);
      
      if (!hasAnyNetwork) {
        await interaction.editReply(
          targetUser.id === interaction.user.id
            ? '❌ No tienes redes sociales registradas. Usa `/añadir-redes` para añadirlas.'
            : `❌ ${targetUser.username} no tiene redes sociales registradas.`
        );
      }
      
      // Crear canvas para la imagen
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');
      
      // Fondo con gradiente
      const gradient = ctx.createLinearGradient(0, 0, 800, 400);
      gradient.addColorStop(0, '#2b2d31');
      gradient.addColorStop(1, '#1e1f22');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 400);
      
      // Añadir borde redondeado
      ctx.strokeStyle = '#5865f2';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(10, 10, 780, 380, 20);
      ctx.stroke();
      
      // Avatar del usuario
      try {
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);
        
        // Dibujar avatar circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 120, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 70, 40, 160, 160);
        ctx.restore();
      } catch (err) {
        console.error('Error al cargar el avatar:', err);
      }
      
      // Título
      ctx.font = 'bold 30px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(`Redes Sociales de ${targetUser.username}`, 400, 60);
      
      // Cargar iconos de redes sociales
      let y = 180;
      const iconSize = 40;
      const textX = 310;
      const iconX = 250;
      
      // Función para cargar y dibujar el ícono si existe la red social
      const drawNetwork = async (network: string,value: string | null,iconName: string,color: string,networkName: string): Promise<boolean> => 
            {if (value) {
          // Definir la ruta donde se espera que estén los iconos
          const assetsDir = path.join(__dirname, '..', '..', 'assets');
          let iconPath = path.join(assetsDir, `${iconName}.png`);
          
          // Verificar si el directorio assets existe, si no, crearlo
          try {
            await fs.access(assetsDir);
          } catch (err) {
            await fs.mkdir(assetsDir, { recursive: true });
          }
          
          // Verificar si el ícono existe, si no, usar un rectángulo de color
          let icon;
          try {
            await fs.access(iconPath);
            icon = await loadImage(iconPath);
          } catch (err) {
            // El ícono no existe, dibujamos un rectángulo de color
            ctx.fillStyle = color;
            ctx.fillRect(iconX, y - 30, iconSize, iconSize);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(iconName.charAt(0).toUpperCase(), iconX + iconSize/2, y - 5);
          }
          
          // Dibujar el ícono si existe
          if (icon) {
            ctx.drawImage(icon, iconX, y - 30, iconSize, iconSize);
          }
          
          // Texto de la red social
          ctx.font = '22px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'left';
          ctx.fillText(`${networkName}: @${value}`, textX, y);
          
          return true;
        }
        return false;
      };
      
      // Dibujar cada red social
      if (await drawNetwork('instagram', networks.instagram, 'instagram', '#E1306C', 'Instagram')) y += 50;
      if (await drawNetwork('twitter', networks.twitter, 'twitter', '#1DA1F2', 'Twitter')) y += 50;
      if (await drawNetwork('youtube', networks.youtube, 'youtube', '#FF0000', 'YouTube')) y += 50;
      if (await drawNetwork('github', networks.github, 'github', '#333333', 'GitHub')) y += 50;
      if (await drawNetwork('twitch', networks.twitch, 'twitch', '#9146FF', 'Twitch')) y += 50;
      
      // Añadir texto informativo en la parte inferior
      ctx.font = '16px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'center';
      ctx.fillText('Usa /añadir-redes para configurar tus propias redes sociales', 400, 370);
      
      // Convertir el canvas a un archivo adjunto
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'redes-sociales.png' });
      
      // Enviar la imagen
      await interaction.editReply({ files: [attachment] });
      
    } catch (error) {
      console.error('Error al mostrar redes sociales:', error);
      await interaction.editReply('❌ Ocurrió un error al generar la imagen de redes sociales.');
    }
  }
};