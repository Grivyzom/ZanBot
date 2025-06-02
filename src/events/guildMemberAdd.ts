// src/events/guildMemberAdd.ts - VERSIÓN ACTUALIZADA
import {
  Client,
  GuildMember,
  TextChannel,
  EmbedBuilder,
  ColorResolvable,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export default class GuildMemberAdd {
  constructor(private client: Client) {
    this.client.on('guildMemberAdd', this.run.bind(this));
  }

  private async run(member: GuildMember) {
    console.log(`[guildMemberAdd] Usuario ${member.user.tag} se unió al servidor`);

    // 1️⃣ Otorgar rol "Nuevo" automáticamente
    const newRoleId = process.env.ROLE_NUEVO;
    if (newRoleId) {
      try {
        await member.roles.add(newRoleId, 'Usuario nuevo - rol automático');
        console.log(`✅ Rol "Nuevo" otorgado a ${member.user.tag}`);
      } catch (error) {
        console.error(`❌ Error al otorgar rol "Nuevo" a ${member.user.tag}:`, error);
      }
    } else {
      console.warn('⚠️ ROLE_NUEVO no está configurado en .env');
    }

    // 2️⃣ Elegir color aleatorio para embeds
    const COLORS: ColorResolvable[] = [
      '#FFA500', // naranja
      '#00AAFF', // azul
      '#8A2BE2', // violeta
      '#00FF7F', // verde
      '#FF69B4'  // rosa
    ];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // 3️⃣ Crear botones para elegir procedencia
    const welcomeButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`origin_community_${member.id}`)
          .setLabel('Vengo por la Comunidad')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId(`origin_network_${member.id}`)
          .setLabel('Vengo por la Network')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setCustomId(`origin_both_${member.id}`)
          .setLabel('Ambas')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🤝')
      );

    // 4️⃣ Embed público con botones de procedencia
    const publicEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`¡Bienvenido/a ${member.user.username}! 🎉`)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL() ?? undefined
      })
      .setDescription(
        `¡Hola ${member.user}! Nos alegra mucho tenerte aquí.\n\n` +
        `**¿Cómo nos conociste?** 🤔\n` +
        `Por favor selecciona una opción para recibir tu rol correspondiente:`
      )
      .addFields(
        {
          name: '👥 Comunidad',
          value: 'Si vienes por nuestra comunidad de Discord',
          inline: true
        },
        {
          name: '🌐 Network',
          value: 'Si vienes por nuestros servidores/network',
          inline: true
        },
        {
          name: '🤝 Ambas',
          value: 'Si nos conoces por ambas partes',
          inline: true
        },
        {
          name: 'Canales recomendados',
          value:
            '> <#1370560459677110303>\n' +
            '> <#1370582114382250044>',
          inline: false
        },
        {
          name: '\n',
          value: `• ¡Ahora somos \`${member.guild.memberCount}\` usuarios en el servidor!`,
          inline: false
        }
      )
      .setImage('https://grivyzom.com/banner-discord-grv.gif')
      .setTimestamp()
      .setFooter({
        text: `${member.guild.name} • Selecciona tu procedencia arriba`,
        iconURL: member.guild.iconURL() ?? undefined
      });

    // 5️⃣ Enviar mensaje público al canal de bienvenida
    const channelId = process.env.WELCOME_CHANNEL_ID!;
    const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (channel?.isTextBased()) {
      try {
        await channel.send({ 
          content: `¡Bienvenido/a ${member}!`,
          embeds: [publicEmbed], 
          components: [welcomeButtons] 
        });
        console.log(`✅ Mensaje de bienvenida enviado para ${member.user.tag}`);
      } catch (error) {
        console.error(`❌ Error enviando mensaje de bienvenida:`, error);
      }
    } else {
      console.warn('⚠️ Canal de bienvenida no encontrado o no es de texto');
    }

    // 6️⃣ Embed privado por DM (sin botones)
    const dmEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`¡Bienvenido/a a ${member.guild.name}!`)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL() ?? undefined
      })
      .setDescription(
        `Hola ${member.user}, nos alegra mucho que te unas a **${member.guild.name}**.\n\n` +
        `**📝 Importante:** Ve al canal de bienvenida y selecciona cómo nos conociste para recibir tu rol correspondiente.\n\n` +
        `Aquí tienes algunos recursos para empezar:`
      )
      .addFields(
        {
          name: 'Canales recomendados',
          value:
            '> <#1370560459677110303>\n' +
            '> <#1370582114382250044>',
          inline: false
        },
        { name: '🌐 Web', value: '[Página Oficial](https://grivyzom.com/)', inline: true },
        { name: '🛒 Tienda', value: '[Tienda Network](https://store.grivyzom.com/)', inline: true },
        { name: '❓ Soporte', value: 'Crea un ticket en el servidor', inline: true }
      )
      .setImage('https://grivyzom.com/banner-discord-grv.gif')
      .setTimestamp()
      .setFooter({
        text: `${member.guild.name} • ¡No olvides seleccionar tu procedencia!`,
        iconURL: member.guild.iconURL() ?? undefined
      });

    // 7️⃣ Enviar DM de bienvenida
    try {
      await member.send({ embeds: [dmEmbed] });
      console.log(`✅ DM enviado a ${member.user.tag}`);
    } catch (error) {
      console.warn(`⚠️ No se pudo enviar DM a ${member.user.tag}:`, error);
    }

    // 8️⃣ Configurar timeout para remover botones después de 24 horas
    setTimeout(async () => {
      try {
        if (channel?.isTextBased()) {
          const messages = await channel.messages.fetch({ limit: 50 });
          const welcomeMessage = messages.find(msg => 
            msg.embeds[0]?.title?.includes(`¡Bienvenido/a ${member.user.username}!`) &&
            msg.components.length > 0
          );
          
          if (welcomeMessage) {
            await welcomeMessage.edit({ 
              embeds: welcomeMessage.embeds,
              components: [] // Remover botones
            });
            console.log(`🕐 Botones de bienvenida removidos para ${member.user.tag} (24h)`);
          }
        }
      } catch (error) {
        console.error('Error removiendo botones de bienvenida:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }
}