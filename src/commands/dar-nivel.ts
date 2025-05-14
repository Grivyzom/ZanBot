import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { addLevels } from '../utils/levelSystem';

export const data = new SlashCommandBuilder()
  .setName('dar-nivel')
  .setDescription('Añade niveles a un usuario')
  .addUserOption(option => option.setName('usuario').setDescription('Usuario').setRequired(true))
  .addIntegerOption(option => option.setName('cantidad').setDescription('Niveles a otorgar').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  const user = interaction.options.getUser('usuario', true);
  const cantidad = interaction.options.getInteger('cantidad', true);
  const guildId = interaction.guildId!;
  const result = await addLevels(user.id, guildId, cantidad);
  await interaction.reply(`📈 Nuevo nivel de <@${user.id}>: **${result.level}** con XP **${result.xp}**.`);
}

export default { data, execute };
