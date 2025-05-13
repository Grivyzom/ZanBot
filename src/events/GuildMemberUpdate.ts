// src/events/GuildMemberUpdate.ts
import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import dotenv from 'dotenv';
dotenv.config();

export default {
  name: 'guildMemberUpdate',
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    // Si antes no estaba boosteando y ahora sí...
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const guild = newMember.guild;
      const channelId = process.env.BOOST_CHANNEL_ID;
      if (!channelId) {
        console.error('❌ Debes configurar BOOST_CHANNEL_ID en .env');
        return;
      }

      const channel = guild.channels.cache.get(channelId) as TextChannel;
      if (!channel || !channel.send) {
        console.error('❌ El canal indicado no existe o no es de texto');
        return;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
        .setColor(getEmbedColor(process.env.EMBED_COLOR ?? 'random'))  // Usa tu utilitario de color :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
        .setTitle('Booster')
        .setDescription('¡Gracias por boostear el servidor!')
        .addFields({ name: 'Booster', value: `<@${newMember.id}>`, inline: false })
        .setFooter({
          text: `${guild.name} • hoy a las ${new Date().toLocaleTimeString('es-ES',{ hour: '2-digit', minute: '2-digit' })}`
        });

      await channel.send({ embeds: [embed] });
    }
  }
};
