// src/config/tagsConfig.ts - VERSIÓN MEJORADA

export interface TagOption {
  label: string;
  value: string;
  emoji?: string;
  description?: string;
  roleId?: string; // Nuevo: ID del rol asociado
}

export interface TagCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
  options: TagOption[];
  multiSelect?: boolean;
  hasRoles?: boolean; // Nuevo: indica si esta categoría asigna roles
  roleType?: 'country' | 'age' | 'platform' | 'interest'; // Tipo de rol
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'country',
    name: 'País',
    description: 'Tu país de origen',
    emoji: '🌎',
    hasRoles: true,
    roleType: 'country',
    options: [
      { 
        label: 'Chile', 
        value: 'chile', 
        emoji: '🇨🇱',
        roleId: process.env.CHILE_TAG_ID
      },
      { 
        label: 'Perú', 
        value: 'peru', 
        emoji: '🇵🇪',
        roleId: process.env.PERU_TAG_ID
      },
      { 
        label: 'Colombia', 
        value: 'colombia', 
        emoji: '🇨🇴',
        roleId: process.env.COLOMBIA_TAG_ID
      },
      { 
        label: 'Argentina', 
        value: 'argentina', 
        emoji: '🇦🇷',
        roleId: process.env.ARGENTINA_TAG_ID
      },
      { 
        label: 'México', 
        value: 'mexico', 
        emoji: '🇲🇽',
        roleId: process.env.MEXICO_TAG_ID
      },
      { 
        label: 'España', 
        value: 'spain', 
        emoji: '🇪🇸',
        roleId: process.env.SPAIN_TAG_ID
      },
      { 
        label: 'Estados Unidos', 
        value: 'usa', 
        emoji: '🇺🇸',
        roleId: process.env.USA_TAG_ID
      },
      { 
        label: 'Brasil', 
        value: 'brazil', 
        emoji: '🇧🇷',
        roleId: process.env.BRAZIL_TAG_ID
      },
      { 
        label: 'Otros', 
        value: 'other', 
        emoji: '🌐',
        roleId: process.env.OTHER_COUNTRY_TAG_ID
      }
    ]
  },
  {
    id: 'age_range',
    name: 'Rango de Edad',
    description: 'Tu grupo de edad',
    emoji: '🎂',
    hasRoles: true,
    roleType: 'age',
    options: [
      { 
        label: '13-15 años', 
        value: '13-15', 
        emoji: '👶',
        roleId: process.env.AGE_13_15_TAG_ID
      },
      { 
        label: '16-18 años', 
        value: '16-18', 
        emoji: '🧒',
        roleId: process.env.AGE_16_18_TAG_ID
      },
      { 
        label: '19-25 años', 
        value: '19-25', 
        emoji: '👨‍🎓',
        roleId: process.env.AGE_19_25_TAG_ID
      },
      { 
        label: '26-35 años', 
        value: '26-35', 
        emoji: '👨‍💼',
        roleId: process.env.AGE_26_35_TAG_ID
      },
      { 
        label: '36+ años', 
        value: '36+', 
        emoji: '👨‍🦳',
        roleId: process.env.AGE_36_PLUS_TAG_ID
      }
    ]
  },
  {
    id: 'minecraft_version',
    name: 'Plataforma de Minecraft',
    description: 'Tu versión preferida',
    emoji: '⛏️',
    hasRoles: true,
    roleType: 'platform',
    options: [
      { 
        label: 'Java Edition', 
        value: 'java', 
        emoji: '☕',
        roleId: process.env.JAVA_PLAYER_TAG_ID
      },
      { 
        label: 'Bedrock Edition', 
        value: 'bedrock', 
        emoji: '🪨',
        roleId: process.env.BEDROCK_PLAYER_TAG_ID
      },
      { 
        label: 'Ambas Versiones', 
        value: 'both', 
        emoji: '🔄',
        roleId: process.env.MULTI_PLATFORM_TAG_ID
      }
    ]
  },
  {
    id: 'games',
    name: 'Juegos Favoritos',
    description: 'Tus juegos preferidos',
    emoji: '🎮',
    multiSelect: true,
    hasRoles: false, // No roles para juegos por ahora
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
    description: 'Lenguajes que conoces',
    emoji: '💻',
    multiSelect: true,
    hasRoles: false,
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
    description: 'Tus hobbies e intereses',
    emoji: '🌟',
    multiSelect: true,
    hasRoles: false,
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

// Funciones de utilidad mejoradas
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

// Nueva función para obtener el rol asociado a un tag
export function getTagRoleId(categoryId: string, value: string): string | undefined {
  const option = getTagOptionByValue(categoryId, value);
  return option?.roleId;
}

// Función para obtener todas las categorías que asignan roles
export function getRoleCategories(): TagCategory[] {
  return TAG_CATEGORIES.filter(cat => cat.hasRoles);
}