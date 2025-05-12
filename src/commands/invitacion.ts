import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('invitacion') // Discord no permite tildes en el nombre del slash command
  .setDescription('Genera una invitación temporal para el servidor')
  .addIntegerOption(option =>
    option
      .setName('duracion')
      .setDescription('Duración de la invitación en horas (1‑24)')
      .setMinValue(1)
      .setMaxValue(24)
      .setRequired(false)
  );

type Interaction = ChatInputCommandInteraction & { inCachedGuild: () => boolean };

export async function execute(interaction: Interaction) {
  const durationHours = interaction.options.getInteger('duracion') ?? 1; // valor por defecto: 1 h

  // Solo se puede usar en servidores
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: '🚫 Este comando solo puede usarse dentro de un servidor.', ephemeral: true });
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({ content: '❌ No se pudo crear la invitación en este canal.', ephemeral: true });
  }

  try {
    const invite = await channel.createInvite({
      maxAge: durationHours * 3600, // en segundos
      unique: true,
      maxUses: 1
    });

    const expiryDate = new Date(Date.now() + durationHours * 3600 * 1000);

    const embed = new EmbedBuilder()
      .setTitle('📨 Invitación generada')
      .setDescription(`Enlace de invitación (1 uso):\n${invite.url}`)
      .addFields({ name: 'Duración', value: `${durationHours} hora(s)` })
      .setFooter({ text: `Expira el ${expiryDate.toLocaleString('es-ES')}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error al crear la invitación:', error);
    await interaction.reply({ content: '⚠️ No fue posible crear la invitación.', ephemeral: true });
  }
}

export default { data, execute };
