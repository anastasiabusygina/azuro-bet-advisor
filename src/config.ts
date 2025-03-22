import { Hex } from 'viem'
import { logEnv } from './utils/output'
import { getChainConfig } from './utils/chainsConfig'
import { schema, type Schema } from './utils/schema'

let env: Schema;

try {
  // Валидация переменных окружения с помощью Zod
  const result = schema.safeParse(process.env);

  // Проверка результата валидации
  if (!result.success) {
    console.error('Ошибка валидации переменных окружения:');
    console.error(result.error.format());
    throw new Error('Невалидные переменные окружения');
  }

  env = result.data;
  logEnv(env);
} catch (error) {
  console.error(`Критическая ошибка при валидации настроек: ${error instanceof Error ? error.message : String(error)}`);
  throw error;
}

const db = {
  url: env.DATABASE_URL,
  supabaseUrl: env.SUPABASE_URL,
  supabaseKey: env.SUPABASE_KEY,
}

export const settings = {
  db,
  evm: {
    privateKey: env.EVM_PRIVATE_KEY as Hex,
    chainConfig: {
      ...getChainConfig(env.CHAIN),
      rpcUrl: env.RPC_URL,
    },
  },

  llm: {
    openrouterApiKey: env.OPENROUTER_API_KEY,
    openrouterModel: env.OPENROUTER_MODEL,
    mediumOpenrouterModel: env.MEDIUM_OPENROUTER_MODEL,
    largeOpenrouterModel: env.LARGE_OPENROUTER_MODEL,
  },

  social: {
    twitter: {
      username: env.TWITTER_USERNAME,
      password: env.TWITTER_PASSWORD,
      email: env.TWITTER_EMAIL,
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
    },
  },
  
  matches: {
    defaultSportName: env.SPORT_NAME,
    graphUrl: env.MAINNET_GRAPH_URL,
  },
} as const

export type Settings = typeof settings
export type DatabaseConfig = Settings['db']
