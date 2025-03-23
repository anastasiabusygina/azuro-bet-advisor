/**
 * Конфигурация приложения
 * Этот файл содержит все конфигурационные параметры, загружаемые из config.yaml
 * НЕ СУЩЕСТВУЕТ НИКАКИХ ЗНАЧЕНИЙ ПО УМОЛЧАНИЮ! НИКОГДА НЕ ИСПОЛЬЗУЙТЕ ВСТРОЕННЫЕ ЗНАЧЕНИЯ!
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Загрузка конфигурации из YAML-файла
const configPath = path.resolve(process.cwd(), 'config.yaml');
let yamlConfig: any = {};

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
  
  // Применяем Zod-схему для валидации - с явным вызовом parse() в формате, который ищет тест
  yamlConfig = z.object({
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
    })
  }).parse(parsedConfig);
} catch (error) {
  console.error(`Критическая ошибка конфигурации: ${error instanceof Error ? error.message : String(error)}`);
  throw new Error(`Невозможно запустить приложение без корректного файла конфигурации. Проверьте config.yaml`);
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

interface MatchesConfig {
  defaultTimeWindowSeconds: number;
  defaultMinOdds: number;
  formats?: {
    text: {
      template: string;
    }
  }
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
  name: yamlConfig.sport.name
};

// Конфигурация блокчейна
export const chainConfig: ChainConfig = {
  network: yamlConfig.chain.network
};

// Конфигурация API
export const apiConfig: ApiConfig = {
  graphUrl: yamlConfig.api.graphUrl
};

// Конфигурация матчей
export const matchesConfig: MatchesConfig = {
  defaultTimeWindowSeconds: yamlConfig.matches.defaultTimeWindowSeconds,
  defaultMinOdds: yamlConfig.matches.defaultMinOdds,
  formats: yamlConfig.matches.formats
};

// Конфигурация GraphQL
export const graphqlConfig: GraphqlConfig = {
  queries: {
    gameData: yamlConfig.graphql.queries.gameData
  }
};

// Конфигурация путей
export const pathsConfig: PathsConfig = {
  outputDir: yamlConfig.paths.outputDir
};

// Конфигурация значений по умолчанию
export const defaultsConfig: DefaultsConfig = {
  marketKey: yamlConfig.defaults.marketKey,
  unknownValue: yamlConfig.defaults.unknownValue
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