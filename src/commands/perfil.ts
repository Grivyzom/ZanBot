import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
  GuildMember,
  User,
  CommandInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { Canvas, createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { join } from 'path';
import Color from 'color';

/**
 * Convierte un locale a una bandera emoji con un manejo más completo
 */
function localeToFlag(locale?: string | null): { flag: string; name: string } {
  const localeMap: { [key: string]: { flag: string; name: string } } = {
    'en-US': { flag: '🇺🇸', name: 'Estados Unidos' },
    'en-GB': { flag: '🇬🇧', name: 'Reino Unido' },
    'es-ES': { flag: '🇪🇸', name: 'España' },
    'es-MX': { flag: '🇲🇽', name: 'México' },
    'fr-FR': { flag: '🇫🇷', name: 'Francia' },
    'pt-BR': { flag: '🇧🇷', name: 'Brasil' },
    'de-DE': { flag: '🇩🇪', name: 'Alemania' },
    'it-IT': { flag: '🇮🇹', name: 'Italia' },
    'ja-JP': { flag: '🇯🇵', name: 'Japón' },
    'ko-KR': { flag: '🇰🇷', name: 'Corea del Sur' },
    'ru-RU': { flag: '🇷🇺', name: 'Rusia' },
    'zh-CN': { flag: '🇨🇳', name: 'China' }
  };

  if (!locale) return { flag: '🌐', name: 'Desconocido' };
  return localeMap[locale] || { flag: '🌐', name: 'Desconocido' };
}

/**
 * Calcula la edad de la cuenta y proporciona una descripción legible
 */
function getAccountAge(createdTimestamp: number): string {
  const now = Date.now();
  const diffMs = now - createdTimestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} año${diffYears !== 1 ? 's' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
  }
  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
  }
  return `${diffDays} día${diffDays !== 1 ? 's' : ''} (${new Date(createdTimestamp).toLocaleDateString()})`;
}

/**
 * Acorta el texto si es demasiado largo
 */
function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

/**
 * Dibuja texto con un contorno
 */
function drawTextWithOutline(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth?: number
) {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

/**
 * Dibuja un rectángulo redondeado
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Dibuja una barra de progreso XP
 */
function drawXPBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  color: string
) {
  // Fondo
  ctx.save();
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();

  // Barra de progreso
  const progressWidth = width * (percent / 100);
  if (progressWidth > 0) {
    ctx.beginPath();
    roundRect(ctx, x, y, progressWidth, height, height / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Dibuja un avatar circular
 */
async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatarURL: string,
  x: number,
  y: number,
  size: number
) {
  try {
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    // Dibujar efecto de sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();
    
    // Dibujar borde del avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();
    ctx.restore();
  } catch (error) {
    console.error('Error cargando avatar:', error);
  }
}

/**
 * Genera una imagen de perfil usando Canvas
 */
async function generateProfileCard(
  user: User,
  member: GuildMember | null,
  requester: User,
  xpData?: { level: number; xp: number; xpToNextLevel: number }
): Promise<Buffer> {
  // Crear canvas con dimensiones adecuadas para una tarjeta de perfil
  const canvas = createCanvas(1000, 500);
  const ctx = canvas.getContext('2d');

  // Dibujar fondo con degradado
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  
  // Usar el color del rol más alto o un color por defecto
  const roleColor = member?.roles.highest?.color 
    ? `#${member.roles.highest.color.toString(16).padStart(6, '0')}` 
    : '#7289DA';
  
  const baseColor = Color(roleColor);
  const darkerColor = baseColor.darken(0.4).hex();
  
  gradient.addColorStop(0, darkerColor);
  gradient.addColorStop(1, '#1a1a1a');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar un patrón de fondo sutil
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < canvas.width; i += 20) {
    for (let j = 0; j < canvas.height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 10, 10);
      }
    }
  }

  // Intentar cargar el banner si existe
  if (member?.banner) {
    try {
      const banner = await loadImage(member.bannerURL({ size: 1024 }) || '');
      ctx.globalAlpha = 0.2; // Transparencia para que no distraiga
      ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } catch (error) {
      // Ignorar errores de banner silenciosamente
    }
  }

  // Añadir un efecto de capa superior sutil
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar contenedor principal
  roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 20);
  ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
  ctx.fill();

  // Dibujar avatar
  await drawAvatar(
    ctx,
    user.displayAvatarURL({ extension: 'png', size: 512 }),
    80,
    70,
    160
  );

  // Configuración de texto para nombre de usuario
  ctx.font = 'bold 40px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  drawTextWithOutline(ctx, user.username, 260, 170);

  // Determinar información de región
  const localeInfo = localeToFlag((user as any).locale ?? null);

  // Calcular edad de cuenta y fecha de unión al servidor
  const accountAge = getAccountAge(user.createdTimestamp);
  const serverJoinAge = member?.joinedTimestamp 
    ? getAccountAge(member.joinedTimestamp) 
    : '—';

  // Sección de información
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  drawTextWithOutline(ctx, '🆔 ID de Usuario:', 80, 280);
  drawTextWithOutline(ctx, '🌐 Región:', 80, 320);
  drawTextWithOutline(ctx, '📅 Cuenta creada:', 80, 360);
  drawTextWithOutline(ctx, '📥 Unión al servidor:', 80, 400);

  ctx.font = '22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#e0e0e0';
  drawTextWithOutline(ctx, user.id, 290, 280);
  drawTextWithOutline(ctx, `${localeInfo.flag} ${localeInfo.name}`, 210, 320);
  drawTextWithOutline(ctx, `Hace ${accountAge}`, 300, 360);
  drawTextWithOutline(ctx, member?.joinedTimestamp ? `Hace ${serverJoinAge}` : '—', 330, 400);

  // Sección de roles si el usuario es miembro del servidor
  if (member) {
    const roleCount = member.roles.cache.filter(r => r.id !== member.guild.id).size;
    
    // Mostrar cantidad de roles y el rol más alto
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    drawTextWithOutline(ctx, '📜 Roles:', 80, 440);
    
    ctx.font = '22px "Segoe UI", sans-serif';
    const roleText = roleCount > 0 
      ? `${roleCount} Roles | Principal: ${member.roles.highest.name}` 
      : 'Sin Roles';
    drawTextWithOutline(ctx, roleText, 200, 440);
  }

  // Dibujar barra de XP si los datos están disponibles
  if (xpData) {
    const percentToNextLevel = (xpData.xp / xpData.xpToNextLevel) * 100;
    
    // Texto de nivel
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    drawTextWithOutline(ctx, `NIVEL ${xpData.level}`, 640, 100);
    
    // Barra de XP
    drawXPBar(ctx, 640, 120, 280, 30, percentToNextLevel, roleColor);
    
    // Texto de XP
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextWithOutline(ctx, `${xpData.xp} / ${xpData.xpToNextLevel} XP`, 780, 142);
    ctx.textAlign = 'left';
  }

  // Pie de página
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'right';
  drawTextWithOutline(ctx, `Solicitado por ${requester.tag}`, canvas.width - 60, canvas.height - 60);
  ctx.textAlign = 'left';

  // Devolver buffer con la imagen generada
  return canvas.toBuffer();
}

// Crear botones de acción para interacciones adicionales
function createProfileActionButtons(user: User) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_avatar_${user.id}`)
        .setLabel('Ver Avatar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🖼️'),
      new ButtonBuilder()
        .setCustomId(`profile_banner_${user.id}`)
        .setLabel('Ver Banner')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌄'),
      new ButtonBuilder()
        .setLabel('Copiar ID')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📋')
        .setCustomId(`profile_copy_id_${user.id}`)
    );
}

export const data = new SlashCommandBuilder()
  .setName('perfil')
  .setDescription('Muestra información detallada del perfil de un usuario con una tarjeta gráfica.')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario del que quieres obtener el perfil')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // Defer para dar tiempo a generar la imagen
  
  const target = interaction.options.getUser('usuario') || interaction.user;
  const member = interaction.guild?.members.cache.get(target.id) ?? null;
  
  try {
    // Aquí podrías obtener datos XP de la base de datos si los tienes implementados
    // Ejemplo simulado:
    const xpData = {
      level: 5,
      xp: 2350,
      xpToNextLevel: 3000
    };
    
    // Generar la tarjeta de perfil
    const profileCardBuffer = await generateProfileCard(target, member, interaction.user, xpData);
    
    // Crear un attachment con la imagen
    const attachment = new AttachmentBuilder(profileCardBuffer, { name: 'perfil.png' });
    
    // Botones de acción
    const actionButtons = createProfileActionButtons(target);
    
    // Enviar respuesta con la tarjeta y botones
    await interaction.editReply({
      files: [attachment],
      components: [actionButtons]
    });
  } catch (error) {
    console.error('Error generando la tarjeta de perfil:', error);
    await interaction.editReply('❌ Ocurrió un error al generar la tarjeta de perfil.');
  }
}

// Manejar interacciones de botones para acciones de perfil
export async function handleProfileInteraction(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('profile_')) return;

  const [, action, userId] = interaction.customId.split('_');
  
  try {
    const user = await interaction.client.users.fetch(userId);

  } catch (error) {
    console.error('Error en interacción de perfil:', error);
    await interaction.reply({
      content: '❌ Ocurrió un error al procesar esta acción.',
      ephemeral: true
    });
  }
}

export default { data, execute, handleProfileInteraction };