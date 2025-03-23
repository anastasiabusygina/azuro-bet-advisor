/*Этот файл ТОЛЬКО ДЛЯ ПРИВАТНЫХ КЛЮЧЕЙ
*/

import { z } from 'zod';
import 'dotenv/config';

// Валидация переменных окружения - явный вызов parse()
const schema = z.object({ 
  // Секретные ключи
  RPC_URL: z.string(),
  EVM_PRIVATE_KEY: z.string(),
  INFURA_API_KEY: z.string(),
});

const env = schema.parse(process.env);

export default env;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive().max(65535)).default('3000'),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(10),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_CACHE: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false')
});

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns a validated object
 */
export function validateEnv(): EnvSchema {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Invalid environment variables');
  }
}

export const env = validateEnv(); 