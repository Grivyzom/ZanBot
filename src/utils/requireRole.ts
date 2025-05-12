// utils/requireRole.ts
import { ChatInputCommandInteraction, GuildMemberRoleManager } from 'discord.js';

export const requireRole =
  (roleId: string) =>
  async (interaction: ChatInputCommandInteraction): Promise<boolean> => {
    // Solo comandos dentro de un servidor
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: '🚫 Solo disponible en servidores.', ephemeral: true });
      return false;
    }

    const roles = interaction.member.roles as GuildMemberRoleManager;
    if (!roles.cache.has(roleId)) {
      await interaction.reply({ content: '🚫 No tienes permiso para usar este comando.', ephemeral: true });
      return false;
    }
    return true;
  };
