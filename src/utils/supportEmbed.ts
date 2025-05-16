import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';

/**
 * Envía el embed de soporte si todavía no existe en el canal.
 * @param ch Canal de destino
 */
export async function publishSupportEmbed(ch: TextChannel) {
  // Evita duplicados: revisa los últimos 50 mensajes del bot
  const alreadySent = (await ch.messages.fetch({ limit: 50 }))
    .some(m => m.author.id === ch.client.user!.id && m.embeds[0]?.title === 'Soporte');
  if (alreadySent) return;

  /* ---------- Embed ---------- */
  const embed = new EmbedBuilder()
    .setTitle('Soporte')
    .setColor(getEmbedColor())
    .setDescription(
      '✅ **¡Haz clic en el menú de abajo para abrir un ticket!**\n' +
      'Recuerda elegir la categoría correcta, de lo contrario no recibirás soporte.\n\n' +
      '🔔 • Soporte\n' +
      '🛒 • Tienda\n' +
      '🚩 • Reportes\n' +
      '🧱 • Rollbacks\n' +
      '📨 • Apelaciones\n' +
      '📝 • Postulaciones\n' +
      '🖼️ • Media'
    );

  /* ---------- Select-menu ---------- */
  const menu = new StringSelectMenuBuilder()
    .setCustomId('support-category')          // <<– lo usaremos en el listener
    .setPlaceholder('Selecciona una categoría')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Soporte').setValue('support').setEmoji('🔔'),
      new StringSelectMenuOptionBuilder().setLabel('Tienda').setValue('shop').setEmoji('🛒'),
      new StringSelectMenuOptionBuilder().setLabel('Reportes').setValue('reports').setEmoji('🚩'),
      new StringSelectMenuOptionBuilder().setLabel('Rollbacks').setValue('rollbacks').setEmoji('🧱'),
      new StringSelectMenuOptionBuilder().setLabel('Apelaciones').setValue('appeals').setEmoji('📨'),
      new StringSelectMenuOptionBuilder().setLabel('Postulaciones').setValue('jobs').setEmoji('📝'),
      new StringSelectMenuOptionBuilder().setLabel('Media').setValue('media').setEmoji('🖼️'),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  await ch.send({ embeds: [embed], components: [row] });
}
