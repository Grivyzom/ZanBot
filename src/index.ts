// src/index.ts
import 'dotenv/config';
import {
  Client,
  Collection,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  Partials,
  TextChannel,
  EmbedBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getEmbedColor } from './utils/getEmbedColor';

type Command = {
  data: { name: string; toJSON(): any };
  execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
};

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
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.User, Partials.GuildMember]
});

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
      .setColor(getEmbedColor()) // color dinámico :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
      .addFields(
        {
          name: 'Los pasos',
          value:
            '1. Abre tu Minecraft en cualquier versión superior a 1.20.1\n' +
            '2. Pulsa "Multijugador"\n' +
            '3. Presiona "Agregar servidor"\n' +
            '4. Completa la "Dirección del servidor" con: `play.grivyzom.com`\n' +
            '5. ¡Presiona y únete al servidor!',
        },
        {
          name: 'Información del servidor',
          value:
            '• Dirección del servidor (IP): `play.grivyzom.com`\n' +
            '• Nombre del servidor: Grivyzom\n' +
            '• Versión recomendada: `1.21.+`',
        }
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
});

// Manejador de interacciones slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log(`Comando no encontrado: ${interaction.commandName}`);
    return;
  }
  try {
    console.log(`Ejecutando comando: ${interaction.commandName}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error ejecutando ${interaction.commandName}:`, error);
    const responseContent = '❌ Ocurrió un error al ejecutar el comando.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: responseContent, ephemeral: true });
    } else {
      await interaction.reply({ content: responseContent, ephemeral: true });
    }
  }
});-

// Inicia sesión
client.login(TOKEN)
  .then(() => console.log('🔄 Iniciando sesión...'))
  .catch(err => console.error('❌ Error al iniciar sesión:', err));
