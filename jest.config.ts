import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';

// Чтение конфигурации путей из tsconfig.json
const tsConfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));

/**
 * Jest configuration
 */
const config: Config.InitialOptions = {
  // Корневая директория, откуда Jest начнет поиск файлов
  rootDir: '.',
  
  // Паттерны для поиска тестовых файлов
  testMatch: [
    '**/*.test.ts',
    '**/*.test.js'
  ],
  
  // Расширения файлов, которые Jest будет обрабатывать
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Директории, которые следует исключить из тестирования
  testPathIgnorePatterns: [
    '/node_modules/',
    '/azuro/queries/',
    '/temp_storage/',
    '/config/',
    '/dist/'
  ],
  
  // Файлы, которые следует исключить из покрытия
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/azuro/queries/',
    '/temp_storage/',
    '/config/',
    'azuroDictionaries.ts',
    'demo.ts',
    'matchButtonMapperMock.ts',
    'fetchAndFormatMatches.standalone.ts'
  ],
  
  // Трансформации для различных типов файлов
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      // Настройки для ts-jest
      isolatedModules: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Маппинг модулей для поддержки алиасов из tsconfig
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsConfig.compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
    'node-fetch': '<rootDir>/node_modules/node-fetch/lib/index.js'
  },
  
  // Настройка окружения
  testEnvironment: 'node',
  
  // Файл с глобальной настройкой
  setupFilesAfterEnv: ['./test.setup.ts'],
};

export default config; 