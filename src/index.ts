// src/index.ts
import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, ChatInputCommandInteraction } from 'discord.js';
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
  intents: [GatewayIntentBits.Guilds]
});

// Carga variables de entorno
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Faltan TOKEN, CLIENT_ID o GUILD_ID en .env');
  process.exit(1);
}

// Inicializa la colección de comandos
client.commands = new Collection<string, Command>();
console.log('Comandos cargados:', [...client.commands.keys()]);
// Ruta y lectura de los archivos de comando
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command: Command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ El archivo ${file} no exporta correctamente 'data' y 'execute'.`);
  }
}

// Evento ready
client.once('ready', () => {
  console.log(`✅ Conectado como ${client.user!.tag}`);
});

// Manejador de interacciones slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error ejecutando ${interaction.commandName}:`, error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true });
    }
  }
});

// Inicia sesión
client.login(TOKEN);
