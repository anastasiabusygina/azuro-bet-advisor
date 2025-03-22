import { z } from 'zod';
import { ChainLabel } from './types';

// Определяем схему для валидации переменных окружения
export const schema = z.object({
  // База данных
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),

  // Blockchain
  EVM_PRIVATE_KEY: z.string()
    .refine(val => /^0x[a-fA-F0-9]{64}$/.test(val), {
      message: 'EVM_PRIVATE_KEY должен быть шестнадцатеричной строкой, начинающейся с 0x и иметь длину 64 символа'
    }),
  CHAIN: z.nativeEnum(ChainLabel),
  RPC_URL: z.string().url({
    message: 'RPC_URL должен быть валидным URL'
  }),

  // LLM
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  MEDIUM_OPENROUTER_MODEL: z.string().optional(),
  LARGE_OPENROUTER_MODEL: z.string().optional(),

  // Социальные сети
  TWITTER_USERNAME: z.string().optional(),
  TWITTER_PASSWORD: z.string().optional(),
  TWITTER_EMAIL: z.string().email().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  
  // Настройки матчей и API
  SPORT_NAME: z.string().default('Football'),
  MAINNET_GRAPH_URL: z.string().url().default('https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3'),
}).catchall(z.string());

// Экспортируем тип схемы
export type Schema = z.infer<typeof schema>; 