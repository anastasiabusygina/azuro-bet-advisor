import { Client, fetchExchange } from '@urql/core'
import { settings } from '../config/settings.js'

export const subgraphClient = new Client({
  url: settings.evm.chainConfig.graphUrl,
  exchanges: [fetchExchange],
})
