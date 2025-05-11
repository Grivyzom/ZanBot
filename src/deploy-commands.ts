// src/index.ts
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import GuildMemberAdd from './events/guildMemberAdd';
import GuildMemberRemove from './events/GuildMemberRemove';
import { registerMessageFilter } from './messageFilter';
import { data as embedText } from './commands/embedText';
import { data as embedImage } from './commands/embedImage';
import * as dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
dotenv.config();


const clientId = process.env.CLIENT_ID!;
const guildId  = process.env.GUILD_ID!;
const token    = process.env.TOKEN!;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const { data } = await import(path.join(commandsPath, file));
  commands.push(data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log(`🔄 Registrando ${commands.length} comandos en el guild ${guildId}…`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Comandos desplegados correctamente.');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
})();
