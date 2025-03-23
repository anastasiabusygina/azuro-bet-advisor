/**
 * Environment variables configuration
 * All environment variables should be accessed from this file
 * Only secret keys should be stored here, public settings are in config.yaml
 */

import env from './validateEnv';

// Secret keys
export const RPC_URL = env.RPC_URL;
export const EVM_PRIVATE_KEY = env.EVM_PRIVATE_KEY;
export const INFURA_API_KEY = env.INFURA_API_KEY; 