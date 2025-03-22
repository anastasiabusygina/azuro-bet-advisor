import type { Schema } from './schema';

/**
 * Логирует переменные окружения в консоль безопасным способом
 * @param env Валидированное окружение
 */
export function logEnv(env: Schema): void {
  console.log('Загружены следующие переменные окружения:');
  
  // Маскируем секретные значения для безопасности
  const maskedEnv = { ...env };
  
  // Скрываем приватные ключи и пароли
  if (maskedEnv.EVM_PRIVATE_KEY) {
    maskedEnv.EVM_PRIVATE_KEY = `${maskedEnv.EVM_PRIVATE_KEY.slice(0, 6)}...${maskedEnv.EVM_PRIVATE_KEY.slice(-4)}`;
  }
  
  if (maskedEnv.SUPABASE_KEY) {
    maskedEnv.SUPABASE_KEY = '********';
  }
  
  if (maskedEnv.TWITTER_PASSWORD) {
    maskedEnv.TWITTER_PASSWORD = '********';
  }
  
  if (maskedEnv.TELEGRAM_BOT_TOKEN) {
    maskedEnv.TELEGRAM_BOT_TOKEN = '********';
  }
  
  if (maskedEnv.OPENROUTER_API_KEY) {
    maskedEnv.OPENROUTER_API_KEY = '********';
  }
  
  console.log(maskedEnv);
} 