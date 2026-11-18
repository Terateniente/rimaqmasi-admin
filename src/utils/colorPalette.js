export const COLOR_FAMILIES = {
  rojo: ['#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  naranja: ['#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  ambar: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  verde: ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  turquesa: ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
  azul: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  violeta: ['#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  rosa: ['#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
};

const FAMILY_LIST = Object.values(COLOR_FAMILIES);
const TONE_COUNT = FAMILY_LIST[0].length;

/**
 * 48-color grid interleaved by tone row across 8 spectrum families so each
 * column renders a light-to-dark shade ramp of a single color family.
 */
export const PREDEFINED_COLORS = Array.from({ length: TONE_COUNT }, (_, rowIndex) =>
  FAMILY_LIST.map((tones) => tones[rowIndex])
).flat();

const parseHexRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
};

/**
 * Finds the closest tonal family in COLOR_FAMILIES using RGB Euclidean distance.
 */
export const getColorFamilyTones = (hexColor) => {
  const target = parseHexRgb(hexColor);
  if (!target) return COLOR_FAMILIES.rojo;

  let closestTones = COLOR_FAMILIES.rojo;
  let minDistance = Infinity;

  for (const tones of FAMILY_LIST) {
    for (const swatch of tones) {
      const rgb = parseHexRgb(swatch);
      if (!rgb) continue;
      const dr = target.r - rgb.r;
      const dg = target.g - rgb.g;
      const db = target.b - rgb.b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < minDistance) {
        minDistance = distance;
        closestTones = tones;
      }
    }
  }

  return closestTones;
};

/**
 * Selects a progressive tone from the matched color family based on 1-based order.
 */
export const getColorByOrder = (baseHexColor, order) => {
  const tones = getColorFamilyTones(baseHexColor);
  const index = (Math.max(1, Number(order) || 1) - 1) % tones.length;
  return tones[index];
};
