// src/utils/prohibitRole.ts
import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
} from 'discord.js';

/**
 * Devuelve una función que impide ejecutar el comando
 * si el miembro posee el rol indicado.
 */
export const prohibitRole =
  (roleId: string) =>
  async (interaction: ChatInputCommandInteraction): Promise<boolean> => {
    // Solo funciona dentro de un servidor
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: '🚫 Solo disponible en servidores.',
        ephemeral: true,
      });
      return false;
    }

    const roles = interaction.member.roles as GuildMemberRoleManager;

    // Si el miembro tiene el rol prohibido, se corta la ejecución
    // ──────────── NUEVO BLOQUEO ────────────
    // 1️⃣ Posee el rol “Nuevo”  │ 2️⃣ No posee ningún otro rol aparte de @everyone
    const hasProhibitedRole = roles.cache.has(roleId);
    const hasNoRoles =
      roles.cache.filter((r) => r.id !== interaction.guild.id).size === 0;

    if (hasProhibitedRole || hasNoRoles) {
      await interaction.reply({
        content:'🚫 Necesitas un rol válido para usar este comando. Consulta a un moderador.',
        ephemeral: true,
      });
      return false;
    }

    return true;
  };
