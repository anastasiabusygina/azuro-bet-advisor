/**
 * Модуль для загрузки переменных окружения из файла .env
 */
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из файла .env
const result = dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// Проверяем успешность загрузки
if (result.error) {
  console.error('Ошибка загрузки файла .env:');
  console.error(result.error.message);
}

// Экспортируем переменные окружения
export const env = process.env; 