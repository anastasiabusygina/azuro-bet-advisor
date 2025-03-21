import { elizaLogger } from '@elizaos/core'
import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
import { subgraphClient } from '../client.js'

export interface SportInfo {
  id: string
  name: string
}

const SPORTS_QUERY: DocumentNode = gql`
  query GetAllSportsInfo {
    sports {
      id
      name
      countries {
        name
        leagues(first: 1) {
          name
          games(first: 1) {
            status
            startsAt
          }
        }
      }
    }
  }
`

/**
 * Retrieves a list of all available sports from Azuro subgraph
 *
 * @returns Promise with an array of SportInfo objects containing sport information
 *
 * @throws {Error} If an error occurs when querying the subgraph
 *
 * @example
 * // Get all available sports
 * const sports = await getAllSports();
 */
export const getAllSports = async (): Promise<SportInfo[]> => {
  try {
    elizaLogger.info('Executing Azuro subgraph query for all sports')

    const result = await subgraphClient.query(SPORTS_QUERY, {}).toPromise()

    if (!result) {
      elizaLogger.error('Null or undefined result from Azuro subgraph for sports query')
      throw new Error('Received null or undefined result from subgraph for sports query')
    }

    if (result.error) {
      elizaLogger.error('Azuro sports query error:', result.error)
      throw new Error(result.error.message)
    }

    if (!result.data) {
      elizaLogger.error('Empty result from Azuro subgraph for sports query')
      throw new Error('Empty result.data while fetching sports from subgraph')
    }

    elizaLogger.info('Azuro sports query successful')

    // Convert data to array of SportInfo objects
    const sports: SportInfo[] = result.data.sports.map((sport: any) => ({
      id: sport.id,
      name: sport.name,
    }))

    elizaLogger.info(`Retrieved ${sports.length} sports from Azuro`)
    return sports
  } catch (error) {
    elizaLogger.error('Error fetching available sports:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}
