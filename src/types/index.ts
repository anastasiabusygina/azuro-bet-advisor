// Общие типы для проекта
export * from '@utils/types';

// Импорт и реэкспорт типов из конфигурации
export type { Settings, DatabaseConfig } from '../config';

// Другие общие типы могут быть добавлены здесь
export interface AzuroBase {
  id: string;
  created_at?: string;
  updated_at?: string;
} 