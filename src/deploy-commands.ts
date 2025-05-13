// src/deploy-commands.ts
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;
    if (!CLIENT_ID || !GUILD_ID || !TOKEN) {
      console.error('❌ Falta CLIENT_ID, GUILD_ID o TOKEN en .env');
      process.exit(1);
    }

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    
    // Verificar si el directorio existe
    if (!fs.existsSync(commandsPath)) {
      console.error(`❌ El directorio ${commandsPath} no existe.`);
      process.exit(1);
    }
    
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    
    if (files.length === 0) {
      console.warn('⚠️ No se encontraron archivos de comando en el directorio.');
    }

    console.log(`🔍 Encontrados ${files.length} archivos de comando.`);

    for (const file of files) {
      try {
        const filePath = path.join(commandsPath, file);
        console.log(`🔄 Cargando comando desde: ${filePath}`);
        
        const commandModule = await import(filePath);
        
        // Comprobar si tiene la estructura correcta
        const command = commandModule.default || commandModule;
        
        if (!command.data) {
          console.warn(`⚠️ El archivo ${file} no exporta una propiedad 'data'.`);
          continue;
        }
        
        if (typeof command.data.toJSON !== 'function') {
          console.warn(`⚠️ La propiedad 'data' en ${file} no tiene un método 'toJSON'.`);
          continue;
        }
        
        const commandData = command.data.toJSON();
        commands.push(commandData);
        require('./commands/testBoost').default.data.toJSON(),
        console.log(`✅ Comando "${commandData.name}" cargado correctamente.`);
      } catch (error) {
        console.error(`❌ Error al cargar el comando ${file}:`, error);
      }
    }

    if (commands.length === 0) {
      console.error('❌ No se pudo cargar ningún comando válido.');
      process.exit(1);
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    console.log(`🔄 Registrando ${commands.length} comandos en el guild ${GUILD_ID}…`);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ ${Array.isArray(data) ? data.length : 0} comandos desplegados correctamente.`);
  } catch (err) {
    console.error('❌ Error en el script de despliegue:', err);
    process.exit(1);
  }
})();