// src/index.ts
import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,            // ← nuevo: lo necesitamops para el select-menu
  Partials,
  TextChannel,
  EmbedBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { getEmbedColor } from './utils/getEmbedColor';
import GuildMemberAdd from './events/guildMemberAdd'
import ActivityTracker from './utils/activityRewards';   // ← añade esto
import { publishSupportEmbed } from './utils/supportEmbed';              // ← nuevo
import { createTicketFromSelect } from './utils/createTicketFromSelect'; // ← nuevo
import { initStatusApi } from './api/statusGRV';  // 👈 nuevo
import { publishTagsEmbed, handleTagsButtonInteraction } from './utils/tagsEmbed';
type Command = {
  data: { name: string; toJSON(): any };
  execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
};
import { initCleanerScheduler } from './utils/cleanerScheduler';



// Extiende la interfaz Client para añadir la propiedad 'commands'
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,     // ← necesarios
    GatewayIntentBits.MessageContent,    // ←
    GatewayIntentBits.GuildVoiceStates,   // ← si quieres XP por voz
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences          // 👈 nuevo
  ],
  partials: [Partials.User, Partials.GuildMember]
});

new GuildMemberAdd(client);
const tracker = new ActivityTracker(client);
client.on('messageCreate',  msg                    => tracker.processMessage(msg));
client.on('voiceStateUpdate', (oldS, newS)        => tracker.processVoiceState(oldS, newS));

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Faltan TOKEN, CLIENT_ID o GUILD_ID en .env');
  process.exit(1);
}

client.commands = new Collection<string, Command>();

// Carga de comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(filePath)
    .then(mod => {
      const command = (mod.default || mod) as Command;
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando cargado: ${command.data.name}`);
      } else {
        console.warn(`⚠️ El archivo ${file} no exporta correctamente 'data' y 'execute'.`);
      }
    })
    .catch(err => {
      console.error(`❌ Error al cargar el comando ${file}:`, err);
    });
}

client.once('ready', async () => {
  console.log(`✅ Conectado como ${client.user!.tag}`);
  console.log('Comandos disponibles:', [...client.commands.keys()]);
  initStatusApi(client);
  await initCleanerScheduler(client);
  
  // IDs de canales para los embeds automáticos
  const javaId = process.env.JAVA_CHANNEL_ID!;
  const bedId  = process.env.BEDROCK_CHANNEL_ID!;
  if (!javaId || !bedId) {
    console.warn('⚠️ Faltan JAVA_CHANNEL_ID o BEDROCK_CHANNEL_ID en .env');
    return;
  }

  // Helper para detectar si ya existe un embed con ese título
  const existsEmbed = async (ch: TextChannel, title: string) =>
    (await ch.messages.fetch({ limit: 50 }))
      .some(m => m.author.id === client.user!.id && m.embeds[0]?.title === title);

  // Publicar embed de Java si no existe
  const javaCh = await client.channels.fetch(javaId) as TextChannel;
  if (javaCh && !(await existsEmbed(javaCh, '¡Cómo unirse en Java! (Computadora)'))) {
    const embedJava = new EmbedBuilder()
      .setTitle('¡Cómo unirse en Java! (Computadora)')
      .setDescription('¡Unirse a Grivyzom en Java es súper fácil!')
      .setColor(getEmbedColor())
      .addFields(
        {
          name: 'Los pasos',
          value:
            '1. Abre tu Minecraft en cualquier versión superior a 1.20.1\n' +
            '2. Pulsa "Multijugador"\n' +
            '3. Presiona "Agregar servidor"\n' +
            '4. Introduce `java.grivyzom.com`\n' +
            '5. ¡Disfruta!',
        },
      )
      .setFooter({ text: '¿Quieres unirte en Bedrock? Ve a <#1371879333651677244>' })
      .setImage('https://grivyzom.com/bedrock.png');
    await javaCh.send({ embeds: [embedJava] });
  }

  
  // Publicar embed de Bedrock si no existe
  const bedCh = await client.channels.fetch(bedId) as TextChannel;
  if (bedCh && !(await existsEmbed(bedCh, '¡Cómo unirse en Bedrock! (Móvil)'))) {
    const embedBed = new EmbedBuilder()
      .setTitle('¡Cómo unirse en Bedrock! (Móvil)')
      .setDescription(
        '¡Unirse a Grivyzom en Bedrock es súper fácil!\n\n' +
        'Hay varias formas de unirse a Bedrock Edition. Te recomendamos buscar un tutorial dependiendo de tu plataforma.'
      )
      .setColor(getEmbedColor())
      .addFields({
        name: 'Información del servidor',
        value:
          '• Dirección del servidor (IP): `bedrock.grivyzom.com`\n' +
          '• Puerto del servidor: `21384`\n' +
          '• Nombre del servidor: Grivyzom',
      })
      .setFooter({ text: '¿Quieres unirte con Java? Ve a <#123456789012345678>' })
      .setImage('https://grivyzom.com/bedrock.png');
    await bedCh.send({ embeds: [embedBed] });
  }

  // Publicar embed de Soporte                 ← nuevo bloque
  const supportChannelId = process.env.SUPPORT_CHANNEL_ID;
  if (!supportChannelId) {
    console.warn('⚠️ Falta SUPPORT_CHANNEL_ID en .env');
  } else {
    const supportCh = await client.channels.fetch(supportChannelId);
    if (supportCh && supportCh.isTextBased()) {
      await publishSupportEmbed(supportCh as TextChannel);
    } else {
      console.warn('⚠️ No se pudo encontrar o no es un canal de texto.');
    }
  }
  
  // ---- NUEVO: Publicar embed de Tags ----
  const tagsChannelId = process.env.TAGS_CHANNEL_ID;
  if (!tagsChannelId) {
    console.warn('⚠️ Falta TAGS_CHANNEL_ID en .env');
  } else {
    const tagsCh = await client.channels.fetch(tagsChannelId);
    if (tagsCh && tagsCh.isTextBased()) {
      await publishTagsEmbed(tagsCh as TextChannel);
    } else {
      console.warn('⚠️ No se pudo encontrar el canal de tags o no es un canal de texto.');
    }
  }

});

// Manejador de interacciones slash y select-menu
client.on('interactionCreate', async interaction => {

  // **Botones de tags**
  if (interaction.isButton() && interaction.customId.startsWith('tags-')) {
    try {
      await handleTagsButtonInteraction(interaction);
    } catch (err) {
      console.error('Error en botón de tags:', err);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Hubo un problema con esta acción.',
          ephemeral: true,
        });
      }
    }
    return;
  }

  // **Select-menu de soporte**           ← nuevo bloque
  if (interaction.isStringSelectMenu() && interaction.customId === 'support-category') {
    const category = interaction.values[0];

    try {
      // Directamente llamamos a tu wrapper, que invoca ticketExecute()
      await createTicketFromSelect(interaction, category);
    } catch (err) {
      console.error(err);
      // Como ticketExecute no pudo responder, aquí sí damos un reply fallback
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Hubo un problema al crear el ticket.',
          ephemeral: true,
        });
      }
    }


  }


  // **Slash commands** (tu manejador original)  
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log(`Comando no encontrado: ${interaction.commandName}`);
    return;
  }
  try {
    console.log(`Ejecutando comando: ${interaction.commandName}`);
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error ejecutando ${interaction.commandName}:`, error);
    const responseContent = '❌ Ocurrió un error al ejecutar el comando.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: responseContent, ephemeral: true });
    } else {
      await interaction.reply({ content: responseContent, ephemeral: true });
    }
  }

  

});
// Inicia sesión
client.login(TOKEN)
  .then(() => console.log('🔄 Iniciando sesión...'))
  .catch(err => console.error('❌ Error al iniciar sesión:', err));
