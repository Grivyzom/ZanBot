// src/commands/tutoriales.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('tutoriales')
  .setDescription('Accede a tutoriales y guías del servidor')
  .addStringOption(option =>
    option
      .setName('categoria')
      .setDescription('Categoría de tutorial específica (opcional)')
      .setRequired(false)
      .addChoices(
        { name: '🎮 Minecraft Básico', value: 'minecraft_basico' },
        { name: '⚔️ PvP y Combate', value: 'pvp' },
        { name: '🏗️ Construcción', value: 'construccion' },
        { name: '⛏️ Minería y Recursos', value: 'mineria' },
        { name: '🌾 Agricultura y Ganadería', value: 'agricultura' },
        { name: '🔴 Redstone', value: 'redstone' },
        { name: '🏰 Servidores y Multijugador', value: 'servidores' },
        { name: '🛠️ Comandos del Servidor', value: 'comandos' },
        { name: '📱 Bedrock Edition', value: 'bedrock' },
        { name: '☕ Java Edition', value: 'java' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const categoria = interaction.options.getString('categoria');

  if (categoria) {
    // Mostrar tutoriales de una categoría específica
    await mostrarCategoria(interaction, categoria);
  } else {
    // Mostrar menú principal de tutoriales
    await mostrarMenuPrincipal(interaction);
  }
}

async function mostrarMenuPrincipal(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 Centro de Tutoriales y Guías')
    .setDescription(
      '¡Bienvenido al centro de aprendizaje de **Grivyzom**! 🎉\n\n' +
      '**¿Nuevo en Minecraft o en nuestro servidor?** No te preocupes, tenemos todo lo que necesitas para empezar y convertirte en un experto.\n\n' +
      '**📖 ¿Qué encontrarás aquí?**\n' +
      '• Tutoriales paso a paso para principiantes\n' +
      '• Guías avanzadas para veteranos\n' +
      '• Tips y trucos exclusivos del servidor\n' +
      '• Estrategias de juego y optimización\n' +
      '• Comandos y funciones especiales\n\n' +
      '**🎯 Selecciona una categoría del menú para comenzar:**'
    )
    .setColor(getEmbedColor())
    .addFields(
      {
        name: '🎮 Para Principiantes',
        value: '• **Minecraft Básico** - Aprende lo fundamental\n• **Comandos del Servidor** - Domina nuestras funciones\n• **Java/Bedrock** - Guías específicas por plataforma',
        inline: true
      },
      {
        name: '⚔️ Para Jugadores Intermedios',
        value: '• **PvP y Combate** - Mejora en batallas\n• **Construcción** - Técnicas y estilos\n• **Minería** - Estrategias eficientes',
        inline: true
      },
      {
        name: '🔴 Para Expertos',
        value: '• **Redstone** - Circuitos complejos\n• **Agricultura** - Granjas automáticas\n• **Servidores** - Configuración avanzada',
        inline: true
      }
    )
    .setThumbnail(interaction.guild?.iconURL() || null)
    .setFooter({ 
      text: '💡 Tip: También puedes usar /tutoriales [categoría] para acceso directo',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  // Crear menú de selección
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('tutorial-category-select')
    .setPlaceholder('📚 Selecciona una categoría de tutoriales...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🎮 Minecraft Básico')
        .setDescription('Fundamentos y mecánicas básicas del juego')
        .setValue('minecraft_basico')
        .setEmoji('🎮'),
      new StringSelectMenuOptionBuilder()
        .setLabel('⚔️ PvP y Combate')
        .setDescription('Estrategias de combate y batallas')
        .setValue('pvp')
        .setEmoji('⚔️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🏗️ Construcción')
        .setDescription('Técnicas de construcción y arquitectura')
        .setValue('construccion')
        .setEmoji('🏗️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('⛏️ Minería y Recursos')
        .setDescription('Guías de minería y recolección eficiente')
        .setValue('mineria')
        .setEmoji('⛏️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🌾 Agricultura y Ganadería')
        .setDescription('Granjas y automatización agrícola')
        .setValue('agricultura')
        .setEmoji('🌾'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🔴 Redstone')
        .setDescription('Circuitos y mecanismos de redstone')
        .setValue('redstone')
        .setEmoji('🔴'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🏰 Servidores y Multijugador')
        .setDescription('Configuración y juego en servidor')
        .setValue('servidores')
        .setEmoji('🏰'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🛠️ Comandos del Servidor')
        .setDescription('Comandos específicos de Grivyzom')
        .setValue('comandos')
        .setEmoji('🛠️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📱 Bedrock Edition')
        .setDescription('Guías específicas para Bedrock')
        .setValue('bedrock')
        .setEmoji('📱'),
      new StringSelectMenuOptionBuilder()
        .setLabel('☕ Java Edition')
        .setDescription('Guías específicas para Java')
        .setValue('java')
        .setEmoji('☕')
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({ 
    embeds: [embed], 
    components: [row],
    ephemeral: false
  });
}

async function mostrarCategoria(interaction: ChatInputCommandInteraction, categoria: string) {
  const tutoriales = getTutorialesPorCategoria(categoria);
  
  if (!tutoriales) {
    return await interaction.reply({
      content: '❌ Categoría no encontrada.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${tutoriales.emoji} ${tutoriales.nombre}`)
    .setDescription(tutoriales.descripcion)
    .setColor(getEmbedColor())
    .setThumbnail('https://grivyzom.com/tutorial-icon.png')
    .setTimestamp();

  // Añadir tutoriales como campos
  tutoriales.items.forEach((tutorial: any, index: number) => {
    embed.addFields({
      name: `${index + 1}. ${tutorial.titulo}`,
      value: `${tutorial.descripcion}\n${tutorial.enlace ? `🔗 [Ver Tutorial](${tutorial.enlace})` : '📝 Disponible próximamente'}`,
      inline: false
    });
  });

  embed.setFooter({ 
    text: `${tutoriales.items.length} tutoriales disponibles • Actualizado regularmente`,
    iconURL: interaction.client.user?.displayAvatarURL()
  });

  await interaction.reply({ embeds: [embed] });
}

function getTutorialesPorCategoria(categoria: string) {
  const categorias: Record<string, any> = {
    minecraft_basico: {
      emoji: '🎮',
      nombre: 'Minecraft Básico',
      descripcion: 'Aprende los fundamentos de Minecraft desde cero. Perfectos para nuevos jugadores que quieren dominar las mecánicas básicas del juego.',
      items: [
        {
          titulo: 'Primeros Pasos en Minecraft',
          descripcion: 'Controles básicos, interfaz y supervivencia inicial',
          enlace: 'https://grivyzom.com/tutoriales/primeros-pasos'
        },
        {
          titulo: 'Crafting y Recetas Esenciales',
          descripcion: 'Las recetas más importantes que debes conocer',
          enlace: 'https://grivyzom.com/tutoriales/crafting-basico'
        },
        {
          titulo: 'Construcción de tu Primera Casa',
          descripcion: 'Cómo construir un refugio seguro y funcional',
          enlace: 'https://grivyzom.com/tutoriales/primera-casa'
        },
        {
          titulo: 'Gestión de Inventario',
          descripcion: 'Organiza y optimiza tu inventario eficientemente',
          enlace: null
        },
        {
          titulo: 'Enchanting para Principiantes',
          descripcion: 'Introducción a los encantamientos básicos',
          enlace: null
        }
      ]
    },
    pvp: {
      emoji: '⚔️',
      nombre: 'PvP y Combate',
      descripcion: 'Domina el arte del combate en Minecraft. Estrategias, técnicas y consejos para mejorar en batallas PvP.',
      items: [
        {
          titulo: 'Fundamentos del Combate',
          descripcion: 'Mecánicas básicas de ataque, defensa y movimiento',
          enlace: 'https://grivyzom.com/tutoriales/combate-basico'
        },
        {
          titulo: 'Estrategias de PvP 1v1',
          descripcion: 'Técnicas para duelos individuales',
          enlace: null
        },
        {
          titulo: 'Combate en Grupo',
          descripcion: 'Tácticas para batallas masivas y coordinación',
          enlace: null
        },
        {
          titulo: 'Uso Avanzado de Pociones',
          descripción: 'Pociones de combate y timing perfecto',
          enlace: null
        }
      ]
    },
    construccion: {
      emoji: '🏗️',
      nombre: 'Construcción y Arquitectura',
      descripcion: 'Eleva tus habilidades de construcción. Desde técnicas básicas hasta arquitectura avanzada.',
      items: [
        {
          titulo: 'Principios de Diseño',
          descripcion: 'Conceptos básicos de arquitectura en Minecraft',
          enlace: null
        },
        {
          titulo: 'Técnicas de Terraformado',
          descripcion: 'Modifica el terreno para tus construcciones',
          enlace: null
        },
        {
          titulo: 'Construcciones Medievales',
          descripcion: 'Castillos, torres y estructuras medievales',
          enlace: null
        },
        {
          titulo: 'Arquitectura Moderna',
          descripcion: 'Diseños contemporáneos y minimalistas',
          enlace: null
        }
      ]
    },
    mineria: {
      emoji: '⛏️',
      nombre: 'Minería y Recursos',
      descripcion: 'Optimiza tu recolección de recursos. Técnicas avanzadas de minería y gestión de materiales.',
      items: [
        {
          titulo: 'Minería Eficiente',
          descripcion: 'Estrategias para maximizar tu recolección',
          enlace: null
        },
        {
          titulo: 'Localización de Diamantes',
          descripcion: 'Mejores métodos para encontrar diamantes',
          enlace: null
        },
        {
          titulo: 'Minas Automáticas',
          descripcion: 'Sistemas automatizados de minería',
          enlace: null
        }
      ]
    },
    agricultura: {
      emoji: '🌾',
      nombre: 'Agricultura y Ganadería',
      descripcion: 'Crea granjas eficientes y automatizadas. Desde cultivos básicos hasta sistemas complejos.',
      items: [
        {
          titulo: 'Granjas Básicas de Cultivos',
          descripcion: 'Trigo, zanahorias, patatas y más',
          enlace: null
        },
        {
          titulo: 'Ganadería y Cría de Animales',
          descripcion: 'Optimiza la reproducción animal',
          enlace: null
        },
        {
          titulo: 'Granjas Automáticas',
          descripcion: 'Sistemas de farming automatizado',
          enlace: null
        }
      ]
    },
    redstone: {
      emoji: '🔴',
      nombre: 'Redstone y Mecanismos',
      descripcion: 'Domina la redstone desde circuitos básicos hasta contrapciones complejas.',
      items: [
        {
          titulo: 'Fundamentos de Redstone',
          descripcion: 'Señales, retrasos y componentes básicos',
          enlace: null
        },
        {
          titulo: 'Circuitos Lógicos',
          descripcion: 'Puertas AND, OR, NOT y combinaciones',
          enlace: null
        },
        {
          titulo: 'Máquinas Complejas',
          descripcion: 'Ascensores, puertas automáticas y más',
          enlace: null
        }
      ]
    },
    servidores: {
      emoji: '🏰',
      nombre: 'Servidores y Multijugador',
      descripcion: 'Todo sobre jugar en servidores multijugador y aprovechar al máximo Grivyzom.',
      items: [
        {
          titulo: 'Reglas del Servidor',
          descripcion: 'Normas esenciales de Grivyzom',
          enlace: 'https://grivyzom.com/reglas'
        },
        {
          titulo: 'Protección de Terrenos',
          descripcion: 'Cómo proteger tus construcciones',
          enlace: null
        },
        {
          titulo: 'Economía del Servidor',
          descripcion: 'Sistema económico y comercio',
          enlace: null
        }
      ]
    },
    comandos: {
      emoji: '🛠️',
      nombre: 'Comandos del Servidor',
      descripcion: 'Domina todos los comandos específicos de Grivyzom para aprovechar todas las funciones.',
      items: [
        {
          titulo: 'Comandos Básicos',
          descripcion: '/spawn, /home, /sethome y navegación',
          enlace: null
        },
        {
          titulo: 'Sistema de Economía',
          descripcion: '/shop, /sell, /money y transacciones',
          enlace: null
        },
        {
          titulo: 'Comandos Sociales',
          descripcion: '/msg, /party, /guild y comunicación',
          enlace: null
        },
        {
          titulo: 'Protecciones y Claims',
          descripcion: '/claim, /trust y gestión de terrenos',
          enlace: null
        }
      ]
    },
    bedrock: {
      emoji: '📱',
      nombre: 'Bedrock Edition',
      descripcion: 'Guías específicas para jugadores de Minecraft Bedrock Edition (móvil, consolas).',
      items: [
        {
          titulo: 'Conexión a Grivyzom',
          descripcion: 'Cómo conectarte desde Bedrock',
          enlace: 'https://grivyzom.com/bedrock-connection'
        },
        {
          titulo: 'Diferencias con Java',
          descripcion: 'Qué cambia entre las dos versiones',
          enlace: null
        },
        {
          titulo: 'Controles Optimizados',
          descripcion: 'Configuración ideal para móviles/consolas',
          enlace: null
        }
      ]
    },
    java: {
      emoji: '☕',
      nombre: 'Java Edition',
      descripcion: 'Guías específicas para jugadores de Minecraft Java Edition (PC).',
      items: [
        {
          titulo: 'Conexión a Grivyzom',
          descripcion: 'Configuración inicial para Java',
          enlace: 'https://grivyzom.com/java-connection'
        },
        {
          titulo: 'Mods Recomendados',
          descripcion: 'Mods permitidos que mejoran la experiencia',
          enlace: null
        },
        {
          titulo: 'Optimización de Rendimiento',
          descripcion: 'Mejora tu FPS y fluidez',
          enlace: null
        }
      ]
    }
  };

  return categorias[categoria] || null;
}

export default { data, execute };