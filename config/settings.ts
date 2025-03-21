import { Hex } from 'viem'
import { logEnv } from './output.js'
import { getChainConfig } from './chainsConfig.js'
import { schema, type Schema } from './schema.js'

const env: Schema = schema.parse(process.env)
logEnv(env)

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
} as const

export type Settings = typeof settings
export type DatabaseConfig = Settings['db']
