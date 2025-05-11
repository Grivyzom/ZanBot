// src/events/GuildMemberAdd.ts
import {
  Client,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ColorResolvable
} from 'discord.js';

export default class GuildMemberAdd {
  constructor(private client: Client) {
    this.client.on('guildMemberAdd', this.run.bind(this));
  }

  private async run(member: GuildMember) {
    // 1️⃣ Elige un color aleatorio para la barra lateral
    const COLORS: ColorResolvable[] = [
      '#FFA500', // naranja
      '#00AAFF', // azul
      '#8A2BE2', // violeta
      '#00FF7F', // verde
      '#FF69B4'  // rosa
    ];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // ── Embed público ───────────────────────────────────────────────────────
    const publicEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`¡Ha ingresado un nuevo miembro!`)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL() ?? undefined
      })
      .setDescription(
        `Bienvenido/a ${member.user}! 🎉\n` +
        `Pásala genial con nuestros retos, eventos y torneos.`
      )
      .addFields(
        {
          name: 'Canales recomendados',
          value:
            '> <#1370560459677110303>\n' +
            '> <#1370582114382250044>\n'
        },
        {
          name: '\n',
          value: `• ¡Ahora somos \`${member.guild.memberCount}\` usuarios en el servidor!\n`
        }
      )
      .setImage('https://grivyzom.com/banner-discord-grv.gif')
      .setTimestamp()
      .setFooter({
        text: member.guild.name,
        iconURL: member.guild.iconURL() ?? undefined
      });
      

    // 3️⃣ Envía SOLO el embed al canal
    const channelId = process.env.WELCOME_CHANNEL_ID!;
    const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [publicEmbed] }).catch(console.error);
    }

    // 4️⃣ (Opcional) Embed privado por DM, sin tocar el author
    const dmEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`¡Bienvenido/a a ${member.guild.name}!`)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL() ?? undefined
      })
      .setDescription(
        `Hola ${member.user}, nos alegra mucho que te unas a **${member.guild.name}**.\n\n` +
        `Aquí tienes un par de recursos para empezar:`
      )
      .addFields(
        {
          name: 'Canales recomendados\n',
          value:
            '> <#1370560459677110303>\n' +
            '> <#1370582114382250044>\n'
        },
        { name: '🌐 Web',    value: '[Página Oficial](https://grivyzom.com/)',         inline: true },
        { name: '🛒 Tienda', value: '[Tienda Network](https://store.grivyzom.com/)',   inline: true },
        { name: '❓ Soporte',      value: '[Escríbenos aquí](https://tu.cdn.com/soporte)', inline: true }
      )
      .setImage('https://grivyzom.com/banner-discord-grv.gif')
      .setTimestamp()
      .setFooter({
        text: member.guild.name,
        iconURL: member.guild.iconURL() ?? undefined
      });
      
    await member.send({ embeds: [dmEmbed] })
      .catch(() => console.warn(`No pude enviar DM a ${member.user.tag}`));
  }
}
