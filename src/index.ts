// src/index.ts
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import GuildMemberAdd from './events/guildMemberAdd';
import GuildMemberRemove from './events/GuildMemberRemove';
import { registerMessageFilter } from './messageFilter';
import { data as embedText } from './commands/embedText';
import { data as embedImage } from './commands/embedImage';
import * as dotenv from 'dotenv';
dotenv.config();

const commands = [embedText.toJSON(), embedImage.toJSON()];
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,   // para messageCreate
    GatewayIntentBits.GuildBans,        // ¡necesario para guildBanAdd!
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`🚀 Bot listo como ${client.user?.tag}`);
});

// Instanciamos la clase en lugar de “llamarla”
// (antes hacías registerGuildMemberAdd(client);)
new GuildMemberAdd(client);
// Farewell handler
new GuildMemberRemove(client);
registerMessageFilter(client);
// Aquí podrías registrar más clases/eventos de la misma forma


client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('Login exitoso'))
  .catch(err => console.error('Error en login:', err));
