/**
 * Normaliza un texto eliminando tildes, signos de puntuación como apóstrofes, y convirtiéndolo a minúsculas
 * Esto permite que las búsquedas sean más flexibles (ej. "chicha" encontrará "ch'icha" o "chichá")
 */
export const normalizeForSearch = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes, diéresis)
    .replace(/['"´`’‘]/g, '') // Elimina apóstrofes y comillas similares (útil para el quechua o similares)
    .toLowerCase();
};

/**
 * Compara si un texto contiene el término de búsqueda, de forma normalizada
 */
export const matchesSearch = (text, searchTerm) => {
  if (!searchTerm) return true;
  if (!text) return false;
  return normalizeForSearch(text).includes(normalizeForSearch(searchTerm));
};
