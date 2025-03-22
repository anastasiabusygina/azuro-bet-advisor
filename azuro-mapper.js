/**
 * Azuro Mapper Utility
 * 
 * Этот скрипт обеспечивает простой интерфейс к пакету @azuro-org/dictionaries
 * для преобразования ID исходов (outcomeId) в понятные человеку названия рынков
 * и исходов ставок. Скрипт используется как мост между Bash-скриптами и библиотекой
 * JavaScript для получения правильных названий типов ставок и их исходов.
 * 
 * Функциональность:
 * - mode=market: получает название рынка (типа ставки) по outcomeId
 * - mode=selection: получает название исхода ставки по outcomeId
 * 
 * Примеры вызова из Bash:
 *   node azuro-mapper.js --mode=market --id=29    # Вернет "Full Time Result"
 *   node azuro-mapper.js --mode=selection --id=29  # Вернет "1"
 * 
 * Коды возврата:
 * - 0: успешное выполнение
 * - 1: ошибка (неверные параметры или исключение)
 */

import dictionaries from '@azuro-org/dictionaries';

// Разбор аргументов командной строки
const args = process.argv.slice(2);
let mode = null;
let outcomeId = null;

for (const arg of args) {
  if (arg.startsWith('--mode=')) {
    mode = arg.split('=')[1];
  } else if (arg.startsWith('--id=')) {
    outcomeId = parseInt(arg.split('=')[1], 10);
  }
}

// Проверка входных данных
if (!mode || isNaN(outcomeId)) {
  console.error('Error: Missing required parameters');
  console.error('Usage: node azuro-mapper.js --mode=market|selection --id=<outcomeId>');
  process.exit(1);
}

// Получение запрошенных данных
try {
  if (mode === 'market') {
    // Получаем название рынка ставки (тип ставки)
    console.log(dictionaries.getMarketName({ outcomeId }));
  } else if (mode === 'selection') {
    // Получаем название исхода ставки
    console.log(dictionaries.getSelectionName({ outcomeId }));
  } else {
    console.error(`Error: Invalid mode "${mode}". Use "market" or "selection".`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
} 