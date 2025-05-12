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
  Message
} from 'discord.js';

// Configuración del comando /help
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Muestra la lista de comandos disponibles de forma paginada.');

// Número de comandos por página
const COMMANDS_PER_PAGE = 5;

// Tipo mínimo para representar un comando en /help
type HelpCommand = {
  data: {
    name: string;
    description: string;
  };
};

/**
 * Ejecuta el comando /help: genera un embed paginado con botones.
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Recolectar todos los comandos registrados en el cliente
  const allCommands = (interaction.client as any).commands as Collection<string, HelpCommand>;
  const cmds = Array.from(allCommands.values());

  // Crear páginas de comandos
  const pages: EmbedBuilder[] = [];
  for (let i = 0; i < cmds.length; i += COMMANDS_PER_PAGE) {
    const slice = cmds.slice(i, i + COMMANDS_PER_PAGE);
    const embed = new EmbedBuilder()
      .setTitle('📖 Lista de Comandos')
      .setColor(0x0099ff)
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
        .setLabel('« Anterior')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Siguiente »')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pages.length - 1)
    );

  // Enviar respuesta inicial
  await interaction.reply({
    embeds: [pages[currentPage]],
    components: [row(currentPage)],
    ephemeral: true,
  });

  const message = (await interaction.fetchReply()) as Message;

  // Collector para botones
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
  });

  collector.on('collect', async (btn: ButtonInteraction) => {
    // Cambiar página
    if (btn.customId === 'prev') currentPage--;
    if (btn.customId === 'next') currentPage++;

    // Actualizar mensaje con nueva página
    await btn.update({
      embeds: [pages[currentPage]],
      components: [row(currentPage)],
    });
  });

  collector.on('end', async () => {
    // Deshabilitar botones al finalizar
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('« Anterior').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('next').setLabel('Siguiente »').setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    await interaction.editReply({ components: [disabledRow] });
  });
}
