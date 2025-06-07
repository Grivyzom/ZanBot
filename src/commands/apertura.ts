// src/commands/apertura.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel, ChannelType } from 'discord.js';
import { requireRole } from '../utils/requireRole';
import dotenv from 'dotenv';
dotenv.config();

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID!;

export const data = new SlashCommandBuilder()
  .setName('apertura')
  .setDescription('Anuncia la apertura/reapertura de un servidor con notas de actualización')
  .addStringOption(option =>
    option
      .setName('servidor')
      .setDescription('Nombre del servidor que abre o reabre')
      .setRequired(true)
      .addChoices(
        { name: 'Servidor Principal (Java)', value: 'java' },
        { name: 'Servidor Bedrock', value: 'bedrock' },
        { name: 'Servidor Creativo', value: 'creativo' },
        { name: 'Servidor Survival', value: 'survival' },
        { name: 'Servidor Skyblock', value: 'skyblock' },
        { name: 'Servidor Prison', value: 'prison' },
        { name: 'Todos los Servidores', value: 'todos' }
      )
  )
  .addStringOption(option =>
    option
      .setName('hora_apertura')
      .setDescription('Hora de apertura (formato: HH:MM)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('fecha')
      .setDescription('Fecha de apertura (formato: DD/MM/YYYY)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('version')
      .setDescription('Versión del servidor o actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas1')
      .setDescription('Primera nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas2')
      .setDescription('Segunda nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas3')
      .setDescription('Tercera nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas4')
      .setDescription('Cuarta nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas5')
      .setDescription('Quinta nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas6')
      .setDescription('Sexta nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas7')
      .setDescription('Séptima nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas8')
      .setDescription('Octava nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas9')
      .setDescription('Novena nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('notas10')
      .setDescription('Décima nota de actualización')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('detalles')
      .setDescription('Detalles adicionales sobre la apertura')
      .setRequired(false)
  )
  .addChannelOption(option =>
    option
      .setName('canal')
      .setDescription('Canal donde enviar el anuncio de apertura')
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption(option =>
    option
      .setName('mencion')
      .setDescription('Tipo de mención a enviar (opcional)')
      .setRequired(false)
      .addChoices(
        { name: '@everyone - Mencionar a todos', value: 'everyone' },
        { name: '@here - Mencionar solo usuarios activos', value: 'here' },
        { name: 'Sin mención', value: 'none' }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar permisos de staff
  if (!(await requireRole(STAFF_ROLE_ID)(interaction))) return;

  const servidor = interaction.options.getString('servidor', true);
  const horaApertura = interaction.options.getString('hora_apertura', true);
  const fecha = interaction.options.getString('fecha') || 'Hoy';
  const version = interaction.options.getString('version');
  const detalles = interaction.options.getString('detalles');
  const canalOpcion = interaction.options.getChannel('canal');
  const mencionTipo = interaction.options.getString('mencion') || 'none';

  // Recopilar todas las notas de actualización
  const notasDeActualizacion: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const nota = interaction.options.getString(`notas${i}`);
    if (nota) {
      notasDeActualizacion.push(nota);
    }
  }

  // Validar formato de hora
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(horaApertura)) {
    return await interaction.reply({
      content: '❌ **Error:** El formato de hora debe ser HH:MM (ejemplo: 14:30)',
      ephemeral: true
    });
  }

  // Validar formato de fecha si se proporciona
  if (fecha !== 'Hoy') {
    const dateRegex = /^([0-2]?[0-9]|3[0-1])\/([0-1]?[0-9])\/(\d{4})$/;
    if (!dateRegex.test(fecha)) {
      return await interaction.reply({
        content: '❌ **Error:** El formato de fecha debe ser DD/MM/YYYY (ejemplo: 25/12/2024)',
        ephemeral: true
      });
    }
  }

  // Determinar el canal de destino
  let canalDestino: TextChannel;
  
  if (canalOpcion) {
    if (canalOpcion.type !== ChannelType.GuildText) {
      return await interaction.reply({
        content: '❌ **Error:** El canal seleccionado debe ser un canal de texto.',
        ephemeral: true
      });
    }
    canalDestino = canalOpcion as TextChannel;
  } else {
    if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      return await interaction.reply({
        content: '❌ **Error:** Debes especificar un canal de texto válido.',
        ephemeral: true
      });
    }
    canalDestino = interaction.channel as TextChannel;
  }

  // Verificar permisos del bot en el canal de destino
  const botMember = interaction.guild?.members.me;
  if (!botMember?.permissionsIn(canalDestino).has(['SendMessages', 'EmbedLinks'])) {
    return await interaction.reply({
      content: `❌ **Error:** No tengo permisos para enviar mensajes o embeds en ${canalDestino}.`,
      ephemeral: true
    });
  }

  // Obtener información del servidor
  const servidorInfo = getServerInfo(servidor);
  
  // Crear embed de apertura
  const embed = new EmbedBuilder()
    .setColor('#00FF00') // Color verde para la barra lateral
    .setTitle('🎉 ¡SERVIDOR ABIERTO!')
    .setAuthor({
      name: interaction.guild?.name || 'Grivyzom Network',
      iconURL: interaction.guild?.iconURL() ?? undefined
    })
    .setDescription(
      `**${servidorInfo.emoji} ${servidorInfo.nombre}** está ahora **DISPONIBLE** para todos los jugadores.\n\n` +
      `¡Bienvenidos de vuelta! El servidor ha sido optimizado y está listo para ofrecerte la mejor experiencia de juego.`
    )
    .addFields(
      {
        name: '📅 Fecha de Apertura',
        value: fecha,
        inline: true
      },
      {
        name: '⏰ Hora de Apertura',
        value: `${horaApertura} (Hora del servidor)`,
        inline: true
      },
      {
        name: '🌟 Estado Actual',
        value: '🟢 **ONLINE Y DISPONIBLE**',
        inline: true
      }
    );

  // Añadir versión si se proporciona
  if (version) {
    embed.addFields({
      name: '🔄 Versión',
      value: version,
      inline: false
    });
  }

  // Añadir notas de actualización si existen
  if (notasDeActualizacion.length > 0) {
    const notasFormateadas = notasDeActualizacion
      .map((nota, index) => `**${index + 1}.** ${nota}`)
      .join('\n');
    
    embed.addFields({
      name: '📋 Notas de Actualización',
      value: notasFormateadas,
      inline: false
    });
  }

  // Añadir detalles si se proporcionan
  if (detalles) {
    embed.addFields({
      name: '📝 Detalles Adicionales',
      value: detalles,
      inline: false
    });
  }

  // Añadir información de conexión
  embed.addFields(
    {
      name: '🎮 Información de Conexión',
      value: getConnectionInfo(servidor),
      inline: false
    },
    {
      name: '📢 ¡Importante!',
      value: 
        '• Todo tu progreso ha sido conservado\n' +
        '• Las mejoras están activas desde ahora\n' +
        '• Reporta cualquier problema en este canal\n' +
        '• ¡Disfruta de la experiencia mejorada!',
      inline: false
    }
  )
  .setFooter({
    text: `Anunciado por ${interaction.user.tag} • ¡Gracias por tu paciencia!`,
    iconURL: interaction.user.displayAvatarURL()
  })
  .setTimestamp()
  .setImage('https://grivyzom.com/apertura-banner.png'); // Banner opcional

  // Preparar el contenido del mensaje con mención
  let mensajeContenido = '';
  
  if (mencionTipo === 'everyone') {
    mensajeContenido = '@everyone';
  } else if (mencionTipo === 'here') {
    mensajeContenido = '@here';
  }

  // Configurar menciones permitidas
  const allowedMentions = mencionTipo !== 'none' ? { 
    parse: [mencionTipo as any] 
  } : { 
    parse: [] 
  };

  // Enviar el mensaje al canal de destino
  try {
    await canalDestino.send({ 
      content: mensajeContenido || undefined,
      embeds: [embed],
      allowedMentions 
    });

    // Confirmar el envío
    const confirmacion = canalDestino.id === interaction.channelId 
      ? '✅ **Anuncio de apertura enviado correctamente.**'
      : `✅ **Anuncio de apertura enviado correctamente en ${canalDestino}.**`;
    
    await interaction.reply({ 
      content: confirmacion,
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error enviando anuncio de apertura:', error);
    await interaction.reply({
      content: '❌ **Error:** No se pudo enviar el anuncio de apertura. Verifica los permisos del bot.',
      ephemeral: true
    });
  }
}

// Función auxiliar para obtener información del servidor
function getServerInfo(servidor: string): { nombre: string; emoji: string } {
  const servidores: Record<string, { nombre: string; emoji: string }> = {
    'java': { nombre: 'Servidor Principal (Java)', emoji: '☕' },
    'bedrock': { nombre: 'Servidor Bedrock', emoji: '🪨' },
    'creativo': { nombre: 'Servidor Creativo', emoji: '🎨' },
    'survival': { nombre: 'Servidor Survival', emoji: '⚔️' },
    'skyblock': { nombre: 'Servidor Skyblock', emoji: '🏝️' },
    'prison': { nombre: 'Servidor Prison', emoji: '⛓️' },
    'todos': { nombre: 'TODOS LOS SERVIDORES', emoji: '🌐' }
  };

  return servidores[servidor] || { nombre: 'Servidor Desconocido', emoji: '❓' };
}

// Función auxiliar para obtener información de conexión
function getConnectionInfo(servidor: string): string {
  const conexiones: Record<string, string> = {
    'java': '🖥️ **Java Edition:**\n• IP: `play.grivyzom.com`\n• Versión: 1.20.1+',
    'bedrock': '📱 **Bedrock Edition:**\n• IP: `bedrock.grivyzom.com`\n• Puerto: `21384`',
    'creativo': '🎨 **Servidor Creativo:**\n• IP: `play.grivyzom.com`\n• Modo: Creativo',
    'survival': '⚔️ **Servidor Survival:**\n• IP: `play.grivyzom.com`\n• Modo: Survival',
    'skyblock': '🏝️ **Servidor Skyblock:**\n• IP: `play.grivyzom.com`\n• Modo: Skyblock',
    'prison': '⛓️ **Servidor Prison:**\n• IP: `play.grivyzom.com`\n• Modo: Prison',
    'todos': '🌐 **Todos los Servidores:**\n• IP Principal: `play.grivyzom.com`\n• Bedrock: `bedrock.grivyzom.com:21384`'
  };

  return conexiones[servidor] || '• Información de conexión no disponible';
}

export default { data, execute };