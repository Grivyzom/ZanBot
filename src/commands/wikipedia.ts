// src/commands/wikipedia.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('wikipedia')
  .setDescription('Busca información en Wikipedia')
  .addStringOption(option =>
    option
      .setName('termino')
      .setDescription('Término a buscar en Wikipedia')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('idioma')
      .setDescription('Idioma de Wikipedia (por defecto español)')
      .setRequired(false)
      .addChoices(
        { name: '🇪🇸 Español', value: 'es' },
        { name: '🇺🇸 English', value: 'en' },
        { name: '🇫🇷 Français', value: 'fr' },
        { name: '🇩🇪 Deutsch', value: 'de' },
        { name: '🇮🇹 Italiano', value: 'it' },
        { name: '🇧🇷 Português', value: 'pt' },
        { name: '🇯🇵 日本語', value: 'ja' },
        { name: '🇷🇺 Русский', value: 'ru' },
        { name: '🇨🇳 中文', value: 'zh' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const termino = interaction.options.getString('termino', true);
  const idioma = interaction.options.getString('idioma') || 'es';

  await interaction.deferReply();

  try {
    // Formatear el término para la URL de Wikipedia
    const terminoFormateado = encodeURIComponent(termino.trim());
    
    // Construir URL de Wikipedia según el idioma
    const wikipediaUrl = `https://${idioma}.wikipedia.org/wiki/${terminoFormateado}`;
    const searchUrl = `https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&titles=${terminoFormateado}&prop=extracts&exintro&explaintext&exsectionformat=plain`;

    // Información del idioma seleccionado
    const idiomaInfo = getIdiomaInfo(idioma);

    const embed = new EmbedBuilder()
      .setTitle(`📚 Wikipedia: ${termino}`)
      .setDescription(
        `🔍 **Búsqueda en Wikipedia ${idiomaInfo.flag}**\n\n` +
        `**Término:** \`${termino}\`\n` +
        `**Idioma:** ${idiomaInfo.nombre}\n\n` +
        `📖 **Enlace directo:**\n` +
        `🔗 [Ver artículo completo en Wikipedia](${wikipediaUrl})\n\n` +
        `💡 **¿No encontraste lo que buscabas?**\n` +
        `• Prueba con términos más específicos\n` +
        `• Cambia el idioma de búsqueda\n` +
        `• Usa sinónimos o términos alternativos\n\n` +
        `🎮 **Para información específica de Minecraft:** Usa \`/wiki [término]\``
      )
      .setColor(getEmbedColor())
      .addFields(
        {
          name: '🌍 Idiomas Disponibles',
          value: 
            '🇪🇸 Español • 🇺🇸 English • 🇫🇷 Français\n' +
            '🇩🇪 Deutsch • 🇮🇹 Italiano • 🇧🇷 Português\n' +
            '🇯🇵 日本語 • 🇷🇺 Русский • 🇨🇳 中文',
          inline: false
        },
        {
          name: '🔧 Comandos Relacionados',
          value: 
            '📖 `/wiki [término]` - Wiki de Minecraft\n' +
            '📚 `/tutoriales` - Guías del servidor\n' +
            '📋 `/documentacion` - Docs del servidor',
          inline: false
        },
        {
          name: '💡 Tips de Búsqueda',
          value: 
            '• Usa términos específicos para mejores resultados\n' +
            '• Prueba diferentes idiomas si no encuentras info\n' +
            '• Para temas técnicos, prueba en inglés\n' +
            '• Para cultura local, usa el idioma correspondiente',
          inline: false
        }
      )
      .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg')
      .setFooter({ 
        text: `Wikipedia ${idiomaInfo.nombre} • Conocimiento libre para todos`,
        iconURL: interaction.client.user?.displayAvatarURL()
      })
      .setTimestamp();

    // Añadir enlaces útiles según el tipo de búsqueda
    const enlacesEspeciales = getEnlacesEspeciales(termino.toLowerCase(), idioma);
    if (enlacesEspeciales.length > 0) {
      embed.addFields({
        name: '🔗 Enlaces Relacionados',
        value: enlacesEspeciales.join('\n'),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error en comando wikipedia:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en la búsqueda')
      .setDescription(
        `No se pudo procesar la búsqueda para: \`${termino}\`\n\n` +
        `**¿Qué puedes hacer?**\n` +
        `• Verifica la ortografía del término\n` +
        `• Intenta con sinónimos o términos relacionados\n` +
        `• Cambia el idioma de búsqueda\n` +
        `• Simplifica el término de búsqueda\n\n` +
        `🔗 [Ir directamente a Wikipedia](https://wikipedia.org)`
      )
      .setColor('#ff0000')
      .addFields({
        name: '🆘 Alternativas',
        value: 
          '📖 `/wiki [término]` - Para información de Minecraft\n' +
          '📚 `/tutoriales` - Guías y tutoriales\n' +
          '🔍 Buscar manualmente en [Wikipedia](https://wikipedia.org)',
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

function getIdiomaInfo(idioma: string): { nombre: string; flag: string } {
  const idiomas: Record<string, { nombre: string; flag: string }> = {
    'es': { nombre: 'Español', flag: '🇪🇸' },
    'en': { nombre: 'English', flag: '🇺🇸' },
    'fr': { nombre: 'Français', flag: '🇫🇷' },
    'de': { nombre: 'Deutsch', flag: '🇩🇪' },
    'it': { nombre: 'Italiano', flag: '🇮🇹' },
    'pt': { nombre: 'Português', flag: '🇧🇷' },
    'ja': { nombre: '日本語', flag: '🇯🇵' },
    'ru': { nombre: 'Русский', flag: '🇷🇺' },
    'zh': { nombre: '中文', flag: '🇨🇳' }
  };

  return idiomas[idioma] || { nombre: 'Español', flag: '🇪🇸' };
}

function getEnlacesEspeciales(termino: string, idioma: string): string[] {
  const enlaces: string[] = [];
  
  // Enlaces específicos según el término
  const terminosEspeciales: Record<string, string[]> = {
    'minecraft': [
      `🎮 [Historia de Minecraft](https://${idioma}.wikipedia.org/wiki/Minecraft)`,
      `👨‍💻 [Markus Persson](https://${idioma}.wikipedia.org/wiki/Markus_Persson)`,
      `🏢 [Mojang Studios](https://${idioma}.wikipedia.org/wiki/Mojang_Studios)`
    ],
    'programming': [
      `💻 [Programación](https://${idioma}.wikipedia.org/wiki/Programación)`,
      `🔧 [Lenguajes de programación](https://${idioma}.wikipedia.org/wiki/Lenguaje_de_programación)`
    ],
    'programacion': [
      `💻 [Programación](https://${idioma}.wikipedia.org/wiki/Programación)`,
      `🔧 [Lenguajes de programación](https://${idioma}.wikipedia.org/wiki/Lenguaje_de_programación)`
    ],
    'java': [
      `☕ [Lenguaje Java](https://${idioma}.wikipedia.org/wiki/Java_(lenguaje_de_programación))`,
      `🏢 [Oracle Corporation](https://${idioma}.wikipedia.org/wiki/Oracle_Corporation)`
    ],
    'discord': [
      `💬 [Discord](https://${idioma}.wikipedia.org/wiki/Discord)`,
      `🎮 [Comunicación en gaming](https://${idioma}.wikipedia.org/wiki/Comunicación_en_videojuegos)`
    ]
  };

  // Buscar enlaces específicos
  for (const [key, links] of Object.entries(terminosEspeciales)) {
    if (termino.includes(key)) {
      enlaces.push(...links);
      break;
    }
  }

  return enlaces;
}

export default { data, execute };