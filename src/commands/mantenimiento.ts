// src/commands/mantenimiento.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { requireRole } from '../utils/requireRole';
import dotenv from 'dotenv';
dotenv.config();

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID!;

export const data = new SlashCommandBuilder()
  .setName('mantenimiento')
  .setDescription('Anuncia el mantenimiento programado de un servidor')
  .addStringOption(option =>
    option
      .setName('servidor')
      .setDescription('Nombre del servidor que entrará en mantenimiento')
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
      .setName('hora_inicio')
      .setDescription('Hora de inicio del mantenimiento (formato: HH:MM)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('hora_fin')
      .setDescription('Hora estimada de finalización (formato: HH:MM)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('fecha')
      .setDescription('Fecha del mantenimiento (formato: DD/MM/YYYY)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('razon')
      .setDescription('Motivo del mantenimiento (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('detalles')
      .setDescription('Detalles adicionales o mejoras que se realizarán')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Verificar permisos de staff
  if (!(await requireRole(STAFF_ROLE_ID)(interaction))) return;

  const servidor = interaction.options.getString('servidor', true);
  const horaInicio = interaction.options.getString('hora_inicio', true);
  const horaFin = interaction.options.getString('hora_fin', true);
  const fecha = interaction.options.getString('fecha') || 'Hoy';
  const razon = interaction.options.getString('razon');
  const detalles = interaction.options.getString('detalles');

  // Validar formato de hora
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(horaInicio) || !timeRegex.test(horaFin)) {
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

  // Obtener información del servidor
  const servidorInfo = getServerInfo(servidor);
  
  // Crear embed de mantenimiento
  const embed = new EmbedBuilder()
    .setColor('#FF0000') // Color rojo para la barra lateral
    .setTitle('🔧 MANTENIMIENTO PROGRAMADO')
    .setAuthor({
      name: interaction.guild?.name || 'Grivyzom Network',
      iconURL: interaction.guild?.iconURL() ?? undefined
    })
    .setDescription(
      `**${servidorInfo.emoji} ${servidorInfo.nombre}** entrará en mantenimiento programado.\n\n` +
      `Durante este periodo, el servidor estará **temporalmente inaccesible** para realizar mejoras y optimizaciones.`
    )
    .addFields(
      {
        name: '📅 Fecha',
        value: fecha,
        inline: true
      },
      {
        name: '⏰ Hora de Inicio',
        value: `${horaInicio} (Hora del servidor)`,
        inline: true
      },
      {
        name: '⏱️ Hora Estimada de Finalización',
        value: `${horaFin} (Hora del servidor)`,
        inline: true
      }
    );

  // Añadir motivo si se proporciona
  if (razon) {
    embed.addFields({
      name: '🔍 Motivo del Mantenimiento',
      value: razon,
      inline: false
    });
  }

  // Añadir detalles si se proporcionan
  if (detalles) {
    embed.addFields({
      name: '⚙️ Mejoras y Cambios',
      value: detalles,
      inline: false
    });
  }

  // Añadir información adicional
  embed.addFields(
    {
      name: '📢 Información Importante',
      value: 
        '• El progreso de los jugadores se guardará automáticamente\n' +
        '• No se perderán datos durante el mantenimiento\n' +
        '• Se notificará cuando el servidor esté disponible nuevamente\n' +
        '• Mantente atento a este canal para actualizaciones',
      inline: false
    },
    {
      name: '🔗 Enlaces Útiles',
      value: 
        `• 🌐 [Página Web](https://grivyzom.com/)\n` +
        `• 🛒 [Tienda](https://store.grivyzom.com/)\n`,
        //*`• 📊 [Estado del Servidor](https://status.grivyzom.com/)`, */
      inline: false
    }
  )
  .setFooter({
    text: `Anunciado por ${interaction.user.tag} • Gracias por tu paciencia`,
    iconURL: interaction.user.displayAvatarURL()
  })
  .setTimestamp()
  .setImage('https://grivyzom.com/mantenimiento-banner.png'); // Banner opcional

  // Enviar el embed
  await interaction.reply({ embeds: [embed] });

  // Enviar mensaje adicional con @everyone si es mantenimiento de todos los servidores
  if (servidor === 'todos') {
    setTimeout(async () => {
      await interaction.followUp({
        content: '@everyone',
        allowedMentions: { parse: ['everyone'] }
      });
    }, 1000);
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

export default { data, execute };