import {
  Client,
  GuildMember,
  EmbedBuilder,
  ColorResolvable,
  AuditLogEvent
} from 'discord.js';

export default class GuildMemberRemove {
  constructor(private client: Client) {
    this.client.on('GuildMemberRemove', this.run.bind(this));
  }
  private async run(member: GuildMember) {
    console.log('[guildMemberRemove] evento disparado para', member.user.tag);

    // 1️⃣ Filtrar bans
    try {
      await member.guild.bans.fetch(member.id);
      // si no lanza error, está banneado → no DM
      return;
    } catch (err: any) {
      if (err.httpStatus !== 404) {
        console.error('[guildMemberRemove] error comprobando ban:', err);
        return;
      }
      // 404 = no está baneado → seguimos
    }

    // 2️⃣ Filtrar kicks revisando audit logs
    try {
      const audit = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1
      });
      const kickLog = audit.entries.first();
      if (
        kickLog?.targetId === member.id &&
        Date.now() - kickLog.createdTimestamp < 5_000
      ) {
        // fue kickeado en los últimos 5s → no DM
        return;
      }
    } catch (err) {
      console.error('[guildMemberRemove] error audit logs kick:', err);
    }

    // 3️⃣ Construir embed de despedida
    const COLORS: ColorResolvable[] = [
      '#FFA500',
      '#00AAFF',
      '#8A2BE2',
      '#00FF7F',
      '#FF69B4'
    ];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const farewellEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`¡Hasta pronto en ${member.guild.name}!`)
      .setAuthor({
        name: member.user.username, // Cambiado de member.user.tag al nombre de usuario
        iconURL: member.guild.iconURL() ?? undefined  // icono del servidor
      })
      .setDescription(
        `Lamentamos verte partir, ${member.user}.\n` +
        `¡Gracias por haber sido parte de **${member.guild.name}**!`
      )
      .addFields({
        name: '🔄 Puertas abiertas',
        value: 'Siempre serás bienvenido/a de vuelta cuando quieras.'
      })
      .setTimestamp()
      .setFooter({
        text: '¡Te esperamos pronto!',
        iconURL: member.guild.iconURL() ?? undefined
      });

    // 4️⃣ Enviar por DM usando member.user.send
    return member.user.send({ embeds: [farewellEmbed] })
      .catch(err =>
        console.warn(`[guildMemberRemove] no pude DM a ${member.user.tag}:`, err)
      );
  }
}