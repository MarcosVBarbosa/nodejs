/**
 * Converte string em booleano
 * @param {string|boolean|number} value
 * @returns {boolean}
 */
export function ParseBoolean(value) {
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}
