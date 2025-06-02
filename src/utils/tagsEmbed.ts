// src/utils/tagsEmbed.ts - VERSIÓN SIMPLIFICADA

import {
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';
import { TAG_CATEGORIES, getRoleCategories } from '../config/tagsConfig';

export async function publishTagsEmbed(channel: TextChannel): Promise<void> {
  try {
    // Verificar si ya existe un embed de tags
    const messages = await channel.messages.fetch({ limit: 50 });
    const existingEmbed = messages.find(msg => 
      msg.author.id === channel.client.user!.id && 
      msg.embeds[0]?.title?.includes('🏷️ Tags Personales')
    );

    if (existingEmbed) {
      console.log('✅ El embed de tags ya existe en el canal');
      return;
    }

    // Embed principal simplificado
    const mainEmbed = new EmbedBuilder()
      .setTitle('🏷️ Tags Personales')
      .setDescription(
        '**¡Conecta con la comunidad!** 🤝\n\n' +
        'Los tags te ayudan a:\n' +
        '🎯 **Encontrar** personas con intereses similares\n' +
        '🏆 **Obtener roles** especiales automáticamente\n' +
        '📊 **Participar** en eventos y estadísticas\n\n' +
        '**¿Cómo empezar?**\n' +
        '¡Simplemente usa `/tags setup` y selecciona lo que te represente!'
      )
      .setColor(getEmbedColor())
      .setThumbnail(channel.guild.iconURL() || null)
      .setFooter({ 
        text: '¡Configura tus tags en segundos!', 
        iconURL: channel.client.user?.displayAvatarURL() 
      });

    // Botones más llamativos
    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tags-setup-button')
          .setLabel('Configurar Tags')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🏷️'),
        new ButtonBuilder()
          .setCustomId('tags-view-button')
          .setLabel('Ver mis Tags')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👀'),
        new ButtonBuilder()
          .setCustomId('tags-help-button')
          .setLabel('Ayuda')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❓')
      );

    // Enviar solo el embed principal con los botones
    await channel.send({ 
      embeds: [mainEmbed], 
      components: [buttonsRow] 
    });
    
    console.log('✅ Embed de tags simplificado publicado correctamente');

  } catch (error) {
    console.error('❌ Error al publicar embed de tags:', error);
  }
}

// Manejo de botones mejorado
export async function handleTagsButtonInteraction(interaction: any) {
  if (!interaction.isButton()) return;

  switch (interaction.customId) {
    case 'tags-setup-button':
      await interaction.reply({
        content: '🏷️ Usa `/tags setup` para empezar a configurar tus tags.\n' +
                '¡Es súper fácil y rápido! ⚡',
        ephemeral: true
      });
      break;

    case 'tags-view-button':
      await interaction.reply({
        content: '👀 Usa `/tags view` para ver todos tus tags actuales.\n' +
                '¿Quieres ver los de alguien más? Menciona al usuario en el comando.',
        ephemeral: true
      });
      break;

    case 'tags-help-button':
      const helpEmbed = new EmbedBuilder()
        .setTitle('❓ Guía Rápida de Tags')
        .setDescription(
          '**¿Qué son los tags?** 🏷️\n' +
          'Son etiquetas personales que describen quién eres.\n\n' +
          '**¿Para qué sirven?** ✨\n' +
          '• 🤝 Conectar con personas similares\n' +
          '• 🏆 Obtener roles automáticos\n' +
          '• 📊 Participar en estadísticas\n' +
          '• 🎯 Ser encontrado por otros\n\n' +
          '**¿Cómo configurarlos?** ⚡\n' +
          '1. Escribe `/tags setup`\n' +
          '2. Elige una categoría\n' +
          '3. Selecciona tus opciones\n' +
          '4. ¡Listo! Ya tienes tus tags\n\n' +
          '**Comandos útiles:** 📝\n' +
          '• `/tags view` - Ver tus tags\n' +
          '• `/tags remove` - Eliminar un tag\n' +
          '• `/tags setup` - Configurar/actualizar'
        )
        .setColor(getEmbedColor())
        .setFooter({ 
          text: '¿Más dudas? Contacta al staff', 
          iconURL: interaction.guild?.iconURL() 
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [helpEmbed],
        ephemeral: true
      });
      break;
  }
}