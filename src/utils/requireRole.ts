// src/utils/requireRole.ts
import { CommandInteraction, GuildMember } from 'discord.js';

export const requireRole = (roleId: string) =>
  async (interaction: CommandInteraction): Promise<boolean> => {
    // 1) Chequea que estemos en un guild
    if (!interaction.guild) {
      await interaction.reply({ content: '🚫 Solo disponible en servidores.', ephemeral: true });
      return false;
    }

    // 2) Asegúrate de que member es un GuildMember
    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.reply({ content: '🚫 No pude verificar tus roles.', ephemeral: true });
      return false;
    }

    // 3) Comprueba que tenga el rol Staff
    if (!member.roles.cache.has(roleId)) {
      await interaction.reply({ content: '🚫 No tienes permiso para usar este comando.', ephemeral: true });
      return false;
    }

    return true;
  };
