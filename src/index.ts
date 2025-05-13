// src/index.ts
import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, ChatInputCommandInteraction, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';

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

// Inicializa el cliente de Discord con intents necesarios
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences  // Importante para la información de presencia
  ],
  partials: [Partials.User, Partials.GuildMember]
});

// Carga variables de entorno
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Faltan TOKEN, CLIENT_ID o GUILD_ID en .env');
  process.exit(1);
}

// Inicializa la colección de comandos
client.commands = new Collection<string, Command>();

// Ruta y lectura de los archivos de comando
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

// Cargar los comandos
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(filePath).then(commandModule => {
    const command = commandModule.default || commandModule;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando cargado: ${command.data.name}`);
    } else {
      console.warn(`⚠️ El archivo ${file} no exporta correctamente 'data' y 'execute'.`);
    }
  }).catch(error => {
    console.error(`❌ Error al cargar el comando ${file}:`, error);
  });
}

// Cargar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

for (const file of eventFiles) {
  import(path.join(eventsPath, file)).then(mod => {
    const event = mod.default;
    if (event && event.name && event.execute) {
      client.on(event.name, (...args) => event.execute(...args));
      console.log(`✅ Evento cargado: ${event.name}`);
    }
  }).catch(error => {
    console.error(`❌ Error al cargar el evento ${file}:`, error);
  });
}

// Evento ready
client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user!.tag}`);
  console.log('Comandos disponibles:', [...client.commands.keys()]);
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
});

// Inicia sesión
client.login(TOKEN).then(() => {
  console.log('🔄 Iniciando sesión...');
}).catch(error => {
  console.error('❌ Error al iniciar sesión:', error);
});