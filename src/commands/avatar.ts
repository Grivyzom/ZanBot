import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  User
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

function buildAvatarEmbed(user: User, member: GuildMember | null, requester: User) {
  const color = member?.roles.highest?.color || getEmbedColor('random');
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🖼️ Avatar de ${user.username}`)
    .setImage(user.displayAvatarURL({ size: 4096 }))
    .setTimestamp()
    .setFooter({ 
      text: `Solicitado por ${requester.tag}`, 
      iconURL: requester.displayAvatarURL() 
    });
}

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Muestra el avatar de un usuario.')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres obtener el avatar')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('usuario') || interaction.user;
  const member = interaction.guild?.members.cache.get(target.id) ?? null;
  const embed = buildAvatarEmbed(target, member, interaction.user);
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };