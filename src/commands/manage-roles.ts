// src/commands/manage-roles.ts - COMANDO OPCIONAL PARA ADMINISTRADORES
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('manage-roles')
  .setDescription('[ADMIN] Gestionar roles de procedencia de usuarios')
  .addSubcommand(subcommand =>
    subcommand
      .setName('assign')
      .setDescription('Asignar rol de procedencia manualmente a un usuario')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario al que asignar el rol')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('procedencia')
          .setDescription('Procedencia del usuario')
          .setRequired(true)
          .addChoices(
            { name: '👥 Comunidad', value: 'community' },
            { name: '🌐 Network', value: 'network' },
            { name: '🤝 Ambas', value: 'both' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('Resetear un usuario al rol "Nuevo"')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario a resetear')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('Ver estadísticas de roles de procedencia')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar permisos
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    return await interaction.reply({
      content: '❌ No tienes permisos para gestionar roles.',
      ephemeral: true
    });
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'assign':
      await handleAssignRole(interaction);
      break;
    case 'reset':
      await handleResetUser(interaction);
      break;
    case 'stats':
      await handleRoleStats(interaction);
      break;
  }
}

async function handleAssignRole(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('usuario', true);
  const origin = interaction.options.getString('procedencia', true);

  const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return await interaction.reply({
      content: '❌ Usuario no encontrado en el servidor.',
      ephemeral: true
    });
  }

  const newRoleId = process.env.ROLE_NUEVO!;
  const memberRoleId = process.env.ROLE_MIEMBRO!;
  const networkRoleId = process.env.ROLE_NETWORK!;

  try {
    let rolesToAdd: string[] = [];
    let rolesToRemove: string[] = [];

    // Remover rol "Nuevo" si lo tiene
    if (member.roles.cache.has(newRoleId)) {
      rolesToRemove.push(newRoleId);
    }

    // Remover roles de procedencia existentes
    if (member.roles.cache.has(memberRoleId)) {
      rolesToRemove.push(memberRoleId);
    }
    if (member.roles.cache.has(networkRoleId)) {
      rolesToRemove.push(networkRoleId);
    }

    // Añadir nuevos roles según procedencia
    switch (origin) {
      case 'community':
        rolesToAdd.push(memberRoleId);
        break;
      case 'network':
        rolesToAdd.push(networkRoleId);
        break;
      case 'both':
        rolesToAdd.push(memberRoleId, networkRoleId);
        break;
    }

    // Aplicar cambios
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove, 'Gestión manual de roles');
    }
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd, `Gestión manual - procedencia: ${origin}`);
    }

    const embed = new EmbedBuilder()
      .setColor(getEmbedColor('#43a047'))
      .setTitle('✅ Rol asignado correctamente')
      .setDescription(
        `**Usuario:** ${member}\n` +
        `**Procedencia:** ${getOriginLabel(origin)}\n` +
        `**Asignado por:** ${interaction.user}`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error asignando rol manualmente:', error);
    await interaction.reply({
      content: '❌ Error al asignar el rol.',
      ephemeral: true
    });
  }
}

async function handleResetUser(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('usuario', true);

  const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return await interaction.reply({
      content: '❌ Usuario no encontrado en el servidor.',
      ephemeral: true
    });
  }

  const newRoleId = process.env.ROLE_NUEVO!;
  const memberRoleId = process.env.ROLE_MIEMBRO!;
  const networkRoleId = process.env.ROLE_NETWORK!;

  try {
    // Remover roles de procedencia
    const rolesToRemove = [memberRoleId, networkRoleId].filter(id => 
      member.roles.cache.has(id)
    );

    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove, 'Reset a usuario nuevo');
    }

    // Añadir rol "Nuevo"
    if (!member.roles.cache.has(newRoleId)) {
      await member.roles.add(newRoleId, 'Reset a usuario nuevo');
    }

    const embed = new EmbedBuilder()
      .setColor(getEmbedColor('#ff9800'))
      .setTitle('🔄 Usuario reseteado')
      .setDescription(
        `**Usuario:** ${member}\n` +
        `**Estado:** Devuelto a "Nuevo"\n` +
        `**Reseteado por:** ${interaction.user}`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error reseteando usuario:', error);
    await interaction.reply({
      content: '❌ Error al resetear el usuario.',
      ephemeral: true
    });
  }
}

async function handleRoleStats(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  
  const newRoleId = process.env.ROLE_NUEVO!;
  const memberRoleId = process.env.ROLE_MIEMBRO!;
  const networkRoleId = process.env.ROLE_NETWORK!;

  try {
    const newRole = guild.roles.cache.get(newRoleId);
    const memberRole = guild.roles.cache.get(memberRoleId);
    const networkRole = guild.roles.cache.get(networkRoleId);

    const newCount = newRole?.members.size || 0;
    const memberCount = memberRole?.members.size || 0;
    const networkCount = networkRole?.members.size || 0;
    
    // Usuarios con ambos roles
    const bothCount = memberRole && networkRole 
      ? memberRole.members.filter(member => networkRole.members.has(member.id)).size 
      : 0;

    const totalMembers = guild.memberCount;
    const processedUsers = memberCount + networkCount - bothCount; // Evitar doble conteo
    const pendingUsers = newCount;

    const embed = new EmbedBuilder()
      .setColor(getEmbedColor('#2196f3'))
      .setTitle('📊 Estadísticas de Roles de Procedencia')
      .setDescription(`Resumen de roles en **${guild.name}**`)
      .addFields(
        {
          name: '👥 Miembros Comunidad',
          value: `${memberCount} usuarios`,
          inline: true
        },
        {
          name: '🌐 Miembros Network',
          value: `${networkCount} usuarios`,
          inline: true
        },
        {
          name: '🤝 Ambas Procedencias',
          value: `${bothCount} usuarios`,
          inline: true
        },
        {
          name: '⏳ Pendientes (Nuevos)',
          value: `${pendingUsers} usuarios`,
          inline: true
        },
        {
          name: '✅ Procesados',
          value: `${processedUsers} usuarios`,
          inline: true
        },
        {
          name: '👤 Total Miembros',
          value: `${totalMembers} usuarios`,
          inline: true
        },
        {
          name: '📈 Progreso',
          value: `${totalMembers > 0 ? Math.round((processedUsers / totalMembers) * 100) : 0}% completado`,
          inline: false
        }
      )
      .setThumbnail(guild.iconURL())
      .setTimestamp()
      .setFooter({
        text: 'Estadísticas en tiempo real',
        iconURL: interaction.client.user.displayAvatarURL()
      });

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    await interaction.reply({
      content: '❌ Error al obtener las estadísticas.',
      ephemeral: true
    });
  }
}

function getOriginLabel(origin: string): string {
  switch (origin) {
    case 'community': return '👥 Comunidad';
    case 'network': return '🌐 Network';
    case 'both': return '🤝 Ambas';
    default: return '❓ Desconocido';
  }
}

export default { data, execute };