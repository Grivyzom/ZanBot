import { GuildMember } from 'discord.js';

export interface RankRole { level: number; id: string; }

export const rankRoles: RankRole[] = [
  { level: 0, id: process.env.ROLE_NUEVO   ?? '' }, // Nuevo
  { level: 5, id: process.env.ROLE_MIEMBRO ?? '' }, // Miembro
  // …añade más si hace falta
].filter(r => r.id);

export async function applyRankRoles(member: GuildMember, level: number) {
  const target = rankRoles.filter(r => level >= r.level)
                          .sort((a, b) => b.level - a.level)[0];
  if (!target) return;

  if (!member.roles.cache.has(target.id)) {
    await member.roles.add(target.id, 'Rank-up');
  }

  const toRemove = rankRoles.map(r => r.id)
                            .filter(id => id !== target.id && member.roles.cache.has(id));
  if (toRemove.length) {
    await member.roles.remove(toRemove, 'Rank-up');
  }
}
