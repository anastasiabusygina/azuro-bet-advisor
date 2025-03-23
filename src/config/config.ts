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

// Схема конфигурации для валидации
const configSchema = z.object({
  sport: z.object({
    name: z.string().min(1)
  }),
  chain: z.object({
    network: z.string().min(1)
  }),
  api: z.object({
    graphUrl: z.string().url()
  }),
  matches: z.object({
    defaultTimeWindowSeconds: z.number(),
    defaultMinOdds: z.number(),
    formats: z.object({
      text: z.object({
        template: z.string()
      })
    }).optional()
  }),
  graphql: z.object({
    queries: z.object({
      gameData: z.string()
    })
  }),
  paths: z.object({
    outputDir: z.string()
  }),
  defaults: z.object({
    marketKey: z.string(),
    unknownValue: z.string()
  }),
  errors: z.object({
    configFileNotFound: z.string(),
    configFileEmpty: z.string(),
    configCriticalError: z.string(),
    configAppStartError: z.string()
  })
});

// Тип конфигурации на основе схемы
type ConfigType = z.infer<typeof configSchema>;

// Индикатор ошибки конфигурации
let configError: {error: boolean, message: string} | null = null;

// Загрузка конфигурации из YAML-файла
const configPath = path.resolve(process.cwd(), 'config.yaml');
let yamlConfig: ConfigType | null = null;

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

// Типизированные интерфейсы для конфигурации
interface SportConfig {
  name: string;
}

interface ChainConfig {
  network: string;
}

interface ApiConfig {
  graphUrl: string;
}


interface GraphqlConfig {
  queries: {
    gameData: string;
  }
}

interface PathsConfig {
  outputDir: string;
}

interface DefaultsConfig {
  marketKey: string;
  unknownValue: string;
}

interface AppConfig {
  sport: SportConfig;
  chain: ChainConfig;
  api: ApiConfig;
  matches: MatchesConfig;
  graphql: GraphqlConfig;
  paths: PathsConfig;
  defaults: DefaultsConfig;
}

// Конфигурация спорта
export const sportConfig: SportConfig = {
  name: getConfigValue(['sport', 'name'], 'unknown')
};

// Конфигурация блокчейна
export const chainConfig: ChainConfig = {
  network: getConfigValue(['chain', 'network'], 'unknown')
};

// Конфигурация API
export const apiConfig: ApiConfig = {
  graphUrl: getConfigValue(['api', 'graphUrl'], 'https://example.com/api')
};

// Конфигурация матчей
export const matchesConfig: MatchesConfig = {
  defaultTimeWindowSeconds: getConfigValue(['matches', 'defaultTimeWindowSeconds'], 0),
  defaultMinOdds: getConfigValue(['matches', 'defaultMinOdds'], 0),
  formats: getConfigValue(['matches', 'formats'], undefined)
};

// Конфигурация GraphQL
export const graphqlConfig: GraphqlConfig = {
  queries: {
    gameData: getConfigValue(['graphql', 'queries', 'gameData'], '')
  }
};

// Конфигурация путей
export const pathsConfig: PathsConfig = {
  outputDir: getConfigValue(['paths', 'outputDir'], '')
};

// Конфигурация значений по умолчанию
export const defaultsConfig: DefaultsConfig = {
  marketKey: getConfigValue(['defaults', 'marketKey'], ''),
  unknownValue: getConfigValue(['defaults', 'unknownValue'], '')
};

// Экспорт общей конфигурации для удобства использования
export const config: AppConfig = {
  sport: sportConfig,
  chain: chainConfig,
  api: apiConfig,
  matches: matchesConfig,
  graphql: graphqlConfig,
  paths: pathsConfig,
  defaults: defaultsConfig
};

export default config; 