// src/commands/embedPoll.ts
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  Message,
  ComponentType,
  ButtonInteraction
} from 'discord.js';
import { getEmbedColor } from '../utils/getEmbedColor';
import { setTimeout } from 'node:timers/promises';

// Interfaz para los resultados de votación
interface PollResults {
  [key: number]: {
    option: string;
    votes: number;
    voters: string[];
  }
}

export const data = new SlashCommandBuilder()
  .setName('embed-poll')
  .setDescription('Crea una encuesta atractiva y fácil de votar para tu servidor')
  .addStringOption(option =>
    option
      .setName('question')
      .setDescription('Pregunta de la encuesta')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option_1')
      .setDescription('Opción 1 (requerido)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option_2')
      .setDescription('Opción 2 (requerido)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('option_3')
      .setDescription('Opción 3 (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option_4')
      .setDescription('Opción 4 (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option_5')
      .setDescription('Opción 5 (opcional)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('option_6')
      .setDescription('Opción 6 (opcional)')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('duration')
      .setDescription('Duración en minutos (opcional, predeterminado: 60)')
      .setMinValue(1)
      .setMaxValue(10080) // Máximo 1 semana
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('color')
      .setDescription('Color del embed (opcional, ej: #FF0000 para rojo)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('anonymous')
      .setDescription('¿Votación anónima? (opcional, predeterminado: false)')
      .setRequired(false)
  )
  .addBooleanOption(option =>
    option
      .setName('multiple_choice')
      .setDescription('¿Permitir selección múltiple? (opcional, predeterminado: false)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('question', true);
  
  // Recopilar todas las opciones (hasta 6)

  const opts = [] as string[];
  for (let i = 1; i <= 6; i++) {
    const option = interaction.options.getString(`option_${i}`);
    if (option) opts.push(option);
  }
  
  const duration = interaction.options.getInteger('duration') || 60; // Predeterminado: 60 minutos
  const customColor = interaction.options.getString('color');
  const isAnonymous = interaction.options.getBoolean('anonymous') || false;
  const isMultipleChoice = interaction.options.getBoolean('multiple_choice') || false;
  
  // Convertir a milisegundos para calcular la fecha de finalización
  const endTime = new Date(Date.now() + duration * 60 * 1000);
  
  // Configurar el color del embed (usar el personalizado si se proporciona)
  let embedColor: ColorResolvable;
  if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
    embedColor = customColor as ColorResolvable;
  } else {
    embedColor = getEmbedColor();
  }
  
  // Inicializar los resultados de la encuesta
  const results: PollResults = {};
  opts.forEach((opt, idx) => {
    results[idx] = {
      option: opt,
      votes: 0,
      voters: []
    };
  });
  
  // Crear el embed inicial
  const embed = createPollEmbed(question, opts, duration, embedColor, endTime, results, isAnonymous);
  
  // Crear botones para votar
  const rows = createVoteButtons(opts, isMultipleChoice);
  
  // Enviar el mensaje inicial con botones
  const message = await interaction.reply({
    embeds: [embed],
    components: rows,
    fetchReply: true
  }) as Message;
  
  // Crear un collector para los botones
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duration * 60 * 1000, // Convertir minutos a milisegundos
  });
  
  // Manejar las interacciones de los botones
  collector.on('collect', async (i: ButtonInteraction) => {
    // Comprobar si es una interacción de voto
    if (i.customId.startsWith('vote_')) {
      const optionIndex = parseInt(i.customId.split('_')[1]);
      const userId = i.user.id;
      
      if (!isMultipleChoice) {
        // Si no es selección múltiple, eliminar los votos previos del usuario
        Object.values(results).forEach(result => {
          const index = result.voters.indexOf(userId);
          if (index !== -1) {
            result.voters.splice(index, 1);
            result.votes--;
          }
        });
      }
      
      // Comprobar si el usuario ya votó por esta opción
      const optionVoters = results[optionIndex].voters;
      const alreadyVoted = optionVoters.includes(userId);
      
      if (alreadyVoted) {
        // Quitar el voto si ya votó
        const index = optionVoters.indexOf(userId);
        optionVoters.splice(index, 1);
        results[optionIndex].votes--;
      } else {
        // Añadir el voto
        optionVoters.push(userId);
        results[optionIndex].votes++;
      }
      
      // Actualizar el embed con los nuevos resultados
      const updatedEmbed = createPollEmbed(question, opts, duration, embedColor, endTime, results, isAnonymous);
      
      // Responder a la interacción
      await i.update({
        embeds: [updatedEmbed],
        components: rows
      });
    } else if (i.customId === 'refresh_poll') {
      // Actualizar la vista sin cambiar los votos
      const updatedEmbed = createPollEmbed(question, opts, duration, embedColor, endTime, results, isAnonymous);
      await i.update({
        embeds: [updatedEmbed],
        components: rows
      });
    }
  });
  
  // Cuando termina el tiempo, mostrar los resultados finales
  collector.on('end', async () => {
    const finalEmbed = createFinalResultsEmbed(question, results, embedColor);
    
    try {
      await message.edit({
        embeds: [finalEmbed],
        components: [] // Eliminar los botones
      });
      
      await message.reply({
        content: `📊 **La encuesta ha finalizado.** Gracias a todos por participar.`,
        allowedMentions: { parse: [] } // Evitar menciones al responder
      });
    } catch (error) {
      console.error('Error al finalizar la encuesta:', error);
    }
  });
  
  // Opcionalmente, actualizar el temporizador cada minuto
  if (duration > 1) {
    const updateInterval = Math.min(duration, 5); // Actualizar cada 5 minutos máximo
    const intervalMs = updateInterval * 60 * 1000;
    
    const updateTimer = async () => {
      const now = new Date();
      if (now < endTime) {
        // Actualizar el embed con el tiempo restante
        const updatedEmbed = createPollEmbed(question, opts, duration, embedColor, endTime, results, isAnonymous);
        
        try {
          await message.edit({
            embeds: [updatedEmbed]
          });
          
          // Programar la próxima actualización
          await setTimeout(intervalMs);
          updateTimer();
        } catch (error) {
          console.error('Error al actualizar el temporizador:', error);
        }
      }
    };
    
    // Iniciar el ciclo de actualización
    setTimeout(intervalMs).then(updateTimer);
  }
}

// Función para crear el embed de la encuesta
function createPollEmbed(
  question: string,
  options: string[],
  duration: number,
  color: ColorResolvable,
  endTime: Date,
  results: PollResults,
  isAnonymous: boolean
): EmbedBuilder {
  // Calcular el tiempo restante
  const now = new Date();
  const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
  const minutesRemaining = Math.floor(timeRemaining / (60 * 1000));
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  
  let timeRemainingText = '';
  if (hoursRemaining > 0) {
    timeRemainingText = `${hoursRemaining}h ${minutesRemaining % 60}m restantes`;
  } else {
    timeRemainingText = `${minutesRemaining}m restantes`;
  }
  
  // Calcular el porcentaje para cada opción
  const totalVotes = Object.values(results).reduce((sum, result) => sum + result.votes, 0);
  
  // Crear campos para cada opción con una barra de progreso visual
  const fields = options.map((opt, idx) => {
    const result = results[idx];
    const voteCount = result.votes;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : '0.0';
    
    // Crear una barra de progreso visual
    const progressBarLength = 20; // Longitud total de la barra
    const filledBars = Math.round((voteCount / Math.max(1, totalVotes)) * progressBarLength);
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(progressBarLength - filledBars);
    
    // Lista de votantes (si no es anónimo)
    let votersText = '';
    if (!isAnonymous && voteCount > 0) {
      if (voteCount <= 3) {
        // Mostrar los primeros 3 votantes
        votersText = `\nVotantes: ${result.voters.map(id => `<@${id}>`).join(', ')}`;
      } else {
        // Mostrar número total de votantes
        votersText = `\nVotantes: ${voteCount} usuarios`;
      }
    }
    
    return {
      name: `${idx + 1}. ${opt}`,
      value: `${progressBar} **${percentage}%** (${voteCount} votos)${votersText}`,
      inline: false
    };
  });
  
  return new EmbedBuilder()
    .setTitle(`📊 Encuesta: ${question}`)
    .setDescription(`**Total de votos:** ${totalVotes}\n${isAnonymous ? '🔒 Votación anónima' : '👥 Votación pública'}`)
    .addFields(fields)
    .setColor(color)
    .setFooter({
      text: `🕒 Termina en ${timeRemainingText} | Finaliza: ${endTime.toLocaleString()}`
    })
    .setTimestamp();
}

// Función para crear los botones de votación
function createVoteButtons(options: string[], isMultipleChoice: boolean): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const buttonsPerRow = 5;
  
  // Crear los botones para votar
  for (let i = 0; i < Math.ceil(options.length / buttonsPerRow); i++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    for (let j = 0; j < buttonsPerRow; j++) {
      const index = i * buttonsPerRow + j;
      if (index < options.length) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`vote_${index}`)
            .setLabel(`Opción ${index + 1}`)
            .setStyle(ButtonStyle.Primary)
        );
      }
    }
    
    if (row.components.length > 0) {
      rows.push(row);
    }
  }
  
  // Añadir un botón para actualizar la vista
  const actionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('refresh_poll')
        .setLabel('Actualizar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  
  rows.push(actionRow);
  
  return rows;
}

// Función para crear el embed final con los resultados
function createFinalResultsEmbed(
  question: string,
  results: PollResults,
  color: ColorResolvable
): EmbedBuilder {
  // Calcular el total de votos
  const totalVotes = Object.values(results).reduce((sum, result) => sum + result.votes, 0);
  
  // Ordenar las opciones por número de votos (de mayor a menor)
  const sortedResults = Object.entries(results)
    .map(([index, data]) => ({
      index: parseInt(index),
      ...data
    }))
    .sort((a, b) => b.votes - a.votes);
  
  // Crear campos para cada opción con un indicador para el ganador
  const fields = sortedResults.map((result, idx) => {
    const percentage = totalVotes > 0 ? (result.votes / totalVotes * 100).toFixed(1) : '0.0';
    const isWinner = idx === 0 && result.votes > 0;
    
    // Crear una barra de progreso visual
    const progressBarLength = 20;
    const filledBars = Math.round((result.votes / Math.max(1, totalVotes)) * progressBarLength);
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(progressBarLength - filledBars);
    
    return {
      name: `${isWinner ? '👑 ' : ''}${result.index + 1}. ${result.option}`,
      value: `${progressBar} **${percentage}%** (${result.votes} votos)`,
      inline: false
    };
  });
  
  return new EmbedBuilder()
    .setTitle(`📊 Resultados finales: ${question}`)
    .setDescription(`**Total de votos:** ${totalVotes}`)
    .addFields(fields)
    .setColor(color)
    .setFooter({
      text: `Encuesta finalizada | ${new Date().toLocaleString()}`
    })
    .setTimestamp();
}