import { polygon, polygonAmoy } from 'viem/chains'
import { ChainConfig, ChainLabel, ChainsConfig } from './types.js'

const chainsConfig = (): ChainsConfig => ({
  [ChainLabel.POLYGON_MAINNET]: {
    chain: polygon,
    graphUrl:
      'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3',
    scannerUrl: 'https://polygonscan.com',

    azuro: {
      lpAddress: '0x7043E4e1c4045424858ECBCED80989FeAfC11B36', // LP
      coreAddress: '0xA40F8D69D412b79b49EAbdD5cf1b5706395bfCf7', // PrematchCore
      affiliateAddress: '0xfA695010bF9e757a1abCd2703259F419217aa756',
      decimals: 6, // USDT
      tokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // Bet Token USDT
    },
  },
  [ChainLabel.POLYGON_TESTNET]: {
    chain: polygonAmoy,
    graphUrl:
      'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-amoy-dev-v3',
    scannerUrl: 'https://amoy.polygonscan.com',

    azuro: {
      lpAddress: '0xDAa095204aCc244020F8f8e915f36533150ACF4b',
      coreAddress: '0x87EBFFe283bE8dEd47c3C87451d1B89c8a2C441A',
      affiliateAddress: '0x057BcBF736DADD774A8A45A185c1697F4cF7517D',
      decimals: 6, // USDT
      tokenAddress: '0x683026Eb1b912795E4Eb1e73Da7e38C3F2f830c4', // USDT
    },
  },
})

export const getChainConfig = (chainLabel: ChainLabel): ChainConfig => {
  return chainsConfig()[chainLabel]
}
