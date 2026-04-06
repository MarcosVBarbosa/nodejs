import { Op } from 'sequelize';

/**
 * Retorna objeto Sequelize para filtro de datas
 * @param {string|Date} before - Data máxima
 * @param {string|Date} after - Data mínima
 * @returns {object|undefined} Objeto para Sequelize where
 */
export function ParseDateRange(before, after) {
  const result = {};
  const isValidDate = (date) => !isNaN(new Date(date).getTime());

  if (before && isValidDate(before)) result[Op.lte] = new Date(before);
  if (after && isValidDate(after)) result[Op.gte] = new Date(after);

  return Object.keys(result).length ? result : undefined;
}
