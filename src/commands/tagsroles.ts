// src/utils/tagRoles.ts - SISTEMA ESCALABLE

import { Guild, GuildMember } from 'discord.js';
import { getUserTags } from '../database';
import { getTagRoleId, getRoleCategories, TAG_CATEGORIES } from '../config/tagsConfig';

/**
 * Sistema de roles automáticos escalable basado en tags
 * Lee automáticamente los roles desde la configuración de tags
 */

/**
 * Asigna roles automáticamente basado en los tags del usuario
 */
export async function assignTagRoles(guild: Guild, member: GuildMember): Promise<void> {
  try {
    const userTags = await getUserTags(member.id, guild.id);
    const rolesToAdd: string[] = [];
    const rolesToRemove: string[] = [];

    // Procesar solo las categorías que tienen roles asociados
    const roleCategories = getRoleCategories();
    
    for (const category of roleCategories) {
      const userTagsInCategory = userTags.filter(tag => tag.tag_type === category.id);
      
      // Obtener todos los roles posibles de esta categoría
      const allCategoryRoles = category.options
        .map(option => option.roleId)
        .filter((roleId): roleId is string => !!roleId);
      
      if (userTagsInCategory.length > 0) {
        // Usuario tiene tags en esta categoría
        for (const userTag of userTagsInCategory) {
          const roleId = getTagRoleId(category.id, userTag.tag_value);
          
          if (roleId && guild.roles.cache.has(roleId) && !member.roles.cache.has(roleId)) {
            rolesToAdd.push(roleId);
          }
        }
        
        if (!category.multiSelect) {
          // Para categorías de selección única, remover otros roles de la categoría
          const userTagValues = userTagsInCategory.map(tag => tag.tag_value);
          for (const option of category.options) {
            if (option.roleId && 
                !userTagValues.includes(option.value) && 
                member.roles.cache.has(option.roleId)) {
              rolesToRemove.push(option.roleId);
            }
          }
        }
      } else {
        // Usuario no tiene tags en esta categoría, remover todos los roles de la categoría
        for (const roleId of allCategoryRoles) {
          if (guild.roles.cache.has(roleId) && member.roles.cache.has(roleId)) {
            rolesToRemove.push(roleId);
          }
        }
      }
    }

    // Aplicar cambios de roles
    if (rolesToAdd.length > 0) {
      try {
        await member.roles.add(rolesToAdd, 'Roles automáticos por tags');
        console.log(`✅ Roles añadidos a ${member.displayName}: ${rolesToAdd.length} roles`);
      } catch (error) {
        console.error(`❌ Error añadiendo roles a ${member.displayName}:`, error);
      }
    }

    if (rolesToRemove.length > 0) {
      try {
        await member.roles.remove(rolesToRemove, 'Actualización automática de roles por tags');
        console.log(`➖ Roles removidos de ${member.displayName}: ${rolesToRemove.length} roles`);
      } catch (error) {
        console.error(`❌ Error removiendo roles de ${member.displayName}:`, error);
      }
    }

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      console.log(`ℹ️ No hay cambios de roles para ${member.displayName}`);
    }

  } catch (error) {
    console.error(`❌ Error al asignar roles por tags a ${member.displayName}:`, error);
  }
}

/**
 * Actualiza los roles de todos los miembros del servidor basado en sus tags
 * Proceso optimizado con rate limiting
 */
export async function updateAllTagRoles(guild: Guild): Promise<void> {
  try {
    console.log('🔄 Iniciando actualización masiva de roles por tags...');
    
    const members = await guild.members.fetch();
    let processed = 0;
    let successful = 0;
    let errors = 0;
    
    for (const [, member] of members) {
      if (!member.user.bot) {
        try {
          await assignTagRoles(guild, member);
          successful++;
        } catch (error) {
          errors++;
          console.error(`❌ Error procesando ${member.displayName}:`, error);
        }
        
        processed++;
        
        // Rate limiting: pausa cada 10 miembros para evitar límites de Discord
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`📊 Progreso: ${processed}/${members.size} miembros procesados`);
        }
      }
    }
    
    console.log(`✅ Actualización de roles completada:`);
    console.log(`   📊 Total procesados: ${processed}`);
    console.log(`   ✅ Exitosos: ${successful}`);
    console.log(`   ❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error en actualización masiva de roles:', error);
  }
}

/**
 * Valida la configuración de roles y reporta problemas
 */
export async function validateRoleConfiguration(guild: Guild): Promise<{
  valid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  try {
    const roleCategories = getRoleCategories();
    
    for (const category of roleCategories) {
      for (const option of category.options) {
        if (option.roleId) {
          const role = guild.roles.cache.get(option.roleId);
          
          if (!role) {
            issues.push(`❌ Rol no encontrado para ${category.name} > ${option.label} (ID: ${option.roleId})`);
          } else {
            // Verificar posición del rol vs bot
            const botMember = guild.members.me;
            const botHighestRole = botMember?.roles.highest;
            
            if (botHighestRole && role.position >= botHighestRole.position) {
              issues.push(`⚠️ El rol "${role.name}" está por encima del rol del bot. No se podrá asignar.`);
            }
          }
        } else {
          if (category.hasRoles) {
            suggestions.push(`💡 Considera añadir un rol para ${category.name} > ${option.label}`);
          }
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
    
  } catch (error) {
    console.error('Error validando configuración de roles:', error);
    return {
      valid: false,
      issues: ['Error interno al validar configuración'],
      suggestions: []
    };
  }
}

/**
 * Genera un reporte de uso de roles por tags
 */
export async function generateRoleUsageReport(guild: Guild): Promise<{
  totalMembers: number;
  roleCategories: Array<{
    category: string;
    totalWithRoles: number;
    roleBreakdown: Array<{
      role: string;
      count: number;
      percentage: number;
    }>;
  }>;
}> {
  try {
    const members = await guild.members.fetch();
    const nonBotMembers = members.filter(m => !m.user.bot);
    const totalMembers = nonBotMembers.size;
    
    const roleCategories = getRoleCategories();
    const report = [];
    
    for (const category of roleCategories) {
      let totalWithRoles = 0;
      const roleBreakdown = [];
      
      for (const option of category.options) {
        if (option.roleId) {
          const role = guild.roles.cache.get(option.roleId);
          if (role) {
            const count = role.members.filter(m => !m.user.bot).size;
            totalWithRoles += count;
            
            roleBreakdown.push({
              role: option.label,
              count,
              percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0
            });
          }
        }
      }
      
      report.push({
        category: category.name,
        totalWithRoles,
        roleBreakdown: roleBreakdown.sort((a, b) => b.count - a.count)
      });
    }
    
    return {
      totalMembers,
      roleCategories: report
    };
    
  } catch (error) {
    console.error('Error generando reporte de roles:', error);
    throw error;
  }
}