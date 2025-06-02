// src/utils/tagRoles.ts
import { Guild, GuildMember } from 'discord.js';
import { getUserTags } from '../database';

// Configuración de roles por tags
export const TAG_ROLES_CONFIG = {
  country: {
    'mexico': '1234567890123456789', // ID del rol México
    'spain': '1234567890123456788',  // ID del rol España
    'argentina': '1234567890123456787', // etc...
  },
  minecraft_version: {
    'java': '1234567890123456786',    // ID del rol Java Player
    'bedrock': '1234567890123456785', // ID del rol Bedrock Player
    'both': '1234567890123456784',    // ID del rol Multi-Platform
  },
  programming: {
    'javascript': '1234567890123456783', // ID del rol JavaScript Dev
    'python': '1234567890123456782',     // ID del rol Python Dev
    'java': '1234567890123456781',       // ID del rol Java Dev
    // Añadir más según necesites
  },
  age_range: {
    '13-15': '1234567890123456780',   // ID del rol Teen
    '16-18': '1234567890123456779',   // ID del rol Young Adult
    '19-25': '1234567890123456778',   // ID del rol Adult
    '26-35': '1234567890123456777',   // ID del rol Mature
    '36+': '1234567890123456776',     // ID del rol Senior
  }
};

/**
 * Asigna roles automáticamente basado en los tags del usuario
 */
export async function assignTagRoles(guild: Guild, member: GuildMember): Promise<void> {
  try {
    const userTags = await getUserTags(member.id, guild.id);
    const rolesToAdd: string[] = [];
    const rolesToRemove: string[] = [];

    // Procesar cada categoría de tags
    for (const [categoryId, roleMapping] of Object.entries(TAG_ROLES_CONFIG)) {
      const userTagsInCategory = userTags.filter(tag => tag.tag_type === categoryId);
      
      // Obtener todos los roles posibles de esta categoría
      const allCategoryRoles = Object.values(roleMapping);
      
      if (userTagsInCategory.length > 0) {
        // Usuario tiene tags en esta categoría
        for (const userTag of userTagsInCategory) {
          const roleId = roleMapping[userTag.tag_value as keyof typeof roleMapping];
          if (roleId && !member.roles.cache.has(roleId)) {
            rolesToAdd.push(roleId);
          }
        }
        
        // Remover roles de esta categoría que ya no aplican
        const userTagValues = userTagsInCategory.map(tag => tag.tag_value);
        for (const [tagValue, roleId] of Object.entries(roleMapping)) {
          if (!userTagValues.includes(tagValue) && member.roles.cache.has(roleId)) {
            rolesToRemove.push(roleId);
          }
        }
      } else {
        // Usuario no tiene tags en esta categoría, remover todos los roles de la categoría
        for (const roleId of allCategoryRoles) {
          if (member.roles.cache.has(roleId)) {
            rolesToRemove.push(roleId);
          }
        }
      }
    }

    // Aplicar cambios de roles
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
      console.log(`✅ Roles añadidos a ${member.displayName}: ${rolesToAdd.join(', ')}`);
    }

    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
      console.log(`➖ Roles removidos de ${member.displayName}: ${rolesToRemove.join(', ')}`);
    }

  } catch (error) {
    console.error(`❌ Error al asignar roles por tags a ${member.displayName}:`, error);
  }
}

/**
 * Actualiza los roles de todos los miembros del servidor basado en sus tags
 * (Usar con cuidado, puede ser intensivo)
 */
export async function updateAllTagRoles(guild: Guild): Promise<void> {
  try {
    console.log('🔄 Iniciando actualización masiva de roles por tags...');
    
    const members = await guild.members.fetch();
    let processed = 0;
    
    for (const [, member] of members) {
      if (!member.user.bot) {
        await assignTagRoles(guild, member);
        processed++;
        
        // Pequeña pausa para evitar rate limits
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log(`✅ Actualización de roles completada. ${processed} miembros procesados.`);
    
  } catch (error) {
    console.error('❌ Error en actualización masiva de roles:', error);
  }
}

/**
 * Crea los roles necesarios si no existen
 */
export async function createTagRoles(guild: Guild): Promise<void> {
  try {
    const rolesToCreate = [
      // Roles de país
      { name: '🇲🇽 México', color: '#00FF00', categoryId: 'country', tagValue: 'mexico' },
      { name: '🇪🇸 España', color: '#FF0000', categoryId: 'country', tagValue: 'spain' },
      { name: '🇦🇷 Argentina', color: '#00FFFF', categoryId: 'country', tagValue: 'argentina' },
      
      // Roles de Minecraft
      { name: '☕ Java Player', color: '#FF6600', categoryId: 'minecraft_version', tagValue: 'java' },
      { name: '🪨 Bedrock Player', color: '#996633', categoryId: 'minecraft_version', tagValue: 'bedrock' },
      { name: '🔄 Multi-Platform', color: '#9933FF', categoryId: 'minecraft_version', tagValue: 'both' },
      
      // Roles de programación
      { name: '🟨 JavaScript Dev', color: '#F7DF1E', categoryId: 'programming', tagValue: 'javascript' },
      { name: '🐍 Python Dev', color: '#3776AB', categoryId: 'programming', tagValue: 'python' },
      { name: '☕ Java Dev', color: '#ED8B00', categoryId: 'programming', tagValue: 'java' },
      
      // Roles de edad
      { name: '👶 Teen (13-15)', color: '#FFB6C1', categoryId: 'age_range', tagValue: '13-15' },
      { name: '🧒 Young Adult (16-18)', color: '#87CEEB', categoryId: 'age_range', tagValue: '16-18' },
      { name: '👨‍🎓 Adult (19-25)', color: '#98FB98', categoryId: 'age_range', tagValue: '19-25' },
      { name: '👨‍💼 Mature (26-35)', color: '#DDA0DD', categoryId: 'age_range', tagValue: '26-35' },
      { name: '👨‍🦳 Senior (36+)', color: '#F0E68C', categoryId: 'age_range', tagValue: '36+' },
    ];

    for (const roleData of rolesToCreate) {
      const existingRole = guild.roles.cache.find(role => role.name === roleData.name);
      
      if (!existingRole) {
        const newRole = await guild.roles.create({
          name: roleData.name,
          color: roleData.color as any,
          reason: 'Rol automático para sistema de tags',
          mentionable: false,
        });
        
        console.log(`✅ Rol creado: ${roleData.name} (${newRole.id})`);
        
        // Actualizar la configuración con el nuevo ID
        if (!TAG_ROLES_CONFIG[roleData.categoryId as keyof typeof TAG_ROLES_CONFIG]) {
          (TAG_ROLES_CONFIG as any)[roleData.categoryId] = {};
        }
        (TAG_ROLES_CONFIG as any)[roleData.categoryId][roleData.tagValue] = newRole.id;
      }
    }
    
  } catch (error) {
    console.error('❌ Error al crear roles de tags:', error);
  }
}