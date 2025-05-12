// ──────────────────────────────────────────────────────────────
// src/commands/perfil.ts
// Comando: /perfil [usuario]
// Muestra una tarjeta de perfil completa en un Embed con estilo
// que varía según el rol más alto del usuario.
// ──────────────────────────────────────────────────────────────
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  User,
  roleMention
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

/**
 * Convierte un locale (es‑ES, en‑US…) en la bandera emoji correspondiente.
 */
function localeToFlag(locale?: string | null): string {
  if (!locale) return '🌐 Desconocido';
  const parts = locale.split('-');
  if (parts.length < 2) return '🌐 Desconocido';
  const countryCode = parts[1].toUpperCase();
  const codePoints = [...countryCode].map(c => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function buildProfileEmbed(user: User, member: GuildMember | null, requester: User) {
  // Color → usa el color del rol más alto si tiene; si no, aleatorio
  const color = member?.roles.highest?.color
    ? member.roles.highest.color
    : getEmbedColor('random');

  // Título incluye el rol más alto si existe
  const titlePrefix = member && member.roles.cache.size > 1 && member.roles.highest.name !== '@everyone'
    ? `[${member.roles.highest.name}] `
    : '';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${titlePrefix}Perfil de ${user.username}`)
    .setAuthor({
      name: user.tag,
      iconURL: user.displayAvatarURL({ size: 256 })
    })
    .setThumbnail(user.displayAvatarURL({ size: 1024 }))
    .addFields(
      { name: '🆔 ID', value: user.id, inline: true },
      { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
      {
        name: '📥 Se unió al servidor',
        value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : '—',
        inline: true
      },
      {
        name: '🌐 País',
        value: localeToFlag((user as any).locale ?? null),
        inline: true
      },
      {
        name: '📜 Roles',
        value: member
          ? member.roles.cache
              .filter(r => r.id !== member.guild.id)
              .map(r => roleMention(r.id))
              .join(' ') || 'Sin roles'
          : '—'
      }
    )
    .setTimestamp()
    .setFooter({ text: `Solicitado por ${requester.tag}` });

  return embed;
}

export const data = new SlashCommandBuilder()
  .setName('perfil')
  .setDescription('Muestra información detallada del perfil de un usuario.')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres obtener el perfil')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser('usuario') || interaction.user;
  const member = interaction.guild?.members.cache.get(target.id) ?? null;
  const embed = buildProfileEmbed(target, member, interaction.user);
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };