/**
 * Конфигурация приложения
 * Этот файл содержит все конфигурационные параметры, загружаемые из config.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Загрузка конфигурации из YAML-файла
const configPath = path.resolve(process.cwd(), 'config.yaml');
let yamlConfig: any = {};

try {
  const fileContent = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = yaml.load(fileContent) || {};
  
  // Применяем Zod-схему для валидации инлайново
  yamlConfig = z.object({
    sport: z.object({
      name: z.string().min(1)
    }),
    chain: z.object({
      network: z.string().min(1)
    }),
    api: z.object({
      graphUrl: z.string().url()
    })
  }).parse(parsedConfig);
} catch (error) {
  console.error(`Ошибка чтения или валидации файла конфигурации: ${error instanceof Error ? error.message : String(error)}`);
  console.warn('Используются значения по умолчанию');
  
  // Устанавливаем значения по умолчанию
  yamlConfig = {
    sport: { name: 'Football' },
    chain: { network: 'polygon-mainnet' },
    api: { graphUrl: 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3' }
  };
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

interface AppConfig {
  sport: SportConfig;
  chain: ChainConfig;
  api: ApiConfig;
}

// Конфигурация спорта
export const sportConfig: SportConfig = {
  name: yamlConfig.sport?.name || 'Football'
};

// Конфигурация блокчейна
export const chainConfig: ChainConfig = {
  network: yamlConfig.chain?.network || 'polygon-mainnet'
};

// Конфигурация API
export const apiConfig: ApiConfig = {
  graphUrl: yamlConfig.api?.graphUrl || 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3'
};

// Экспорт общей конфигурации для удобства использования
export const config: AppConfig = {
  sport: sportConfig,
  chain: chainConfig,
  api: apiConfig
};

export default config; 