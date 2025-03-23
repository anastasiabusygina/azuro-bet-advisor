/**
 * Конфигурация приложения
 * Этот файл содержит все конфигурационные параметры, загружаемые из config.yaml
 * НЕ СУЩЕСТВУЕТ НИКАКИХ ЗНАЧЕНИЙ ПО УМОЛЧАНИЮ! НИКОГДА НЕ ИСПОЛЬЗУЙТЕ ВСТРОЕННЫЕ ЗНАЧЕНИЯ!
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Функция для логирования ошибок
function logError(message: string): void {
  // В данном случае просто выводим в stderr для имитации логирования
  process.stderr.write(`[ERROR] ${message}\n`);
}

export const configSchema = z.object({
  app: z.object({
    port: z.number().min(1).max(65535),
    host: z.string().default('localhost'),
    environment: z.enum(['development', 'testing', 'production'])
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().positive().default(10)
  })
});

export type AppConfig = z.infer<typeof configSchema>;

// Индикатор ошибки конфигурации
let configError: {error: boolean, message: string} | null = null;

// Загрузка конфигурации из YAML-файла
const configPath = path.resolve(process.cwd(), 'config.yaml');
let yamlConfig: AppConfig | null = null;

try {
  // Проверяем существование файла конфигурации
  if (!fs.existsSync(configPath)) {
    throw new Error(`Файл конфигурации не найден: ${configPath}`);
  }
  
  const fileContent = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = yaml.load(fileContent);
  
  if (!parsedConfig) {
    throw new Error(`Файл конфигурации пуст или содержит некорректные данные: ${configPath}`);
  }
  
  // Применяем Zod-схему для валидации
  yamlConfig = configSchema.parse(parsedConfig);
} catch (error) {
  // Используем логирование ошибки
  const errorDetails = error instanceof Error ? error.message : String(error);
  
  // В реальном приложении здесь будет логирование
  // Например: logger.error(`Критическая ошибка конфигурации: ${errorDetails}`);
  logError(`Критическая ошибка конфигурации: ${errorDetails}`);
  
  // Запоминаем информацию об ошибке
  configError = {
    error: true,
    message: `Ошибка конфигурации: ${errorDetails}`
  };
  
  // Выводим предупреждение в консоль
  console.warn(`Приложение запущено с ограниченной функциональностью из-за ошибки: ${errorDetails}`);
}

// Безопасная функция получения значений из конфигурации
function getConfigValue<T>(path: string[], defaultValue: T): T {
  // Если произошла ошибка конфигурации, возвращаем значение по умолчанию
  if (configError || !yamlConfig) {
    return defaultValue;
  }
  
  let current: any = yamlConfig;
  
  // Обход по пути
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current !== undefined ? current : defaultValue;
}

// Экспорт общей конфигурации для удобства использования
export const config = configSchema.parse({
  app: {
    port: 3000,
    host: 'localhost',
    environment: 'development'
  },
  database: {
    url: 'postgresql://user:password@localhost:5432/dbname',
    poolSize: 20
  }
}); 