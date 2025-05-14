import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { resetLevel } from '../utils/levelSystem';
import { ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('reset-nivel')
  .setDescription('Reinicia el nivel y experiencia de un usuario')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario a reiniciar')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('usuario', true);
  const guildId = interaction.guildId!;
  await resetLevel(user.id, guildId);
  await interaction.reply(`🔄 Nivel y XP de <@${user.id}> reiniciados.`);
}

export default { data, execute };
