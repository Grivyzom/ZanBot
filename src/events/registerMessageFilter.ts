// src/registerMessageFilter.ts
import {
  Client,
  Interaction,
  ButtonInteraction,
  Message,
  TextChannel,
  ThreadChannel,
  NewsChannel,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  ChannelType,
  GuildBan
} from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID as string;

export default class RegisterMessageFilter {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
    // 1) Filtro de mensajes
    this.client.on('messageCreate', this.handleMessageCreate.bind(this));
    // 2) Botones (unban, banPerm, ipban)
    this.client.on('interactionCreate', this.handleInteractionCreate.bind(this));
    // 3) BAN event
    this.client.on('guildBanAdd', this.handleGuildBanAdd.bind(this));
  }
  // justo debajo de `private client: Client;`
  private userMessageLog = new Map<string, { lastContent: string; count: number; lastTimestamp: number }>();

  private async handleMessageCreate(message: Message) {
    if (message.author.bot || !message.guild) return;

    const content = message.content;
    const channel = message.channel;

    // 1) Detección de IPs (IPv4)
    const ipRegex = /\b(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}\b/;
    if (ipRegex.test(content)) {
      await message.delete();
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildNews ||
        channel.type === ChannelType.GuildPublicThread ||
        channel.type === ChannelType.GuildPrivateThread
      ) {
        await (channel as TextChannel | NewsChannel | ThreadChannel).send(
          `🚫 ${message.author}, no se permiten direcciones IP en el chat.`
        );
      }
      return;
    }

    // 2) Detección de dominios prohibidos
    const bannedDomains = ['example\\.com', 'badsite\\.net'];
    const domainRegex = new RegExp(`\\b(?:${bannedDomains.join('|')})\\b`, 'i');
    if (domainRegex.test(content)) {
      await message.delete();
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildNews ||
        channel.type === ChannelType.GuildPublicThread ||
        channel.type === ChannelType.GuildPrivateThread
      ) {
        await (channel as TextChannel | NewsChannel | ThreadChannel).send(
          `🚫 ${message.author}, ese dominio está prohibido.`
        );
      }
      return;
    }

    // 3) Detección de spam: mismo mensaje 3 veces en menos de 5 segundos
    const userId = message.author.id;
    const now = Date.now();
    const record = this.userMessageLog.get(userId);

    if (record) {
      if (content === record.lastContent && now - record.lastTimestamp < 5000) {
        record.count++;
      } else {
        record.count = 1;
        record.lastContent = content;
      }
      record.lastTimestamp = now;

      if (record.count >= 3) {
        await message.delete();
        if (
          channel.type === ChannelType.GuildText ||
          channel.type === ChannelType.GuildNews ||
          channel.type === ChannelType.GuildPublicThread ||
          channel.type === ChannelType.GuildPrivateThread
        ) {
          await (channel as TextChannel | NewsChannel | ThreadChannel).send(
            `🚫 ${message.author}, por favor no hagas spam.`
          );
        }
        this.userMessageLog.delete(userId);
        return;
      }
    } else {
      this.userMessageLog.set(userId, {
        lastContent: content,
        count: 1,
        lastTimestamp: now
      });
    }
  }

  private async handleInteractionCreate(interaction: Interaction) {
    if (!interaction.isButton()) return;
    const button = interaction as ButtonInteraction;
    const guild = button.guild;
    if (!guild) return;

    const parts = button.customId.split('_');
    if (parts.length < 2) {
      return button.reply({ content: 'Identificador de botón inválido.', ephemeral: true });
    }
    const action = parts[0];
    const userId = parts.slice(1).join('_');

    if (action === 'unban') {
      if (!/^\d+$/.test(userId)) {
        return button.reply({ content: '❌ ID de usuario inválido.', ephemeral: true });
      }
      const bans = await guild.bans.fetch();
      if (!bans.has(userId)) {
        return button.reply({ content: '❌ El usuario no está baneado.', ephemeral: true });
      }
      try {
        await guild.members.unban(userId, 'Desbaneado vía botón de logs');
      } catch (err) {
        console.error('Error desbaneando:', err);
        return button.reply({ content: '⚠️ Error al intentar desbanear.', ephemeral: true });
      }
      return button.reply({ content: '✅ Usuario desbaneado correctamente.', ephemeral: true });

    } else if (action === 'banPerm') {
      return button.reply({ content: '🔒 Baneo permanente confirmado.', ephemeral: true });

    } else if (action === 'ipban') {
      try {
        await guild.members.unban(userId, 'Desbaneado vía botón de logs (IP)');
      } catch (err) {
        console.error('Error desbaneando IP-ban:', err);
      }
      return button.update({
        content: `✅ Usuario <@${userId}> desbaneado (IP).`,
        embeds: [],
        components: []
      }).catch(console.error);
    }
  }

  private async handleGuildBanAdd(ban: GuildBan) {
    // ← Debug
    console.log(`[guildBanAdd] ${ban.user.tag} (${ban.user.id}) baneado en ${ban.guild.name}`);

    // Lanza el log
    await this.sendLogMessage(ban.guild.id, ban.user.id, 'permaban');
  }

  public async sendLogMessage(
    guildId: string,
    userId: string,
    banType: 'tempban' | 'ipban' | 'permaban'
  ) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;
      const fetched = await guild.channels.fetch(LOG_CHANNEL_ID);
      if (!fetched) return;
      if (
        fetched.type !== ChannelType.GuildText &&
        fetched.type !== ChannelType.GuildNews &&
        fetched.type !== ChannelType.GuildPublicThread
      ) return;
      const channel = fetched as TextChannel | NewsChannel | ThreadChannel;

      const embed = new EmbedBuilder()
        .setTitle('🔨 Registro de Baneo')
        .setDescription(`El usuario <@${userId}> ha sido baneado (${banType}).`)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`unban_${userId}`)
          .setLabel('Desbanear')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`banPerm_${userId}`)
          .setLabel('Confirmar baneo permanente')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Error enviando mensaje de log:', err);
    }
  }
}
