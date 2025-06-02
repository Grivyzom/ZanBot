// src/commands/tagsroles.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { assignTagRoles, updateAllTagRoles, createTagRoles } from '../utils/tagRoles';

export const data = new SlashCommandBuilder()
  .setName('tagsroles')
  .setDescription('[ADMIN] Gestionar roles automáticos por tags')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Crear roles automáticos para tags')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('update')
      .setDescription('Actualizar roles de un usuario específico')
      .addUserOption(option =>
        option
          .setName('usuario')
          .setDescription('Usuario al que actualizar roles')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('updateall')
      .setDescription('Actualizar roles de todos los usuarios (CUIDADO: Proceso intensivo)')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar permisos
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  const member = interaction.member as any;

  if (!member?.roles?.cache?.has(adminRoleId)) {
    return await interaction.reply({
      content: '❌ No tienes permisos para usar este comando.',
      ephemeral: true
    });
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      await handleCreateRoles(interaction);
      break;
    case 'update':
      await handleUpdateUser(interaction);
      break;
    case 'updateall':
      await handleUpdateAll(interaction);
      break;
  }
}

async function handleCreateRoles(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    await createTagRoles(interaction.guild!);

    const embed = new EmbedBuilder()
      .setTitle('✅ Roles de Tags Creados')
      .setDescription('Se han creado todos los roles necesarios para el sistema de tags automáticos.')
      .setColor(getEmbedColor())
      .addFields({
        name: '📝 Siguiente paso',
        value: 'Puedes usar `/tagsroles updateall` para asignar roles a todos los usuarios existentes basado en sus tags actuales.',
        inline: false
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error al crear roles:', error);
    await interaction.editReply({
      content: '❌ Hubo un error al crear los roles. Verifica los logs del bot.'
    });
  }
}

async function handleUpdateUser(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('usuario', true);
  
  await interaction.deferReply({ ephemeral: true });

  try {
    const member = await interaction.guild!.members.fetch(targetUser.id);
    await assignTagRoles(interaction.guild!, member);

    const embed = new EmbedBuilder()
      .setTitle('✅ Roles Actualizados')
      .setDescription(`Los roles de ${targetUser.displayName} han sido actualizados basado en sus tags.`)
      .setColor(getEmbedColor())
      .setThumbnail(targetUser.displayAvatarURL());

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error al actualizar roles del usuario:', error);
    await interaction.editReply({
      content: '❌ Hubo un error al actualizar los roles del usuario.'
    });
  }
}

async function handleUpdateAll(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const embed = new EmbedBuilder()
      .setTitle('🔄 Actualizando Roles...')
      .setDescription('Iniciando actualización masiva de roles. Este proceso puede tomar varios minutos.')
      .setColor(getEmbedColor())
      .addFields({
        name: '⚠️ Advertencia',
        value: 'Este proceso actualizará los roles de TODOS los miembros del servidor. No interrumpas el bot durante este proceso.',
        inline: false
      });

    await interaction.editReply({ embeds: [embed] });

    // Ejecutar la actualización masiva
    await updateAllTagRoles(interaction.guild!);

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Actualización Completada')
      .setDescription('La actualización masiva de roles ha sido completada exitosamente.')
      .setColor(getEmbedColor())
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    console.error('Error en actualización masiva:', error);
    await interaction.editReply({
      content: '❌ Hubo un error durante la actualización masiva. Verifica los logs del bot.'
    });
  }
}

export default { data, execute };