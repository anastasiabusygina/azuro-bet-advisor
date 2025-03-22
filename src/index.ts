// Основной индексный файл проекта
export * from './config';
export * from './utils';
export * from './models';

// Реэкспорт конкретных модулей для удобства
import * as utils from './utils';
import * as models from './models';
import { settings } from './config';

// Экспорт основных настроек и утилит
export { 
  settings,
  utils,
  models
};

// Главная точка входа
if (require.main === module) {
  console.log('Azuro Betting Tools - запущен через CLI');
} 