import type { Config } from '@jest/types';

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
      isolatedModules: true
    }]
  },
  
  // Настройка окружения
  testEnvironment: 'node',
  
  // Файл с глобальной настройкой
  setupFilesAfterEnv: ['./test.setup.ts'],
  
  // Переопределяем модули, которые могут вызывать проблемы при тестировании
  moduleNameMapper: {
    'node-fetch': '<rootDir>/node_modules/node-fetch/lib/index.js'
  }
};

export default config; 