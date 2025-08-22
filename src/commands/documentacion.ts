// src/commands/documentacion.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';

export const data = new SlashCommandBuilder()
  .setName('documentacion')
  .setDescription('Accede a la documentación oficial del servidor')
  .addStringOption(option =>
    option
      .setName('seccion')
      .setDescription('Sección específica de la documentación')
      .setRequired(false)
      .addChoices(
        { name: '📋 Reglas del Servidor', value: 'reglas' },
        { name: '🛠️ Comandos', value: 'comandos' },
        { name: '💰 Economía', value: 'economia' },
        { name: '🏰 Protecciones', value: 'protecciones' },
        { name: '🎮 Modos de Juego', value: 'modos' },
        { name: '🏆 Rangos y Permisos', value: 'rangos' },
        { name: '🎪 Eventos', value: 'eventos' },
        { name: '🏪 Tienda', value: 'tienda' },
        { name: '🔧 Configuración', value: 'configuracion' },
        { name: '❓ FAQ', value: 'faq' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const seccion = interaction.options.getString('seccion');

  if (seccion) {
    // Mostrar sección específica
    await mostrarSeccion(interaction, seccion);
  } else {
    // Mostrar menú principal de documentación
    await mostrarMenuPrincipal(interaction);
  }
}

async function mostrarMenuPrincipal(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 Documentación Oficial de Grivyzom')
    .setDescription(
      '¡Bienvenido al centro de documentación oficial! 📖\n\n' +
      '**Aquí encontrarás toda la información que necesitas para:**\n' +
      '• Entender las reglas y normas del servidor\n' +
      '• Dominar todos los comandos disponibles\n' +
      '• Aprovechar al máximo el sistema económico\n' +
      '• Proteger tus construcciones correctamente\n' +
      '• Conocer los diferentes modos de juego\n' +
      '• Entender el sistema de rangos\n\n' +
      '**📋 Selecciona una sección para más información:**'
    )
    .setColor(getEmbedColor())
    .addFields(
      {
        name: '📋 Información Esencial',
        value: 
          '**📋 Reglas del Servidor** - Normas fundamentales\n' +
          '**🛠️ Comandos** - Lista completa de comandos\n' +
          '**❓ FAQ** - Preguntas frecuentes',
        inline: true
      },
      {
        name: '🎮 Sistemas de Juego',
        value: 
          '**💰 Economía** - Sistema económico\n' +
          '**🏰 Protecciones** - Claims y seguridad\n' +
          '**🎮 Modos de Juego** - Diferentes modalidades',
        inline: true
      },
      {
        name: '🏆 Avanzado',
        value: 
          '**🏆 Rangos y Permisos** - Sistema de rangos\n' +
          '**🎪 Eventos** - Eventos y competencias\n' +
          '**🏪 Tienda** - Compras y ventas\n' +
          '**🔧 Configuración** - Ajustes avanzados',
        inline: true
      }
    )
    .setThumbnail(interaction.guild?.iconURL() || null)
    .setImage('https://grivyzom.com/docs-banner.png')
    .setFooter({ 
      text: 'Documentación actualizada • Última revisión: Enero 2025',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  // Botones de acceso rápido
  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('📋 Reglas')
        .setStyle(ButtonStyle.Primary)
        .setCustomId('docs-reglas')
        .setEmoji('📋'),
      new ButtonBuilder()
        .setLabel('🛠️ Comandos')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-comandos')
        .setEmoji('🛠️'),
      new ButtonBuilder()
        .setLabel('💰 Economía')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-economia')
        .setEmoji('💰'),
      new ButtonBuilder()
        .setLabel('🏰 Protecciones')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-protecciones')
        .setEmoji('🏰')
    );

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🎮 Modos')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-modos')
        .setEmoji('🎮'),
      new ButtonBuilder()
        .setLabel('🏆 Rangos')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-rangos')
        .setEmoji('🏆'),
      new ButtonBuilder()
        .setLabel('❓ FAQ')
        .setStyle(ButtonStyle.Success)
        .setCustomId('docs-faq')
        .setEmoji('❓'),
      new ButtonBuilder()
        .setLabel('🌐 Web Oficial')
        .setStyle(ButtonStyle.Link)
        .setURL('https://grivyzom.com/docs')
        .setEmoji('🌐')
    );

  await interaction.reply({ 
    embeds: [embed], 
    components: [row1, row2]
  });
}

async function mostrarSeccion(interaction: ChatInputCommandInteraction, seccion: string) {
  const contenido = getContenidoSeccion(seccion);
  
  if (!contenido) {
    return await interaction.reply({
      content: '❌ Sección no encontrada.',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${contenido.emoji} ${contenido.titulo}`)
    .setDescription(contenido.descripcion)
    .setColor(getEmbedColor())
    .setTimestamp();

  // Añadir campos de contenido
  contenido.secciones.forEach(seccion => {
    embed.addFields({
      name: seccion.nombre,
      value: seccion.contenido,
      inline: seccion.inline || false
    });
  });

  // Enlaces relacionados si existen
  if (contenido.enlaces && contenido.enlaces.length > 0) {
    embed.addFields({
      name: '🔗 Enlaces Relacionados',
      value: contenido.enlaces.join('\n'),
      inline: false
    });
  }

  embed.setFooter({ 
    text: `Documentación: ${contenido.titulo} • Mantente informado`,
    iconURL: interaction.client.user?.displayAvatarURL()
  });

  // Botón para volver al menú principal
  const backButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('⬅️ Volver al Menú')
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('docs-menu')
        .setEmoji('⬅️')
    );

  await interaction.reply({ 
    embeds: [embed], 
    components: [backButton]
  });
}

function getContenidoSeccion(seccion: string) {
  const secciones: Record<string, any> = {
    reglas: {
      emoji: '📋',
      titulo: 'Reglas del Servidor',
      descripcion: '**Normas fundamentales para una convivencia armoniosa en Grivyzom** 🤝\n\nEstas reglas son de cumplimiento obligatorio para todos los miembros.',
      secciones: [
        {
          nombre: '🚫 Prohibiciones Generales',
          contenido: 
            '• **No spam** - Evita repetir mensajes o caracteres\n' +
            '• **No insultos** - Respeta a todos los miembros\n' +
            '• **No griefing** - No destruyas construcciones ajenas\n' +
            '• **No cheats/hacks** - Juego limpio solamente\n' +
            '• **No publicidad** - No promociones sin autorización'
        },
        {
          nombre: '✅ Conducta Esperada',
          contenido: 
            '• **Respeto mutuo** - Trata a otros como quieres ser tratado\n' +
            '• **Colaboración** - Ayuda a nuevos jugadores\n' +
            '• **Comunicación apropiada** - Usa los canales correctos\n' +
            '• **Juego limpio** - Sin aprovecharse de bugs\n' +
            '• **Seguir instrucciones** - Respeta las decisiones del staff'
        },
        {
          nombre: '⚖️ Sistema de Sanciones',
          contenido: 
            '**1. Advertencia** - Primera infracción leve\n' +
            '**2. Silencio temporal** - Reincidencia o infracción moderada\n' +
            '**3. Suspensión temporal** - Infracciones graves\n' +
            '**4. Baneo permanente** - Infracciones muy graves o reincidencia\n\n' +
            '🔄 *Las sanciones pueden apelarse mediante tickets*'
        }
      ],
      enlaces: [
        '📋 [Reglas Completas](https://grivyzom.com/reglas)',
        '📝 [Formulario de Apelación](https://grivyzom.com/apelacion)',
        '🎫 `/ticket` - Crear ticket de soporte'
      ]
    },
    comandos: {
      emoji: '🛠️',
      titulo: 'Comandos del Servidor',
      descripcion: '**Lista completa de comandos disponibles en Grivyzom** ⚡\n\nTodos los comandos están organizados por categoría para facilitar su uso.',
      secciones: [
        {
          nombre: '🏠 Comandos Básicos',
          contenido: 
            '`/spawn` - Ir al spawn principal\n' +
            '`/home` - Ir a tu casa\n' +
            '`/sethome [nombre]` - Establecer punto de casa\n' +
            '`/homes` - Lista de tus casas\n' +
            '`/delhome [nombre]` - Eliminar casa\n' +
            '`/warp [nombre]` - Ir a un warp público\n' +
            '`/warps` - Lista de warps disponibles'
        },
        {
          nombre: '💰 Comandos de Economía',
          contenido: 
            '`/money` o `/bal` - Ver tu dinero\n' +
            '`/pay [jugador] [cantidad]` - Enviar dinero\n' +
            '`/shop` - Abrir tienda principal\n' +
            '`/sell` - Vender items en tu mano\n' +
            '`/auction [precio]` - Subastar item\n' +
            '`/jobs` - Ver trabajos disponibles\n' +
            '`/jobs join [trabajo]` - Unirte a trabajo'
        },
        {
          nombre: '🏰 Comandos de Protección',
          contenido: 
            '`/claim` - Proteger área donde estás\n' +
            '`/trust [jugador]` - Dar permisos a jugador\n' +
            '`/untrust [jugador]` - Quitar permisos\n' +
            '`/claimlist` - Ver tus protecciones\n' +
            '`/abandonclaim` - Eliminar protección actual\n' +
            '`/claimexplosions` - Activar/desactivar explosiones'
        },
        {
          nombre: '👥 Comandos Sociales',
          contenido: 
            '`/msg [jugador] [mensaje]` - Mensaje privado\n' +
            '`/reply [mensaje]` - Responder último mensaje\n' +
            '`/ignore [jugador]` - Ignorar jugador\n' +
            '`/party create` - Crear grupo\n' +
            '`/party invite [jugador]` - Invitar al grupo\n' +
            '`/list` - Ver jugadores conectados'
        }
      ],
      enlaces: [
        '🛠️ [Comandos Completos](https://grivyzom.com/comandos)',
        '📚 `/tutoriales comandos` - Tutorial de comandos',
        '❓ `/help [comando]` - Ayuda específica'
      ]
    },
    economia: {
      emoji: '💰',
      titulo: 'Sistema Económico',
      descripcion: '**Cómo funciona la economía en Grivyzom** 💎\n\nNuestro sistema económico está diseñado para ser justo, equilibrado y divertido.',
      secciones: [
        {
          nombre: '💵 Moneda del Servidor',
          contenido: 
            '**Moneda:** Grivycoins (GC)\n' +
            '**Inicial:** Todos empiezan con 1000 GC\n' +
            '**Símbolo:** 💰 en el chat\n' +
            '**Decimales:** No se usan decimales'
        },
        {
          nombre: '💼 Formas de Ganar Dinero',
          contenido: 
            '**🔨 Trabajos** - Minero, Constructor, Granjero, etc.\n' +
            '**🏪 Comercio** - Comprar barato, vender caro\n' +
            '**🎯 Misiones** - Misiones diarias y semanales\n' +
            '**🏆 Eventos** - Participar en competencias\n' +
            '**💎 Venta de items** - Vender recursos valiosos\n' +
            '**🎰 Lotería** - Participar en sorteos'
        },
        {
          nombre: '🛒 Sistema de Tiendas',
          contenido: 
            '**🏪 Tienda Principal** - Items básicos y herramientas\n' +
            '**👤 Tiendas de Jugadores** - Comercio entre usuarios\n' +
            '**🎪 Tienda de Eventos** - Items especiales limitados\n' +
            '**💎 Tienda Premium** - Items exclusivos\n' +
            '**📦 Mercado de Subastas** - Subastas en tiempo real'
        }
      ],
      enlaces: [
        '💰 [Guía Económica Completa](https://grivyzom.com/economia)',
        '📊 [Precios del Mercado](https://grivyzom.com/precios)',
        '💼 `/jobs` - Ver trabajos disponibles'
      ]
    },
    protecciones: {
      emoji: '🏰',
      titulo: 'Sistema de Protecciones',
      descripcion: '**Protege tus construcciones con nuestro sistema de Claims** 🛡️\n\nMantén tus creaciones seguras de griefers y ladrones.',
      secciones: [
        {
          nombre: '🛡️ ¿Qué son las Protecciones?',
          contenido: 
            'Las protecciones (Claims) son áreas que puedes reclamar como tuyas.\n' +
            'En estas áreas:\n' +
            '• Solo tú puedes construir y destruir\n' +
            '• Puedes dar permisos a otros jugadores\n' +
            '• Están protegidas contra griefing\n' +
            '• Los cofres están seguros'
        },
        {
          nombre: '📏 Límites y Tamaños',
          contenido: 
            '**Miembros Nuevos:** 2 claims de 16x16\n' +
            '**Miembros:** 4 claims de 32x32\n' +
            '**Veteranos:** 6 claims de 64x64\n' +
            '**VIP:** 10 claims de 128x128\n' +
            '**Premium:** Claims ilimitados de 256x256'
        },
        {
          nombre: '👥 Sistema de Permisos',
          contenido: 
            '**Trust Básico:** Puede construir y usar\n' +
            '**Trust con Cofres:** Acceso a contenedores\n' +
            '**Trust Total:** Puede dar permisos a otros\n' +
            '**Manager:** Control total del claim\n\n' +
            '*Usa `/trust [jugador]` para dar permisos*'
        }
      ],
      enlaces: [
        '🏰 [Guía de Protecciones](https://grivyzom.com/claims)',
        '🛡️ [Tutorial en Video](https://grivyzom.com/video-claims)',
        '❓ `/claim` - Crear protección'
      ]
    },
    faq: {
      emoji: '❓',
      titulo: 'Preguntas Frecuentes',
      descripcion: '**Las dudas más comunes de nuestros jugadores** 🤔\n\nAquí están las respuestas a las preguntas que más nos hacen.',
      secciones: [
        {
          nombre: '🎮 Conexión y Acceso',
          contenido: 
            '**P: ¿Cómo me conecto al servidor?**\n' +
            'R: IP `play.grivyzom.com` para Java, `bedrock.grivyzom.com:21384` para Bedrock\n\n' +
            '**P: ¿Qué versiones son compatibles?**\n' +
            'R: Java 1.20.1+ y Bedrock actual\n\n' +
            '**P: ¿Es gratis jugar?**\n' +
            'R: Sí, totalmente gratuito con compras opcionales'
        },
        {
          nombre: '🔧 Problemas Técnicos',
          contenido: 
            '**P: No puedo construir en ningún lado**\n' +
            'R: Necesitas crear un claim con `/claim`\n\n' +
            '**P: Perdí mis items**\n' +
            'R: Crea un ticket, podemos ayudarte a recuperarlos\n\n' +
            '**P: El servidor está lagueado**\n' +
            'R: Reporta en Discord, revisamos inmediatamente'
        },
        {
          nombre: '💰 Economía y Tiendas',
          contenido: 
            '**P: ¿Cómo gano dinero rápido?**\n' +
            'R: Únete a trabajos con `/jobs` y participa en eventos\n\n' +
            '**P: ¿Puedo vender mis items?**\n' +
            'R: Sí, usa `/sell` o crea tu tienda\n\n' +
            '**P: ¿Hay mercado de jugadores?**\n' +
            'R: Sí, tiendas de jugadores y sistema de subastas'
        }
      ],
      enlaces: [
        '❓ [FAQ Completo](https://grivyzom.com/faq)',
        '🎫 `/ticket` - Crear ticket de soporte',
        '💬 [Discord de Soporte](https://discord.gg/grivyzom)'
      ]
    }
  };

  return secciones[seccion] || null;
}

export default { data, execute };