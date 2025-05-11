// src/deploy-commands.ts
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

(async () => {
  const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;
  if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
    console.error('❌ Falta CLIENT_ID, GUILD_ID o TOKEN en .env');
    return;
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

  for (const file of files) {
    const { data } = await import(path.join(commandsPath, file));
    commands.push(data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log(`🔄 Registrando ${commands.length} comandos en el guild ${GUILD_ID}…`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos desplegados correctamente.');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
})();
