import { elizaLogger } from '@elizaos/core'
import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
import { subgraphClient } from '../client.js'
import { Bet } from '../generated/types.js'

interface GetBetsQueryVariables {
  where?: GetBetsFilter
}

interface GetBetsFilter {
  betId?: string
  isRedeemable?: boolean
  isRedeemed?: boolean
}

const BETS_QUERY: DocumentNode = gql`
  query Bets($where: Bet_filter) {
    bets(where: $where) {
      betId
      status
      payout
      potentialPayout
      result
      isRedeemable
      isRedeemed
    }
  }
`

/**
 * Retrieves a list of bets from Azuro API with filtering options by wallet
 * and redeemable status
 *
 * @param options - Options for querying bets
 * @returns Promise with an array of Bet objects containing bet information
 *
 * @throws {Error} In case of API request error
 *
 * @example
 * // Get all redeemable bets for a specific wallet
 * const redeemableBets = await getBets({
 *   betId: 123,
 *   isRedeemable: true
 * });
 */
export async function getBets(options: GetBetsFilter = {}): Promise<Bet[]> {
  const { isRedeemable, isRedeemed, betId } = options

  const where: GetBetsFilter = {}

  if (betId) {
    where.betId = betId
  }

  if (isRedeemable !== undefined) {
    where.isRedeemable = isRedeemable
  }

  if (isRedeemed !== undefined) {
    where.isRedeemed = isRedeemed
  }

  const variables: GetBetsQueryVariables = {
    where: Object.keys(where).length > 0 ? where : undefined,
  }

  elizaLogger.info('Executing request to Azuro subgraph for getting bets', {
    query: BETS_QUERY.loc?.source?.body,
    variables,
  })

  const result = await subgraphClient.query(BETS_QUERY, variables).toPromise()

  if (result.error) {
    elizaLogger.error(
      'Error while fetching bets from Azuro subgraph:',
      result.error
    )
    throw new Error(result.error.message)
  }

  if (!result.data) {
    elizaLogger.error('Empty result.data while fetching bets from subgraph')
    throw new Error('Empty result.data while fetching bets from subgraph')
  }

  elizaLogger.info('Bets fetched successfully')
  return result.data.bets
}
