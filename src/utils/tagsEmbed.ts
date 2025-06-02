// src/utils/tagsEmbed.ts
import {
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getEmbedColor } from './getEmbedColor';
import { TAG_CATEGORIES } from '../config/tagsConfig';

export async function publishTagsEmbed(channel: TextChannel): Promise<void> {
  try {
    // Verificar si ya existe un embed de tags
    const messages = await channel.messages.fetch({ limit: 50 });
    const existingEmbed = messages.find(msg => 
      msg.author.id === channel.client.user!.id && 
      msg.embeds[0]?.title?.includes('🏷️ Sistema de Tags')
    );

    if (existingEmbed) {
      console.log('✅ El embed de tags ya existe en el canal');
      return;
    }

    // Crear el embed principal
    const mainEmbed = new EmbedBuilder()
      .setTitle('🏷️ Sistema de Tags Personales')
      .setDescription(
        '¡Bienvenido al sistema de tags de **Grivyzom**! 🎉\n\n' +
        'Los tags te permitirán:\n' +
        '• 🤝 **Conectar** con otros miembros que compartan tus intereses\n' +
        '• 🎯 **Encontrar** personas con gustos similares\n' +
        '• 🏆 **Obtener roles** especiales según tus selecciones\n' +
        '• 📊 **Participar** en estadísticas del servidor\n\n' +
        '**¿Cómo funciona?**\n' +
        '1. Usa el comando `/tags setup` para configurar tus tags\n' +
        '2. Selecciona las categorías que te representen\n' +
        '3. ¡Disfruta de las conexiones que harás!\n\n' +
        '**Categorías disponibles:**'
      )
      .setColor(getEmbedColor())
      .setThumbnail('https://grivyzom.com/logo.png') // Ajusta la URL según tu logo
      .setFooter({ 
        text: 'Sistema de Tags • Grivyzom', 
        iconURL: 'https://grivyzom.com/favicon.ico' 
      })
      .setTimestamp();

    // Añadir las categorías como campos
    TAG_CATEGORIES.forEach(category => {
      const optionsPreview = category.options
        .slice(0, 3)
        .map(opt => `${opt.emoji || '•'} ${opt.label}`)
        .join(', ');
      
      const moreCount = category.options.length > 3 ? ` y ${category.options.length - 3} más` : '';
      
      mainEmbed.addFields({
        name: `${category.emoji} ${category.name}`,
        value: `${category.description}\n*Ej: ${optionsPreview}${moreCount}*`,
        inline: true
      });
    });

    // Crear botones de acción
    const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tags-setup-button')
          .setLabel('🏷️ Configurar mis Tags')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('tags-view-button')
          .setLabel('👀 Ver mis Tags')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('tags-help-button')
          .setLabel('❓ Ayuda')
          .setStyle(ButtonStyle.Secondary)
      );

    // Crear embed de ejemplos
    const exampleEmbed = new EmbedBuilder()
      .setTitle('💡 Ejemplos de Tags')
      .setDescription('Aquí algunos ejemplos de cómo se ven los tags configurados:')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: '🌎 País',
          value: '🇲🇽 México',
          inline: true
        },
        {
          name: '🎂 Edad',
          value: '🧒 16-18 años',
          inline: true
        },
        {
          name: '⛏️ Minecraft',
          value: '☕ Java Edition',
          inline: true
        },
        {
          name: '🎮 Juegos',
          value: '⛏️ Minecraft\n🌪️ Fortnite\n🎯 Valorant',
          inline: true
        },
        {
          name: '💻 Programación',
          value: '🟨 JavaScript\n🐍 Python',
          inline: true
        },
        {
          name: '🌟 Intereses',
          value: '🎮 Gaming\n🎨 Arte\n🎵 Música',
          inline: true
        }
      );

    // Embed de comandos
    const commandsEmbed = new EmbedBuilder()
      .setTitle('📝 Comandos Disponibles')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: '🏷️ Configuración',
          value: '`/tags setup` - Configura tus tags personales\n`/tags view` - Ver tus tags o los de otro usuario\n`/tags remove` - Eliminar un tag específico',
          inline: false
        },
        {
          name: '📊 Para Administradores',
          value: '`/tagsstats general` - Estadísticas generales\n`/tagsstats category` - Stats de una categoría\n`/tagsstats users` - Usuarios con tags específicos',
          inline: false
        }
      )
      .setFooter({ text: 'Los comandos se usan escribiendo / seguido del comando' });

    // Enviar los embeds
    await channel.send({ 
      embeds: [mainEmbed], 
      components: [buttonsRow] 
    });
    
    await channel.send({ embeds: [exampleEmbed] });
    await channel.send({ embeds: [commandsEmbed] });

    console.log('✅ Embed de tags publicado correctamente');

  } catch (error) {
    console.error('❌ Error al publicar embed de tags:', error);
  }
}

// Función para manejar las interacciones de los botones
export async function handleTagsButtonInteraction(interaction: any) {
  if (!interaction.isButton()) return;

  switch (interaction.customId) {
    case 'tags-setup-button':
      // Simular el comando /tags setup
      await interaction.reply({
        content: '🏷️ Usa el comando `/tags setup` para configurar tus tags.',
        ephemeral: true
      });
      break;

    case 'tags-view-button':
      // Simular el comando /tags view
      await interaction.reply({
        content: '👀 Usa el comando `/tags view` para ver tus tags actuales.',
        ephemeral: true
      });
      break;

    case 'tags-help-button':
      const helpEmbed = new EmbedBuilder()
        .setTitle('❓ Ayuda - Sistema de Tags')
        .setDescription(
          '**¿Qué son los tags?**\n' +
          'Los tags son etiquetas que puedes configurar para describir tus intereses, ubicación, edad, juegos favoritos y más.\n\n' +
          '**¿Para qué sirven?**\n' +
          '• Conectar con otros miembros similares\n' +
          '• Participar en eventos específicos\n' +
          '• Obtener roles automáticos\n' +
          '• Ser encontrado por otros con intereses similares\n\n' +
          '**¿Cómo configurarlos?**\n' +
          '1. Usa `/tags setup`\n' +
          '2. Selecciona una categoría\n' +
          '3. Elige tus opciones\n' +
          '4. ¡Listo!\n\n' +
          '**¿Puedo cambiarlos?**\n' +
          'Sí, puedes usar `/tags setup` nuevamente para actualizar cualquier categoría, o `/tags remove` para eliminar una específica.\n\n' +
          '**¿Son privados?**\n' +
          'Los tags son visibles para otros miembros del servidor cuando usan `/tags view`, pero solo se muestran las categorías que hayas configurado.'
        )
        .setColor(getEmbedColor())
        .setFooter({ text: '¿Más preguntas? Contacta al staff del servidor' });

      await interaction.reply({
        embeds: [helpEmbed],
        ephemeral: true
      });
      break;
  }
}