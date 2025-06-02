// src/config/tagsConfig.ts

export interface TagOption {
  label: string;
  value: string;
  emoji?: string;
  description?: string;
}

export interface TagCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
  options: TagOption[];
  multiSelect?: boolean;
  roles?: string[]; // Roles que se asignarán al seleccionar
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'country',
    name: 'País',
    description: 'Selecciona tu país de origen',
    emoji: '🌎',
    options: [
      { label: 'México', value: 'mexico', emoji: '🇲🇽' },
      { label: 'España', value: 'spain', emoji: '🇪🇸' },
      { label: 'Argentina', value: 'argentina', emoji: '🇦🇷' },
      { label: 'Colombia', value: 'colombia', emoji: '🇨🇴' },
      { label: 'Chile', value: 'chile', emoji: '🇨🇱' },
      { label: 'Perú', value: 'peru', emoji: '🇵🇪' },
      { label: 'Venezuela', value: 'venezuela', emoji: '🇻🇪' },
      { label: 'Estados Unidos', value: 'usa', emoji: '🇺🇸' },
      { label: 'Otros', value: 'other', emoji: '🌐' }
    ]
  },
  {
    id: 'age_range',
    name: 'Rango de Edad',
    description: 'Selecciona tu rango de edad',
    emoji: '🎂',
    options: [
      { label: '13-15 años', value: '13-15', emoji: '👶' },
      { label: '16-18 años', value: '16-18', emoji: '🧒' },
      { label: '19-25 años', value: '19-25', emoji: '👨‍🎓' },
      { label: '26-35 años', value: '26-35', emoji: '👨‍💼' },
      { label: '36+ años', value: '36+', emoji: '👨‍🦳' }
    ]
  },
  {
    id: 'minecraft_version',
    name: 'Versión de Minecraft',
    description: 'Selecciona tu versión principal de Minecraft',
    emoji: '⛏️',
    options: [
      { label: 'Java Edition', value: 'java', emoji: '☕' },
      { label: 'Bedrock Edition', value: 'bedrock', emoji: '🪨' },
      { label: 'Ambas', value: 'both', emoji: '🔄' }
    ]
  },
  {
    id: 'games',
    name: 'Juegos Favoritos',
    description: 'Selecciona tus juegos favoritos (puedes elegir varios)',
    emoji: '🎮',
    multiSelect: true,
    options: [
      { label: 'Minecraft', value: 'minecraft', emoji: '⛏️' },
      { label: 'Fortnite', value: 'fortnite', emoji: '🌪️' },
      { label: 'Roblox', value: 'roblox', emoji: '🔴' },
      { label: 'Among Us', value: 'among-us', emoji: '🚀' },
      { label: 'Fall Guys', value: 'fall-guys', emoji: '👑' },
      { label: 'Valorant', value: 'valorant', emoji: '🎯' },
      { label: 'League of Legends', value: 'lol', emoji: '⚔️' },
      { label: 'Genshin Impact', value: 'genshin', emoji: '⚡' },
      { label: 'Apex Legends', value: 'apex', emoji: '🏆' },
      { label: 'Call of Duty', value: 'cod', emoji: '🔫' }
    ]
  },
  {
    id: 'programming',
    name: 'Lenguajes de Programación',
    description: 'Selecciona los lenguajes que conoces',
    emoji: '💻',
    multiSelect: true,
    options: [
      { label: 'JavaScript', value: 'javascript', emoji: '🟨' },
      { label: 'Python', value: 'python', emoji: '🐍' },
      { label: 'Java', value: 'java', emoji: '☕' },
      { label: 'C++', value: 'cpp', emoji: '🔧' },
      { label: 'C#', value: 'csharp', emoji: '🔷' },
      { label: 'PHP', value: 'php', emoji: '🐘' },
      { label: 'TypeScript', value: 'typescript', emoji: '🔷' },
      { label: 'Go', value: 'go', emoji: '🐹' },
      { label: 'Rust', value: 'rust', emoji: '🦀' },
      { label: 'No programo', value: 'none', emoji: '❌' }
    ]
  },
  {
    id: 'interests',
    name: 'Intereses',
    description: 'Selecciona tus intereses principales',
    emoji: '🌟',
    multiSelect: true,
    options: [
      { label: 'Gaming', value: 'gaming', emoji: '🎮' },
      { label: 'Programación', value: 'programming', emoji: '💻' },
      { label: 'Arte', value: 'art', emoji: '🎨' },
      { label: 'Música', value: 'music', emoji: '🎵' },
      { label: 'Deportes', value: 'sports', emoji: '⚽' },
      { label: 'Anime/Manga', value: 'anime', emoji: '🎌' },
      { label: 'Películas/Series', value: 'movies', emoji: '🎬' },
      { label: 'Lectura', value: 'reading', emoji: '📚' },
      { label: 'Fotografía', value: 'photography', emoji: '📸' },
      { label: 'Viajes', value: 'travel', emoji: '✈️' }
    ]
  }
];

// Funciones de utilidad
export function getTagCategoryById(id: string): TagCategory | undefined {
  return TAG_CATEGORIES.find(category => category.id === id);
}

export function getTagOptionByValue(categoryId: string, value: string): TagOption | undefined {
  const category = getTagCategoryById(categoryId);
  return category?.options.find(option => option.value === value);
}

export function formatTagDisplay(categoryId: string, value: string): string {
  const category = getTagCategoryById(categoryId);
  const option = getTagOptionByValue(categoryId, value);
  
  if (!category || !option) return value;
  
  return `${option.emoji || ''} ${option.label}`.trim();
}