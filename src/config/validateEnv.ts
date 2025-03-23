import { z } from 'zod';

// Валидация переменных окружения
const env = z.object({ 
  RPC_URL: z.string(),
  EVM_PRIVATE_KEY: z.string(),
  INFURA_API_KEY: z.string()
}).parse(process.env);

export default env; 