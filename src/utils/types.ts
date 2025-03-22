import { Address, Chain } from 'viem'

export enum ChainLabel {
  POLYGON_MAINNET = 'polygon-mainnet',
  POLYGON_TESTNET = 'polygon-testnet',
}

export interface AzuroConfig {
  lpAddress: Address
  coreAddress: Address
  affiliateAddress: Address
  decimals: number
  tokenAddress: Address
}

export interface ChainConfig {
  chain: Chain
  graphUrl: string
  scannerUrl: string
  azuro: AzuroConfig
}

export type ChainsConfig = Record<ChainLabel, ChainConfig>
