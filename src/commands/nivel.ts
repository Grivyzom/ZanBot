import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { getLevelData } from '../utils/levelSystem';

export const data = new SlashCommandBuilder()
  .setName('nivel')
  .setDescription('Consulta tu nivel y experiencia actual');

export async function execute(interaction: CommandInteraction) {
  const user = interaction.user;
  const guildId = interaction.guildId!;
  const stats = await getLevelData(user.id, guildId);

  await interaction.reply({
    content: `🔹 Nivel: **${stats.level}**\n⭐ XP: **${stats.xp}**`,
    ephemeral: true
  });
}

export default { data, execute };
