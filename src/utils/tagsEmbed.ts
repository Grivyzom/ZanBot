// src/utils/tagsEmbed.ts - VERSIÓN MEJORADA

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

    // Embed principal más limpio
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

    // Embed de categorías de forma más visual
    const categoriesEmbed = new EmbedBuilder()
      .setTitle('📋 Categorías Disponibles')
      .setColor(getEmbedColor())
      .setDescription(
        'Estas son las categorías que puedes configurar:\n'
      );

    // Separar categorías con roles y sin roles
    const roleCategories = getRoleCategories();
    const otherCategories = TAG_CATEGORIES.filter(cat => !cat.hasRoles);

    if (roleCategories.length > 0) {
      const roleText = roleCategories
        .map(cat => `${cat.emoji} **${cat.name}** - ${cat.description} ${cat.hasRoles ? '🏆' : ''}`)
        .join('\n');
      
      categoriesEmbed.addFields({
        name: '🏆 Con Roles Automáticos',
        value: roleText,
        inline: false
      });
    }

    if (otherCategories.length > 0) {
      const otherText = otherCategories
        .map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`)
        .join('\n');
      
      categoriesEmbed.addFields({
        name: '📝 Para Personalización',
        value: otherText,
        inline: false
      });
    }

    // Embed de ejemplos simplificado
    const exampleEmbed = new EmbedBuilder()
      .setTitle('✨ Ejemplos de Tags')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: '🌎 País → 🏆 Rol',
          value: '🇨🇱 Chile, 🇵🇪 Perú, 🇨🇴 Colombia...',
          inline: true
        },
        {
          name: '🎂 Edad → 🏆 Rol', 
          value: '👶 13-15, 🧒 16-18, 👨‍🎓 19-25...',
          inline: true
        },
        {
          name: '⛏️ Minecraft → 🏆 Rol',
          value: '☕ Java, 🪨 Bedrock, 🔄 Ambas',
          inline: true
        },
        {
          name: '🎮 Juegos Favoritos',
          value: '⛏️ Minecraft, 🎯 Valorant, 🌪️ Fortnite...',
          inline: true
        },
        {
          name: '💻 Programación',
          value: '🟨 JavaScript, 🐍 Python, ☕ Java...',
          inline: true
        },
        {
          name: '🌟 Intereses',
          value: '🎮 Gaming, 🎨 Arte, 🎵 Música...',
          inline: true
        }
      )
      .setFooter({ text: '🏆 = Otorga rol automático' });

    // Enviar los embeds
    await channel.send({ 
      embeds: [mainEmbed], 
      components: [buttonsRow] 
    });
    
    await channel.send({ embeds: [categoriesEmbed] });
    await channel.send({ embeds: [exampleEmbed] });

    console.log('✅ Embed de tags mejorado publicado correctamente');

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