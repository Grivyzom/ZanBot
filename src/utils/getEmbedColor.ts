// src/utils/getEmbedColor.ts
/**
 * Devuelve un color válido para EmbedBuilder (en número decimal).
 * @param colorInput Hex (#RRGGBB) | "random" | undefined
 */
export function getEmbedColor(colorInput?: string | null): number {
  // Sin color → random
  if (!colorInput || colorInput.toLowerCase() === 'random') {
    return Math.floor(Math.random() * 0xffffff);
  }

  // Limpia el '#' si viene incluido
  const hex = colorInput.replace(/^#/, '');

  // Valida formato RRGGBB
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(
      `Color inválido («${colorInput}»). Usa formato #RRGGBB o «random».`
    );
  }

  return parseInt(hex, 16);
}
