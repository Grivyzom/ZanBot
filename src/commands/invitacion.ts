import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import pool from '../database';

/**
 * Tabla que almacena las invitaciones generadas por el bot.
 *  invite_code  VARCHAR(10) PK
 *  guild_id     VARCHAR(20)
 *  user_id      VARCHAR(20)
 *  expires_at   DATETIME
 *  uses         TINYINT
 *  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 */
async function ensureInvitesTable () {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS invites (
      invite_code VARCHAR(10) PRIMARY KEY,
      guild_id    VARCHAR(20) NOT NULL,
      user_id     VARCHAR(20) NOT NULL,
      expires_at  DATETIME NOT NULL,
      uses        TINYINT UNSIGNED NOT NULL DEFAULT 1,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_time (user_id, created_at)
    ) CHARACTER SET utf8mb4;
  `);
}

const INVITE_LIMIT_PER_HOUR = Number(process.env.INVITES_PER_HOUR ?? 10);

export const data = new SlashCommandBuilder()
  .setName('invitacion')
  .setDescription('Genera una invitación temporal con protección anti‑abuso')
  .addIntegerOption(opt =>
    opt.setName('duracion')
      .setDescription('Duración de la invitación en horas (1‑24)')
      .setMinValue(1)
      .setMaxValue(24)
  )
  .addIntegerOption(opt =>
    opt.setName('usos')
      .setDescription('Número máximo de usos (1‑5)')
      .setMinValue(1)
      .setMaxValue(5)
  )
  // Solo usuarios con «Gestionar servidor» pueden usarlo
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

type Interaction = ChatInputCommandInteraction & { inCachedGuild (): boolean };

export async function execute (interaction: Interaction) {
  await ensureInvitesTable();

  const durationHours = interaction.options.getInteger('duracion') ?? 1;
  const maxUses       = interaction.options.getInteger('usos') ?? 1;

  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: '🚫 Este comando solo puede usarse en un servidor.', ephemeral: true });
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({ content: '❌ No se pudo crear la invitación en este canal.', ephemeral: true });
  }

  // 1️⃣ Rate‑limit por usuario
  const [[{ count }]]: any = await pool.query(
    'SELECT COUNT(*) AS count FROM invites WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
    [interaction.user.id]
  );
  if (count >= INVITE_LIMIT_PER_HOUR) {
    return interaction.reply({ content: `⚠️ Has alcanzado el límite de ${INVITE_LIMIT_PER_HOUR} invitaciones por hora.`, ephemeral: true });
  }

  try {
    const invite = await channel.createInvite({
      maxAge: durationHours * 3600,
      unique: true,
      maxUses
    });

    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

    // 2️⃣ Persistencia en BD para trazabilidad y escalabilidad
    await pool.query(
      'INSERT INTO invites (invite_code, guild_id, user_id, expires_at, uses) VALUES (?,?,?,?,?)',
      [invite.code, interaction.guild!.id, interaction.user.id, expiresAt, maxUses]
    );

    const embed = new EmbedBuilder()
      .setTitle('📨 Invitación generada')
      .setDescription(`Enlace (máx ${maxUses} uso(s)):\n${invite.url}`)
      .addFields(
        { name: 'Duración', value: `${durationHours} h`, inline: true },
        { name: 'Usos', value: `${maxUses}`, inline: true }
      )
      .setFooter({ text: `Expira el ${expiresAt.toLocaleString('es-ES')}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error: any) {
    console.error('Error al crear invitación:', error);
    const msg = error.code === 50013 // Missing Permissions
      ? '🚫 El bot no tiene permisos suficientes para crear invitaciones en este canal.'
      : '⚠️ No fue posible crear la invitación.';
    await interaction.reply({ content: msg, ephemeral: true });
  }
}

export default { data, execute };
