import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { addXP } from '../utils/levelSystem';
import { ChatInputCommandInteraction } from 'discord.js';
import { applyRankRoles } from '../utils/rankRoles';


export const data = new SlashCommandBuilder()
  .setName('dar-experiencia')
  .setDescription('Añade experiencia a un usuario')
  .addUserOption(option => option.setName('usuario').setDescription('Usuario').setRequired(true))
  .addIntegerOption(option => option.setName('cantidad').setDescription('XP a otorgar').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('usuario', true);
  const cantidad = interaction.options.getInteger('cantidad', true);
  const guildId = interaction.guildId!;
  const result = await addXP(user.id, guildId, cantidad);

  // asigna rango acorde al nuevo nivel
  const member = await interaction.guild!.members.fetch(user.id);
  await applyRankRoles(member, result.level);

  await interaction.reply(
    `✅ XP actualizada: Nivel **${result.level}**, XP **${result.xp}**.`
  );
  
}

export default { data, execute };
