// src/commands/wiki.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('wiki')
  .setDescription('Busca información en la wiki de Minecraft')
  .addStringOption(option =>
    option
      .setName('termino')
      .setDescription('Término a buscar en la wiki')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('idioma')
      .setDescription('Idioma de la wiki (por defecto español)')
      .setRequired(false)
      .addChoices(
        { name: '🇪🇸 Español', value: 'es' },
        { name: '🇺🇸 English', value: 'en' },
        { name: '🇫🇷 Français', value: 'fr' },
        { name: '🇩🇪 Deutsch', value: 'de' },
        { name: '🇧🇷 Português', value: 'pt' },
        { name: '🇯🇵 日本語', value: 'ja' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const termino = interaction.options.getString('termino', true);
  const idioma = interaction.options.getString('idioma') || 'es';

  await interaction.deferReply();

  try {
    // Formatear el término para la URL
    const terminoFormateado = termino.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_');

    // Construir URL de la wiki según el idioma
    let wikiUrl: string;
    let wikiName: string;
    
    switch (idioma) {
      case 'en':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}`;
        wikiName = 'Minecraft Wiki (English)';
        break;
      case 'es':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=es`;
        wikiName = 'Minecraft Wiki (Español)';
        break;
      case 'fr':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=fr`;
        wikiName = 'Minecraft Wiki (Français)';
        break;
      case 'de':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=de`;
        wikiName = 'Minecraft Wiki (Deutsch)';
        break;
      case 'pt':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=pt-br`;
        wikiName = 'Minecraft Wiki (Português)';
        break;
      case 'ja':
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=ja`;
        wikiName = 'Minecraft Wiki (日本語)';
        break;
      default:
        wikiUrl = `https://minecraft.wiki/w/${terminoFormateado}?uselang=es`;
        wikiName = 'Minecraft Wiki (Español)';
    }

    // Información específica sobre elementos comunes de Minecraft
    const infoEspecifica = getInfoEspecifica(termino.toLowerCase());

    const embed = new EmbedBuilder()
      .setTitle(`📖 Wiki: ${termino}`)
      .setDescription(
        `🔍 **Información sobre:** \`${termino}\`\n\n` +
        (infoEspecifica ? `**Resumen rápido:**\n${infoEspecifica}\n\n` : '') +
        `📚 **Para información completa y detallada:**\n` +
        `🔗 [Ver en ${wikiName}](${wikiUrl})\n\n` +
        `💡 **Tip:** La wiki oficial contiene información actualizada sobre mecánicas, recetas, estadísticas y mucho más.`
      )
      .setColor(getEmbedColor())
      .addFields(
        {
          name: '🌍 Wikis Disponibles',
          value: 
            '🇪🇸 Español • 🇺🇸 English • 🇫🇷 Français\n' +
            '🇩🇪 Deutsch • 🇧🇷 Português • 🇯🇵 日本語',
          inline: true
        },
        {
          name: '🔧 Recursos Adicionales',
          value: 
            '📋 [Minecraft Wiki](https://minecraft.wiki)\n' +
            '🛠️ [Crafting Recipes](https://minecraft.wiki/w/Crafting)\n' +
            '⚔️ [Combat](https://minecraft.wiki/w/Combat)',
          inline: true
        }
      )
      .setThumbnail('https://static.wikia.nocookie.net/minecraft_gamepedia/images/2/2d/Plains_Grass_Block.png')
      .setFooter({ 
        text: `Wiki búsqueda: ${termino} • Usa /tutoriales para guías específicas del servidor`,
        iconURL: interaction.client.user?.displayAvatarURL()
      })
      .setTimestamp();

    // Añadir comandos relacionados si aplica
    const comandosRelacionados = getComandosRelacionados(termino.toLowerCase());
    if (comandosRelacionados.length > 0) {
      embed.addFields({
        name: '🎮 Comandos Relacionados en el Servidor',
        value: comandosRelacionados.join('\n'),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error en comando wiki:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error en la búsqueda')
      .setDescription(
        `No se pudo procesar la búsqueda para: \`${termino}\`\n\n` +
        `**Alternativas:**\n` +
        `• Intenta con un término más específico\n` +
        `• Usa términos en inglés (ej: "diamond" en lugar de "diamante")\n` +
        `• Revisa la ortografía\n\n` +
        `🔗 [Buscar manualmente en la wiki](https://minecraft.wiki)`
      )
      .setColor('#ff0000')
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

function getInfoEspecifica(termino: string): string | null {
  const info: Record<string, string> = {
    'diamond': '💎 Mineral más valioso, necesario para herramientas tier superior',
    'diamante': '💎 Mineral más valioso, necesario para herramientas tier superior',
    'iron': '⚒️ Metal versátil, base para muchas herramientas y armaduras',
    'hierro': '⚒️ Metal versátil, base para muchas herramientas y armaduras',
    'redstone': '🔴 Mineral que permite crear circuitos y mecanismos',
    'netherite': '🔥 El material más fuerte, mejora de diamante',
    'netherita': '🔥 El material más fuerte, mejora de diamante',
    'creeper': '💥 Mob hostil que explota al acercarse al jugador',
    'enderdragon': '🐉 Jefe final del End, objetivo principal del juego',
    'ender dragon': '🐉 Jefe final del End, objetivo principal del juego',
    'wither': '💀 Jefe invocado, extremadamente peligroso',
    'enchanting': '✨ Sistema para mejorar herramientas y armaduras',
    'encantamiento': '✨ Sistema para mejorar herramientas y armaduras',
    'brewing': '🧪 Creación de pociones con efectos especiales',
    'pociones': '🧪 Creación de pociones con efectos especiales'
  };

  return info[termino] || null;
}

function getComandosRelacionados(termino: string): string[] {
  const comandos: Record<string, string[]> = {
    'home': ['`/sethome` - Establecer punto de hogar', '`/home` - Viajar a casa'],
    'casa': ['`/sethome` - Establecer punto de hogar', '`/home` - Viajar a casa'],
    'teleport': ['`/spawn` - Viajar al spawn', '`/home` - Ir a casa'],
    'teletransporte': ['`/spawn` - Viajar al spawn', '`/home` - Ir a casa'],
    'money': ['`/money` - Ver tu dinero', '`/shop` - Tienda del servidor'],
    'dinero': ['`/money` - Ver tu dinero', '`/shop` - Tienda del servidor'],
    'claim': ['`/claim` - Proteger terreno', '`/trust` - Dar permisos'],
    'proteger': ['`/claim` - Proteger terreno', '`/trust` - Dar permisos'],
    'pvp': ['`/pvp` - Activar/desactivar PvP', '`/arena` - Ir a zona PvP'],
    'shop': ['`/shop` - Abrir tienda', '`/sell` - Vender items'],
    'tienda': ['`/shop` - Abrir tienda', '`/sell` - Vender items']
  };

  return comandos[termino] || [];
}

export default { data, execute };