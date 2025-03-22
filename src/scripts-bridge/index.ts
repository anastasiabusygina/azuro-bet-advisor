/**
 * Мост для импорта бизнес-логики из скриптов в основной проект
 * Это позволяет использовать функции из скриптов без дублирования кода
 */

// Импорт и реэкспорт необходимых функций из директории src/scripts
import { 
  /* 
   * Здесь следует импортировать только необходимые функции
   * Пример:
   * fetchAndFormatMatches,
   * mapButtonsToMatchData,
   */
  fetchAndFormatMatches,
  getMatches,
  parseArguments
} from '../scripts/fetchAndFormatMatches.standalone';

import * as AzuroDictionaries from '../scripts/azuroDictionaries';

// Реэкспорт функций для использования в основном проекте
export {
  /* 
   * Здесь реэкспортируются только необходимые функции
   * Пример:
   * fetchAndFormatMatches,
   * mapButtonsToMatchData,
   */
  fetchAndFormatMatches,
  getMatches,
  parseArguments,
  AzuroDictionaries
};

// Добавьте здесь адаптеры, если формат данных нужно изменить для основного проекта 