// src/utils/activityRewards.ts
import { Client, Message, VoiceState, TextChannel, EmbedBuilder, User, GuildMember } from 'discord.js';
import { addXPFromSource, getLevelData, isMilestoneLevel, generateLevelCard } from './levelSystem';
import db from '../database';
import crypto from 'crypto';
import { applyRankRoles } from './rankRoles';

interface RankRole {
  level: number;
  id: string;
}

// Configuración avanzada del sistema de XP
const config = {
  // XP base por acción
  xpValues: {
    message: 10,          // XP por mensaje
    replyToMessage: 5,    // XP adicional por responder
    useCommand: 3,        // XP por usar comandos
    dailyCheckIn: 50,     // XP por check-in diario
    voicePerMinute: 5,    // XP por minuto en canal de voz
    boostServer: 500,     // XP por boostear
    createThread: 15,     // XP por crear hilo
    participateEvent: 100, // XP por participar en eventos
    positiveReaction: 2,   // XP por recibir reacción positiva
  },
  
  // Multiplicadores por contexto
  multipliers: {
    weekend: 1.5,         // +50% XP en fin de semana
    eventDay: 2.0,        // +100% XP en días de evento
    streak: 0.1,          // +10% por día consecutivo (acumulable, máx. 50%)
    firstOfDay: 2.0,      // x2 en la primera acción del día
    premium: 1.2,         // +20% para miembros premium
  },
  
  // Límites para prevenir abusos
  limits: {
    maxMessagesPerMinute: 5,          // Máximo de mensajes que dan XP por minuto
    minMessageLength: 5,              // Longitud mínima para contar un mensaje
    minVoiceTimeSeconds: 60,          // Tiempo mínimo en voz para recibir XP (1 min)
    sameLinkCooldown: 1800,           // Tiempo de espera para mismo enlace (30 min)
    messageXpCooldown: 30,            // Segundos entre mensajes que dan XP
    maxDailyXpFromMessages: 1000,     // Límite diario de XP por mensajes
    maxDailyXpFromVoice: 1500,        // Límite diario de XP por chat de voz
    maxStreakDays: 5,                 // Máximo de días de racha para bono
  },
  
  // Canales especiales
  specialChannels: {
    communityChannel: 1.5,      // +50% en canales comunitarios
    helpChannel: 1.3,           // +30% en canales de ayuda
    devChannel: 1.2,            // +20% en canales de desarrollo
  },
  
  // Notificaciones y anuncios
  notifications: {
    levelUpDmEnabled: false,     // Notificar por DM al subir de nivel
    announceInChannel: true,     // Anunciar niveles en canal
    announceMilestones: true,    // Anunciar hitos importantes
    announceLevelUpChannel: null, // ID del canal para anuncios (si es null, se anuncia en el mismo canal)
  },
};

// Cache de usuarios activos y su última actividad
interface UserActivity {
  lastMessageTimestamp: number;
  messageCount: number;
  messagesXpToday: number;
  voiceXpToday: number;
  voiceChannelJoinTime: number | null;
  lastDailyCheckIn: Date | null;
  dailyStreak: number;
  processedLinks: Map<string, number>; // link -> timestamp
  lastXPAwardTime: number;
}

// Sistema de seguimiento de actividad
class ActivityTracker {
  private userActivity: Map<string, UserActivity> = new Map();
  private client: Client;
  private voiceTimeTracker: Map<string, NodeJS.Timeout> = new Map();
  private seenMessages: Set<string> = new Set(); // Evitar procesar mensajes duplicados
  private specialEventsActive: Map<string, Date> = new Map(); // Eventos especiales y multiplicadores
  
  constructor(client: Client) {
    this.client = client;
    
    // Limpiar los contadores diarios a medianoche
    this.scheduleDailyReset();
    
    // Cargar eventos especiales programados en DB
    this.loadSpecialEvents();
  }
  
  // Obtener o crear un registro de actividad para un usuario
  private getActivity(userId: string, guildId: string): UserActivity {
    const key = `${guildId}:${userId}`;
    if (!this.userActivity.has(key)) {
      this.userActivity.set(key, {
        lastMessageTimestamp: 0,
        messageCount: 0,
        messagesXpToday: 0,
        voiceXpToday: 0,
        voiceChannelJoinTime: null,
        lastDailyCheckIn: null,
        dailyStreak: 0,
        processedLinks: new Map(),
        lastXPAwardTime: 0
      });
    }
    return this.userActivity.get(key)!;
  }
  
  // ========== MENSAJES ==========
  // Procesar mensaje para XP
  async processMessage(message: Message): Promise<void> {
    // Ignorar mensajes de bots, comandos, y mensajes muy cortos
    if (
      message.author.bot ||
      message.content.startsWith('!') ||
      message.content.startsWith('/') ||
      message.content.length < config.limits.minMessageLength ||
      !message.guild
    ) return;
    
    const now = Date.now();
    const userId = message.author.id;
    const guildId = message.guild.id;
    const activity = this.getActivity(userId, guildId);
    
    // Control de spam: limitar mensajes por minuto
    if (now - activity.lastMessageTimestamp < config.limits.messageXpCooldown * 1000) {
      return;
    }
    
    // Verificar límite diario
    if (activity.messagesXpToday >= config.limits.maxDailyXpFromMessages) {
      return;
    }
    
    // Generar un ID único para el mensaje para evitar duplicados (en caso de reinicios)
    const messageId = crypto.createHash('md5').update(`${message.id}:${userId}:${guildId}`).digest('hex');
    if (this.seenMessages.has(messageId)) return;
    this.seenMessages.add(messageId);
    
    // Limpiar caché de mensajes cada cierto tiempo para no acumular demasiada memoria
    if (this.seenMessages.size > 10000) {
      this.seenMessages.clear();
    }
    
    // Calcular XP base
    let xpToAward = config.xpValues.message;
    
    // Bonus por responder a alguien
    if (message.reference && message.reference.messageId) {
      xpToAward += config.xpValues.replyToMessage;
    }
    
    // Multiplicadores por contexto
    const multiplier = await this.calculateMultiplier(userId, guildId, message.channelId);
    xpToAward = Math.floor(xpToAward * multiplier);
    
    // Actualizar actividad
    activity.lastMessageTimestamp = now;
    activity.messageCount++;
    activity.messagesXpToday += xpToAward;
    activity.lastXPAwardTime = now;
    
    // Añadir XP al usuario
    const xpResult = await addXPFromSource(userId, guildId, xpToAward, 'message');
    
    // Notificar si subió de nivel
    if (xpResult.leveledUp) {
      await this.handleLevelUp(message.member!, xpResult.level, message.channel as TextChannel);
    }
  }
  
  // ========== VOZ ==========
  // Iniciar seguimiento de tiempo en canal de voz
  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!newState.guild) return;
    
    const userId = newState.id;
    const guildId = newState.guild.id;
    const activity = this.getActivity(userId, guildId);
    
    // Usuario se unió a un canal de voz
    if (!oldState.channelId && newState.channelId) {
      activity.voiceChannelJoinTime = Date.now();
      
      // Iniciar intervalo para añadir XP cada minuto
      const intervalId = setInterval(async () => {
        await this.awardVoiceXP(userId, guildId, newState);
      }, 60000); // Cada minuto
      
      this.voiceTimeTracker.set(`${guildId}:${userId}`, intervalId);
    }
    
    // Usuario se desconectó
    if (oldState.channelId && !newState.channelId) {
      // Detener el intervalo
      const intervalId = this.voiceTimeTracker.get(`${guildId}:${userId}`);
      if (intervalId) {
        clearInterval(intervalId);
        this.voiceTimeTracker.delete(`${guildId}:${userId}`);
      }
      
      // Procesar el tiempo acumulado para XP final
      if (activity.voiceChannelJoinTime) {
        const timeSpent = Math.floor((Date.now() - activity.voiceChannelJoinTime) / 1000);
        
        // Solo procesar si estuvo más del tiempo mínimo
        if (timeSpent >= config.limits.minVoiceTimeSeconds) {
          await this.processVoiceTime(userId, guildId, timeSpent, oldState);
        }
        
        activity.voiceChannelJoinTime = null;
      }
    }
  }
  
// ========== VOICE ==========
async processVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
  // Ignorar bots
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const userId  = member.id;
  const guildId = member.guild.id;
  const activity = this.getActivity(userId, guildId);

  // ── Detectar conexión a un canal de voz ──────────────────────────────
  if (!oldState.channelId && newState.channelId) {
    // Guardar hora de entrada
    activity.voiceChannelJoinTime = Date.now();
    return;
  }

  // ── Detectar salida o cambio de canal ────────────────────────────────
  const leftChannel   =  oldState.channelId && !newState.channelId;
  const switchedVoice =  oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  if (leftChannel || switchedVoice) {
    if (!activity.voiceChannelJoinTime) return;

    const now      = Date.now();
    const seconds  = Math.floor((now - activity.voiceChannelJoinTime) / 1000);
    activity.voiceChannelJoinTime = null;          // Reset

    // Debe superar el mínimo
    if (seconds < config.limits.minVoiceTimeSeconds) return;

    const minutes = Math.floor(seconds / 60);
    if (minutes <= 0) return;

    // Respetar límite diario
    const remainingXp = config.limits.maxDailyXpFromVoice - activity.voiceXpToday;
    if (remainingXp <= 0) return;

    const maxMinutesByLimit = Math.floor(remainingXp / config.xpValues.voicePerMinute);
    const minutesGranted    = Math.min(minutes, maxMinutesByLimit);
    if (minutesGranted <= 0) return;

    // Multiplicadores (evento global, etc.)
    let multiplier = 1;
    if (this.isEventActive?.(guildId)) multiplier *= 1.2; // 20 % extra en eventos

    const xpToAward = minutesGranted * config.xpValues.voicePerMinute * multiplier;

    // Otorgar XP
    const result = await addXPFromSource(userId, guildId, xpToAward, 'voice');
    activity.voiceXpToday += xpToAward;

    // Anunciar Level-Up si ocurre
    if (result.leveledUp) {
      // Usa canal por defecto o el primero de texto que exista
      const announceChannel =
        newState.guild.systemChannel ??
        (newState.guild.channels.cache.find(c => c.isTextBased()) as TextChannel | undefined);

      if (announceChannel) {
        await this.handleLevelUp(member, result.level, announceChannel);
      }
    }
  }
}


  // Otorgar XP por tiempo en canal de voz
  private async awardVoiceXP(userId: string, guildId: string, state: VoiceState): Promise<void> {
    const activity = this.getActivity(userId, guildId);
    
    // Verificar si el usuario sigue en un canal de voz
    if (!state.channelId || !activity.voiceChannelJoinTime) {
      const intervalId = this.voiceTimeTracker.get(`${guildId}:${userId}`);
      if (intervalId) clearInterval(intervalId);
      this.voiceTimeTracker.delete(`${guildId}:${userId}`);
      return;
    }
    
    // Verificar límite diario
    if (activity.voiceXpToday >= config.limits.maxDailyXpFromVoice) {
      return;
    }
    
    // No otorgar XP si está solo o en canal AFK
    const channel = state.channel;
    if (!channel || channel.members.size < 2 || state.guild.afkChannelId === channel.id) {
      return;
    }
    
    // Calcular XP por minuto
    let xpToAward = config.xpValues.voicePerMinute;
    
    // Multiplicadores por contexto
    const multiplier = await this.calculateMultiplier(userId, guildId, channel.id);
    xpToAward = Math.floor(xpToAward * multiplier);
    
    // Actualizar contadores
    activity.voiceXpToday += xpToAward;
    activity.lastXPAwardTime = Date.now();
    
    // Añadir XP al usuario
    const xpResult = await addXPFromSource(userId, guildId, xpToAward, 'voice');
    
    // Notificar si subió de nivel
    if (xpResult.leveledUp) {
      // Buscar un canal de texto adecuado para notificar
      const member = await state.guild.members.fetch(userId).catch(() => null);
      if (member) {
        // Buscar el canal general o el primero disponible
        const textChannel = state.guild.channels.cache.find(
          c => c.type === 0 && c.name.includes('general')
        ) as TextChannel || 
        state.guild.channels.cache.find(
          c => c.type === 0
        ) as TextChannel;
        
        if (textChannel) {
          await this.handleLevelUp(member, xpResult.level, textChannel);
        }
      }
    }
  }
  
  // Procesar tiempo acumulado en canal de voz al desconectar
  private async processVoiceTime(userId: string, guildId: string, seconds: number, state: VoiceState): Promise<void> {
    // Este método podría utilizarse para registro detallado de tiempo en voz o estadísticas
    // Ya que el XP se otorga por intervalos, aquí solo registramos para estadísticas
    
    try {
      await db.execute(
        'INSERT INTO voice_activity (user_id, guild_id, channel_id, duration_seconds, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [userId, guildId, state.channelId, seconds]
      );
    } catch (error) {
      console.error('Error registrando actividad de voz:', error);
    }
  }
  
  // ========== OTRAS RECOMPENSAS ==========
  // Procesar check-in diario
  async processDailyCheckIn(userId: string, guildId: string): Promise<{
    success: boolean;
    xpAwarded: number;
    streak: number;
    nextBonus: number;
  }> {
    const activity = this.getActivity(userId, guildId);
    const now = new Date();
    
    // Verificar si ya hizo check-in hoy
    if (activity.lastDailyCheckIn) {
      const lastCheck = activity.lastDailyCheckIn;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const checkDate = new Date(lastCheck.getFullYear(), lastCheck.getMonth(), lastCheck.getDate());
      
      if (today.getTime() === checkDate.getTime()) {
        return { 
          success: false, 
          xpAwarded: 0,

          streak: activity.dailyStreak,
          nextBonus: activity.dailyStreak * 10 
        };
      }
      
      // Verificar si mantiene racha (checkeo ayer)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = checkDate.getTime() === yesterday.getTime();
      
      if (isConsecutive) {
        activity.dailyStreak = Math.min(activity.dailyStreak + 1, config.limits.maxStreakDays);
      } else {
        activity.dailyStreak = 1; // Reiniciar racha
      }
    } else {
      activity.dailyStreak = 1; // Primera racha
    }
    
    // Calcular XP con bono por racha
    const streakBonus = Math.min(activity.dailyStreak * 10, 50); // 10% por día, máximo 50%
    const baseXP = config.xpValues.dailyCheckIn;
    const xpToAward = Math.floor(baseXP * (1 + streakBonus / 100));

    // Actualizar último check-in
    activity.lastDailyCheckIn = now;
    
    // Añadir XP al usuario
    await addXPFromSource(userId, guildId, xpToAward, 'daily');
    
    // Guardar racha en DB
    try {
      await db.execute(
        'INSERT INTO daily_checkins (user_id, guild_id, streak, xp_awarded) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE streak = VALUES(streak), xp_awarded = xp_awarded + VALUES(xp_awarded), ' +
        'last_checkin = NOW()',
        [userId, guildId, activity.dailyStreak, xpToAward]
      );
    } catch (error) {
      console.error('Error al guardar check-in diario:', error);
    }
    
    return {
      success: true,
      xpAwarded: xpToAward,
      streak: activity.dailyStreak,
      nextBonus: (activity.dailyStreak + 1) * 10 > 50 ? 50 : (activity.dailyStreak + 1) * 10
    };
  }
  
  
  // Procesar boost de servidor
  async processServerBoost(member: GuildMember): Promise<void> {
    if (!member.guild) return;
    
    const xpToAward = config.xpValues.boostServer;
    const { leveledUp, level } = await addXPFromSource(
      member.id, 
      member.guild.id, 
      xpToAward, 
      'boost'
    );
    
    // Notificar en canal de sistema o general
    const systemChannel = member.guild.systemChannel || 
                         member.guild.channels.cache.find(
                           c => c.type === 0 && c.name.includes('general')
                         ) as TextChannel;
    
    if (systemChannel) {
      const embed = new EmbedBuilder()
        .setColor('#f47fff')
        .setTitle('🚀 ¡Impulso de Servidor!')
        .setDescription(`¡**${member.displayName}** ha boosteado el servidor y ha recibido **${xpToAward} XP**!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
      
      await systemChannel.send({ embeds: [embed] });
      
      if (leveledUp) {
        await this.handleLevelUp(member, level, systemChannel);
      }
    }
  }
  
  // Procesar participación en evento
  async processEventParticipation(userId: string, guildId: string, eventName: string): Promise<void> {
    const member = await this.client.guilds.cache.get(guildId)?.members.fetch(userId).catch(() => null);
    if (!member) return;
    
    const xpToAward = config.xpValues.participateEvent;
    const { leveledUp, level } = await addXPFromSource(userId, guildId, xpToAward, 'event');
    
    // Guardar registro del evento
    try {
      await db.execute(
        'INSERT INTO event_participation (user_id, guild_id, event_name, xp_awarded) VALUES (?, ?, ?, ?)',
        [userId, guildId, eventName, xpToAward]
      );
    } catch (error) {
      console.error('Error registrando participación en evento:', error);
    }
    
    // Notificar (opcional)
    if (leveledUp) {
      const systemChannel = member.guild.systemChannel as TextChannel;
      if (systemChannel) {
        await this.handleLevelUp(member, level, systemChannel);
      }
    }
  }
  
  // Procesar reacción positiva recibida
  async processReactionReceived(userId: string, guildId: string, reactorId: string): Promise<void> {
    // Evitar auto-reacciones
    if (userId === reactorId) return;
    
    const xpToAward = config.xpValues.positiveReaction;
    await addXPFromSource(userId, guildId, xpToAward, 'reaction');
    
    // No necesita notificación por ser una cantidad pequeña
  }
  
  // ========== UTILIDADES INTERNAS ==========
  
  // Calcular multiplicador basado en contexto
  private async calculateMultiplier(userId: string, guildId: string, channelId: string): Promise<number> {
    let multiplier = 1.0;
    const now = new Date();
    const activity = this.getActivity(userId, guildId);
    
    // Multiplicador de fin de semana
    const day = now.getDay();
    if (day === 0 || day === 6) { // Sábado o domingo
      multiplier *= config.multipliers.weekend;
    }
    
    // Multiplicador de evento activo
    if (this.isEventActive(guildId)) {
      multiplier *= config.multipliers.eventDay;
    }
    
    // Multiplicador de racha diaria
    if (activity.dailyStreak > 1) {
      const streakMultiplier = Math.min(
        1 + (activity.dailyStreak * config.multipliers.streak),
        1.5 // Máximo +50%
      );
      multiplier *= streakMultiplier;
    }
    
    // Multiplicador de primera acción del día
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (activity.lastXPAwardTime === 0 || 
        new Date(activity.lastXPAwardTime).getDate() !== today.getDate()) {
      multiplier *= config.multipliers.firstOfDay;
    }
    
    // Multiplicador de canal especial
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'name' in channel && channel.name) {
        const channelName = channel.name.toLowerCase();
        
            if (channelName.includes('comunidad') || channelName.includes('community')) {
            multiplier *= config.specialChannels.communityChannel;
            } else if (channelName.includes('ayuda') || channelName.includes('help')) {
            multiplier *= config.specialChannels.helpChannel;
            } else if (channelName.includes('dev') || channelName.includes('desarrollo')) {
            multiplier *= config.specialChannels.devChannel;
            }
            }
    } catch (error) {
      // Ignorar errores al buscar canal
    }
    
    // Multiplicador de usuario premium
    try {
      const guildObj = this.client.guilds.cache.get(guildId);
      if (guildObj) {
        const member = await guildObj.members.fetch(userId);
        // Verificar roles premium (ajustar según tu servidor)
        const hasPremium = member?.roles.cache.some(
          role => role.name.toLowerCase().includes('premium') || 
                 role.name.toLowerCase().includes('vip')
        );
        
        if (hasPremium) {
          multiplier *= config.multipliers.premium;
        }
      }
    } catch (error) {
      // Ignorar errores al buscar miembro
    }
    
    return multiplier;
  }
  
  // Verificar si hay un evento activo en el servidor
  private isEventActive(guildId: string): boolean {
    const eventKey = `event:${guildId}`;
    if (this.specialEventsActive.has(eventKey)) {
      const endDate = this.specialEventsActive.get(eventKey);
      if (endDate && endDate > new Date()) {
        return true;
      } else {
        // Limpiar evento expirado
        this.specialEventsActive.delete(eventKey);
      }
    }
    return false;
  }
  
  // Programar eventos desde la base de datos
  private async loadSpecialEvents(): Promise<void> {
    try {
      const [rows]: any = await db.execute(
        'SELECT guild_id, event_name, start_date, end_date FROM special_events WHERE end_date > NOW()'
      );
      
      for (const row of rows) {
        const eventKey = `event:${row.guild_id}`;
        this.specialEventsActive.set(eventKey, new Date(row.end_date));
      }
      
      console.log(`✅ Cargados ${rows.length} eventos especiales activos`);
    } catch (error) {
      console.error('Error cargando eventos especiales:', error);
    }
  }
  
  // Programar limpieza diaria
  private scheduleDailyReset(): void {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      // Resetear contadores diarios
      for (const [key, activity] of this.userActivity.entries()) {
        activity.messagesXpToday = 0;
        activity.voiceXpToday = 0;
      }
      
      // Programar próximo reset
      this.scheduleDailyReset();
      
      console.log('🔄 Contadores diarios de XP reseteados');
    }, timeUntilMidnight);
    
    console.log(`🔄 Próximo reset de XP diario en ${Math.floor(timeUntilMidnight / 3600000)} horas`);
  }
  
  // Manejar la subida de nivel
  private async handleLevelUp(
    member: GuildMember, 
    newLevel: number, 
    channel: TextChannel
  ): Promise<void> {
    // 1. Crear mensaje de nivel según configuración
    if (config.notifications.announceInChannel || 
       (config.notifications.announceMilestones && isMilestoneLevel(newLevel))) {
      
      // Determinar canal para anuncio
      let announceChannel = channel;
      if (config.notifications.announceLevelUpChannel) {
        const targetChannel = await this.client.channels.fetch(
          config.notifications.announceLevelUpChannel
        ).catch(() => null);
        
        if (targetChannel && targetChannel.type === 0) {
          announceChannel = targetChannel as TextChannel;
        }
      }
      
      // Personalizar mensaje según nivel
      let message = `¡**${member.displayName}** ha subido al nivel **${newLevel}**! 🎉`;
      let color = '#43a047'; // Verde por defecto
      
      // Mensajes especiales por nivel
      if (newLevel >= 300) {
        message = `🌟 ¡**${member.displayName}** ha alcanzado el nivel LEGENDARIO **${newLevel}**! 🌟\n¡Un logro impresionante que pocos consiguen!`;
        color = '#ffd700'; // Dorado
      } else if (newLevel >= 200) {
        message = `💫 ¡WOW! **${member.displayName}** ha subido al nivel ÉPICO **${newLevel}**! 💫\n¡Una dedicación increíble!`;
        color = '#9370db'; // Morado
      } else if (newLevel >= 100) {
        message = `🔥 ¡INCREÍBLE! **${member.displayName}** ha alcanzado el nivel **${newLevel}**! 🔥\n¡Un miembro excepcional de nuestra comunidad!`;
        color = '#f47fff'; // Rosa
      } else if (newLevel >= 50) {
        message = `⭐ ¡Asombroso! **${member.displayName}** ha subido al nivel **${newLevel}**! ⭐\n¡Sigue así!`;
        color = '#1e88e5'; // Azul
      } else if (newLevel >= 25) {
        message = `✨ ¡**${member.displayName}** ha subido al nivel **${newLevel}**! ✨\n¡Va por buen camino!`;
        color = '#26a69a'; // Verde azulado
      }
      
      // Crear tarjeta o embed según nivel
      if (isMilestoneLevel(newLevel)) {
        // Para niveles especiales, generar tarjeta visual
        try {
          const levelData = await getLevelData(member.id, member.guild.id);
          const levelCard = await generateLevelCard(member, levelData);
          
          const embed = new EmbedBuilder()
            .setColor(color as any)
            .setDescription(message)
            .setImage('attachment://levelcard.png');
          
          await announceChannel.send({ embeds: [embed], files: [levelCard] });
        } catch (error) {
          console.error('Error generando tarjeta de nivel:', error);
          // Fallback a embed simple
          const embed = new EmbedBuilder()
            .setColor(color as any)
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL());
          
          await announceChannel.send({ embeds: [embed] });
        }
      } else {
        // Para niveles normales, usar embed simple
        const embed = new EmbedBuilder()
          .setColor(color as any)
          .setDescription(message)
          .setThumbnail(member.user.displayAvatarURL());
        
        await announceChannel.send({ embeds: [embed] });
      }
    }
    
    // 2. Enviar DM si está configurado
    if (config.notifications.levelUpDmEnabled) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor('#43a047')
          .setTitle(`¡Has subido al nivel ${newLevel}!`)
          .setDescription(`¡Felicidades por alcanzar el nivel ${newLevel} en ${member.guild.name}!`)
          .setFooter({ text: 'Sigue participando para seguir creciendo.' });
        
        await member.send({ embeds: [dmEmbed] }).catch(() => {
          // Ignorar errores de DM (si el usuario tiene los DMs desactivados)
        });
      } catch (error) {
        // Ignorar errores al enviar DM
      }
    }
    
    // 3. Verificar y aplicar recompensas por nivel
    await this.processLevelRewards(member, newLevel);
    await applyRankRoles(member, newLevel);
  }
  
  // Procesar recompensas por nivel
  private async processLevelRewards(member: GuildMember, level: number): Promise<void> {
    try {
      // Buscar recompensas configuradas para este nivel
      const [rows]: any = await db.execute(
        'SELECT * FROM level_rewards WHERE guild_id = ? AND level_required <= ?',
        [member.guild.id, level]
      );
      
      // Verificar qué recompensas ya tiene
      const [userRewards]: any = await db.execute(
        'SELECT reward_id FROM user_rewards WHERE user_id = ? AND guild_id = ?',
        [member.id, member.guild.id]
      );
      
      // Construir conjunto de recompensas ya otorgadas
      const obtained = new Set<string>(userRewards.map((r: any) => r.reward_id));
      
      for (const reward of rows) {
        // Verificar si ya fue otorgada
        if (obtained.has(reward.id)) continue;
        
        try {
          // -- Otorgar recompensa según tipo --
          if (reward.type === 'role' && reward.role_id) {
            const role = member.guild.roles.cache.get(reward.role_id);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role, 'Recompensa por nivel');
            }
          } else if (reward.type === 'currency' && reward.amount) {
            // Ejemplo de moneda interna
            await db.execute(
              'UPDATE user_stats SET coins = coins + ? WHERE user_id = ? AND guild_id = ?',
              [reward.amount, member.id, member.guild.id]
            );
          } else if (reward.type === 'command' && reward.command) {
            // Ejecutar comando personalizado
            const command = (this.client as any).commands?.get(reward.command);
            if (command) {
              await command.execute(member);
            }
          }
          
          // Registrar recompensa otorgada
          await db.execute(
            'INSERT INTO user_rewards (user_id, guild_id, reward_id, granted_at) VALUES (?, ?, ?, NOW())',
            [member.id, member.guild.id, reward.id]
          );
          
          // Notificar al usuario por DM
          try {
            const embed = new EmbedBuilder()
              .setColor('#ffd700')
              .setTitle('🎁 ¡Nueva recompensa desbloqueada!')
              .setDescription(
                `Has recibido **${reward.name ?? 'una recompensa'}** por alcanzar el nivel **${level}**. ¡Disfrútala!`
              )
              .setThumbnail(member.user.displayAvatarURL());
            
            await member.send({ embeds: [embed] });
          } catch {
            // Ignorar si no se pueden enviar DMs
          }
        } catch (error) {
          console.error('Error otorgando recompensa:', error);
        }
      }
      
    } catch (error) {
      console.error('Error procesando recompensas por nivel:', error);
    }
  }

  private async applyRankRoles(member: GuildMember, level: number): Promise<void> {
    const rankRoles: RankRole[] = [
      { level: 0, id: process.env.ROLE_NUEVO   ?? '' }, // «Nuevo»
      { level: 5, id: process.env.ROLE_MIEMBRO ?? '' }, // «Miembro»
    ].filter((r): r is RankRole => r.id.length > 0); // descarta entradas vacías
    // rango más alto alcanzado
    const target = rankRoles
      .filter(r => level >= r.level)
      .sort((a, b) => b.level - a.level)[0];
    if (!target) return;

    // Añadir rol nuevo
    if (!member.roles.cache.has(target.id)) {
      await member.roles.add(target.id, 'Rank-up');
    }

    // Quitar roles de rangos inferiores
    const idsToRemove = rankRoles
      .map(r => r.id)
      .filter(id => id !== target.id && member.roles.cache.has(id));
    if (idsToRemove.length) {
      await member.roles.remove(idsToRemove, 'Rank-up');
    }
  }

}



export default ActivityTracker;