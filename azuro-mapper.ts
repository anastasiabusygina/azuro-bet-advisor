#!/usr/bin/env ts-node
/**
 * Скрипт для маппинга ID рынков и исходов на их названия
 * Используется в скрипте get_match_buttons.sh
 */

import * as AzuroDictionaries from '@azuro-org/dictionaries';

// Обработка аргументов командной строки
const args = process.argv.slice(2);
let mode = '';
let id = '';

// Парсинг аргументов
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--mode=market') {
    mode = 'market';
  } else if (arg === '--mode=selection') {
    mode = 'selection';
  } else if (arg.startsWith('--id=')) {
    id = arg.substring(5);
  }
}

if (!mode || !id) {
  console.error('Необходимо указать режим (--mode=market|selection) и ID (--id=...)');
  process.exit(1);
}

try {
  if (mode === 'market') {
    // Для маркетов нам нужно сначала получить ключ рынка по ID условия
    const marketKey = AzuroDictionaries.getMarketKey(id);
    const marketName = AzuroDictionaries.getMarketName({ marketKey });
    console.log(marketName);
  } else if (mode === 'selection') {
    // Для селекций используем библиотеку напрямую
    const selectionName = AzuroDictionaries.getSelectionName({ outcomeId: id });
    console.log(selectionName);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
} 