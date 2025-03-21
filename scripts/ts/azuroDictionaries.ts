/**
 * Модуль с функциями для преобразования ID из API Azuro в читаемые названия
 * Это упрощенная версия, которая заменяет @azuro-org/dictionaries
 */

/**
 * Определяет ключ рынка по ID условия
 * @param {string} conditionId ID условия
 * @returns {string} Ключ рынка
 */
function getMarketKey(conditionId: string): string {
  // В реальности здесь должна быть более сложная логика
  // Упрощенная версия для демонстрации
  if (conditionId.endsWith('0640393189')) {
    return 'match_result';
  } else if (conditionId.endsWith('0640393190')) {
    return 'totals';
  } else if (conditionId.endsWith('0640393191')) {
    return 'double_chance';
  } else if (conditionId.endsWith('0640393192')) {
    return 'match_result_and_totals';
  }
  
  return 'unknown';
}

/**
 * Возвращает название рынка по его ключу
 * @param {string} key Ключ рынка
 * @returns {string} Название рынка
 */
function getMarketName(key: string): string {
  const marketNames: Record<string, string> = {
    'match_result': 'Match Result',
    'totals': 'Total Goals Over/Under',
    'double_chance': 'Double Chance',
    'match_result_and_totals': 'Match Result & Over/Under',
    'handicap': 'Handicap',
    'exact_score': 'Exact Score',
    'both_teams_to_score': 'Both Teams to Score',
  };
  
  return marketNames[key] || 'Unknown Market';
}

/**
 * Возвращает название исхода по ключу рынка и ID исхода
 * @param {string} key Ключ рынка
 * @param {string} outcomeId ID исхода
 * @returns {string} Название исхода
 */
function getSelectionName(key: string, outcomeId: string): string {
  // Исходы для разных типов рынков
  if (key === 'match_result') {
    if (outcomeId === '29') return '1';
    if (outcomeId === '30') return 'X';
    if (outcomeId === '31') return '2';
  } else if (key === 'totals') {
    if (outcomeId === '17') return 'Over';
    if (outcomeId === '32') return 'Under';
  } else if (key === 'double_chance') {
    if (outcomeId === '6266') return '1X';
    if (outcomeId === '6267') return '12';
    if (outcomeId === '6268') return 'X2';
  } else if (key === 'match_result_and_totals') {
    if (outcomeId === '9738') return '1 & Over';
    if (outcomeId === '9739') return '1 & Under';
    if (outcomeId === '9740') return 'X & Over';
    if (outcomeId === '9741') return 'X & Under';
    if (outcomeId === '9742') return '2 & Over';
    if (outcomeId === '9743') return '2 & Under';
  } else if (key === 'both_teams_to_score') {
    if (outcomeId === '2') return 'Yes';
    if (outcomeId === '3') return 'No';
  }
  
  return 'Unknown Selection';
}

// Экспортируем функции
export {
  getMarketKey,
  getMarketName,
  getSelectionName
}; 