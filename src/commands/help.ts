import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction,
  Collection,
  PermissionsBitField,
  PermissionFlagsBits,
  GuildMember,
  Message,
} from 'discord.js';

// Configuración del comando /help
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Muestra los comandos que tienes disponibles, de forma paginada.');

// Número de comandos por página
const COMMANDS_PER_PAGE = 5;

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
 * Ejecuta el comando /help: muestra comandos filtrados según permisos del usuario.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember | null;

  // Recolectar todos los comandos registrados en el cliente
  const allCommands = (interaction.client as any).commands as Collection<string, HelpCommand>;

  // Filtrar según permisos del miembro
  const cmds = Array.from(allCommands.values()).filter((c) => canUseCommand(member, c));
  if (cmds.length === 0) {
    await interaction.reply({ content: 'No tienes comandos disponibles.', ephemeral: true });
    return;
  }

  // Crear páginas
  const pages: EmbedBuilder[] = [];
  for (let i = 0; i < cmds.length; i += COMMANDS_PER_PAGE) {
    const slice = cmds.slice(i, i + COMMANDS_PER_PAGE);
    const embed = new EmbedBuilder()
      .setTitle('📖 Ayuda de Comandos')
      .setColor(0x5865f2)
      .setFooter({ text: `Página ${Math.floor(i / COMMANDS_PER_PAGE) + 1} de ${Math.ceil(cmds.length / COMMANDS_PER_PAGE)}` });

    for (const cmd of slice) {
      embed.addFields({ name: `/${cmd.data.name}`, value: cmd.data.description, inline: false });
    }
    pages.push(embed);
  }

  let currentPage = 0;

  // Botones de navegación
  const row = (page: number) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === pages.length - 1)
    );

  // Enviar respuesta inicial
  await interaction.reply({ embeds: [pages[currentPage]], components: [row(currentPage)], ephemeral: true });

  const message = (await interaction.fetchReply()) as Message;

  // Collector para botones
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
  });

  collector.on('collect', async (btn: ButtonInteraction) => {
    if (btn.customId === 'prev') currentPage--;
    if (btn.customId === 'next') currentPage++;

    await btn.update({ embeds: [pages[currentPage]], components: [row(currentPage)] });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    await interaction.editReply({ components: [disabledRow] });
  });
}
