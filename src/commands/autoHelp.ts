import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  Message,
  GuildMember,
  PermissionsBitField,
  Events,
  ComponentType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ButtonInteraction,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('autohelp')
  .setDescription('Refresca el menú de ayuda dinámico en el canal permanente');


  export async function execute(interaction: ChatInputCommandInteraction) {
  // Asegúrate de que tienes acceso al client
  const client = interaction.client as Client;

  await interaction.deferReply({ ephemeral: true });
  try {
    // Aquí importas o llamas a tu lógica para regenerar el menú:
    await updateResourceMessage(client);
    await interaction.editReply('✅ Menú de ayuda actualizado correctamente.');
  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Hubo un error al actualizar el menú de ayuda.');
  }
}

// Configuración
const CONFIG = {
  RESOURCE_CHANNEL_ID: '1371362142112190464', // ID del canal donde mostrar los comandos
  UPDATE_INTERVAL: 3600000, // Actualizar cada hora (en ms)
  COMMANDS_PER_PAGE: 5,    // Comandos por página
};

// Tipo mínimo para representar un comando
type HelpCommand = {
  data: {
    name: string;
    description: string;
    default_member_permissions?: string | number | bigint | null;
  };
};

/** Determina si el miembro puede usar el comando según los permisos por defecto */
function canUseCommand(member: GuildMember | null, cmd: HelpCommand): boolean {
  const permBits = cmd.data.default_member_permissions;
  if (!permBits) return true; // comando sin restricciones
  if (!member) return false; // no es miembro (dm)
  try {
    const required = new PermissionsBitField(BigInt(permBits));
    return member.permissions.has(required);
  } catch {
    return false;
  }
}

/**
 * Genera los embeds paginados con los comandos
 */
function generateCommandPages(commands: Collection<string, HelpCommand>): EmbedBuilder[] {
  const cmds = Array.from(commands.values());
  const pages: EmbedBuilder[] = [];
  
  for (let i = 0; i < cmds.length; i += CONFIG.COMMANDS_PER_PAGE) {
    const slice = cmds.slice(i, i + CONFIG.COMMANDS_PER_PAGE);
    const embed = new EmbedBuilder()
      .setTitle('📖 Ayuda de Comandos')
      .setColor(0x5865f2)
      .setFooter({ 
        text: `Página ${Math.floor(i / CONFIG.COMMANDS_PER_PAGE) + 1} de ${Math.ceil(cmds.length / CONFIG.COMMANDS_PER_PAGE)}` 
      });

    for (const cmd of slice) {
      embed.addFields({ name: `/${cmd.data.name}`, value: cmd.data.description, inline: false });
    }
    pages.push(embed);
  }
  
  return pages;
}

/**
 * Genera los botones de navegación
 */
function createNavigationRow(currentPage: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1)
  );
}

/**
 * Crea o actualiza el mensaje de ayuda en el canal de recursos
 */
async function updateResourceMessage(client: Client): Promise<void> {
  try {
      const channel = await client.channels
      .fetch(CONFIG.RESOURCE_CHANNEL_ID)
      .catch(console.error) as TextChannel;
      if (!channel?.isTextBased()) {
      console.error(`No es un canal de texto válido: ${CONFIG.RESOURCE_CHANNEL_ID}`);
      return;
      }
      const perms = channel.permissionsFor(client.user!);
      if (!perms?.has(PermissionsBitField.Flags.SendMessages)) {
      console.error('Sin permisos para escribir en el canal de ayuda');
      return;
      }

    // Obtener todos los comandos
    const commands = (client as any).commands as Collection<string, HelpCommand>;
    if (!commands || commands.size === 0) {
      console.warn('No hay comandos registrados en el cliente');
      return;
    }

    // Generar páginas
    const pages = generateCommandPages(commands);
    if (pages.length === 0) return;

    // Crear botones de navegación
    const row = createNavigationRow(0, pages.length);

    // Buscar mensajes existentes del bot
    const messages = await channel.messages.fetch({ limit: 100 });
    const existingMessage = messages.find(m => 
      m.author.id === client.user?.id && 
      m.embeds.length > 0 && 
      m.embeds[0].title === '📖 Ayuda de Comandos'
    );

    // Actualizar o crear el mensaje
    if (existingMessage) {
      await existingMessage.edit({ embeds: [pages[0]], components: [row] });
    } else {
      const helpMessage = await channel.send({ embeds: [pages[0]], components: [row] });
      
      // Configurar el collector para los botones
      const collector = helpMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 0, // Sin tiempo límite
      });
      
      collector.on('collect', async (btn: ButtonInteraction) => {
        // Extraer número de página actual y total
        const embed = helpMessage.embeds[0];
        const footer = embed.footer?.text || '';
        const match = footer.match(/Página (\d+) de (\d+)/);
        if (!match) return;
        
        let currentPage = parseInt(match[1]) - 1;
        const totalPages = parseInt(match[2]);
        
        // Cambiar página según el botón
        if (btn.customId === 'prev') currentPage--;
        else if (btn.customId === 'next') currentPage++;
        
        if (currentPage < 0 || currentPage >= totalPages) return;
        
        // Actualizar con la nueva página
        const newRow = createNavigationRow(currentPage, totalPages);
        await btn.update({ embeds: [pages[currentPage]], components: [newRow] });
      });
    }

    console.log(`Mensaje de comandos actualizado en el canal ${channel.name}`);
  } catch (error) {
    console.error('Error al actualizar el mensaje de comandos:', error);
  }
}

/**
 * Configura la funcionalidad de ayuda automática
 */
export function setupAutoHelp(client: Client): void {
  // Actualizar los comandos cuando el bot esté listo
  client.once(Events.ClientReady, async () => {
    console.log('Inicializando sistema de ayuda automática...');
    await updateResourceMessage(client);
    
    // Configurar actualizaciones periódicas
    setInterval(() => updateResourceMessage(client), CONFIG.UPDATE_INTERVAL);
  });

  // Sobrescribir métodos para detectar cambios en comandos, solo si client.commands existe
  if ((client as any).commands) {
    const commands = (client as any).commands;
    const originalSet = commands.set;
    const originalDelete = commands.delete;
    
    if (originalSet && originalDelete) {
      // Sobrescribir el método set para detectar nuevos comandos
      commands.set = function(...args: any[]) {
        const result = originalSet.apply(this, args);
        updateResourceMessage(client);
        return result;
      };
      
      // Sobrescribir el método delete para detectar comandos eliminados
      commands.delete = function(...args: any[]) {
        const result = originalDelete.apply(this, args);
        updateResourceMessage(client);
        return result;
      };
    }
  }
}

// Exportar una función para refrescar manualmente
export async function refreshCommandDisplay(client: Client): Promise<void> {
  return updateResourceMessage(client);
}