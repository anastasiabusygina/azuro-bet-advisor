import { elizaLogger } from '@elizaos/core'
import { getMarketName, getSelectionName } from '@azuro-org/dictionaries'
import { Game } from '../types.js'

import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
import { subgraphClient } from '../client.js'
import { GetGamesQuery, GetGamesQueryVariables } from '../generated/types.js'

interface GetMatchesOptions {
  sportName?: string
  minOdds?: number
}

const GAMES_QUERY: DocumentNode = gql`
  query GetGames($where: Sport_filter, $gamesWhere: Game_filter) {
    sports(where: $where) {
      name
      countries {
        name
        leagues {
          name
          games(where: $gamesWhere) {
            gameId
            title
            startsAt
            status
            participants {
              name
              sortOrder
            }
            conditions {
              conditionId
              status
              outcomes {
                outcomeId
                currentOdds
              }
            }
          }
        }
      }
    }
  }
`

/**
 * Transforms hierarchical game structure from GraphQL (sports -> countries -> leagues -> games)
 * into a flat list of games. For each game adds information about sport, country and league
 * and readable names for markets and selections.
 *
 * @param data - GraphQL response with sports field containing game hierarchy
 * @returns Flat list of games with additional information
 */
const flattenGames = (data: GetGamesQuery): Game[] => {
  const games = data.sports.flatMap((sport) =>
    sport.countries.flatMap((country) =>
      country.leagues.flatMap((league) =>
        league.games.map((game) => {
          const conditions = game.conditions.map((condition) => ({
            ...condition,
            name: getMarketName({
              outcomeId: condition.outcomes[0].outcomeId,
            }),
            outcomes: condition.outcomes.map((outcome) => ({
              ...outcome,
              name: getSelectionName({ outcomeId: outcome.outcomeId }),
            })),
          }))

          return {
            ...game,
            id: game.gameId,
            title: game.title || '',
            sport: { name: sport.name },
            country: { name: country.name },
            league: { name: league.name },
            conditions,
          }
        })
      )
    )
  )

  return games
}

/**
 * Filters games based on minimum odds threshold. Returns a new array of games
 * that contain at least one condition with outcomes meeting the minimum odds.
 * Does not modify the original games array or their conditions.
 *
 * @param games - List of games to filter
 * @param minOdds - Minimum odds threshold
 * @returns New array of games that pass the filter
 */
const filterGamesByOdds = (games: Game[], minOdds: number): Game[] => {
  return games.filter((game) =>
    game.conditions.some((condition) =>
      condition.outcomes.some(
        (outcome) => Number(outcome.currentOdds) >= minOdds
      )
    )
  )
}

/**
 * Retrieves a list of matches from Azuro subgraph with filtering by dates, sport and odds
 *
 * @param startDate - Start date for filtering (timestamp in seconds)
 * @param endDate - End date for filtering (timestamp in seconds)
 * @param options - Filtering options
 * @returns Promise with an array of Game objects containing match information
 *
 * @throws {Error} If an error occurs when querying the subgraph
 *
 * @example
 * // Get football matches for next week with min odds 1.2
 * const nextWeekMatches = await getMatches(
 *   Date.now() / 1000,
 *   Date.now() / 1000 + 7 * 24 * 60 * 60,
 *   { sportName: 'Football', minOdds: 1.2 }
 * );
 */
export const getMatches = async (
  startDate: number,
  endDate: number,
  options: GetMatchesOptions = {}
): Promise<Game[]> => {
  const { sportName, minOdds } = options
  const variables: GetGamesQueryVariables = {
    where: sportName ? { name_contains: sportName } : undefined,
    gamesWhere: {
      status: 'Created',
      startsAt_gte: startDate,
      startsAt_lte: endDate,
    },
  }

  elizaLogger.info('Executing Azuro subgraph query', {
    query: GAMES_QUERY.loc?.source?.body,
    variables,
  })

  const result = await subgraphClient.query(GAMES_QUERY, variables).toPromise()

  if (result.error) {
    elizaLogger.error('Azuro query error:', result.error)
    throw new Error(result.error.message)
  }

  if (!result.data) {
    elizaLogger.error('Empty result from Azuro subgraph')
    throw new Error('Empty result.data while fetching subgraph')
  }

  elizaLogger.info('Azuro query successful')
  const games = flattenGames(result.data)
  return minOdds ? filterGamesByOdds(games, minOdds) : games
}
