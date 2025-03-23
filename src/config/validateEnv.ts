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