import * as path from 'path'
import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'
// Use CommonJS style import for node-fetch version 2
import fetch from 'node-fetch'
import * as AzuroDictionaries from '@azuro-org/dictionaries'
import { Game, MatchState as State, Participant, Outcome, Condition } from '../../interfaces/match.js'
import { toMoscowTime, getSelectionName, getMarketName, flattenGames, filterGamesByOdds, getMatches, formatMatches } from '../../services/matchService.js'

/**
 * Standalone script for fetching and formatting matches.
 * Does not depend on other project modules.
 *
 * How to run:
 * 1. To run without arguments:
 *    ts-node scripts/ts/fetchAndFormatMatches.standalone.ts
 *
 * 2. To run with the match time window argument:
 *    ts-node scripts/ts/fetchAndFormatMatches.standalone.ts --t=3600
 * 
 * 3. To specify a sport:
 *    SPORT_NAME="Football" ts-node scripts/ts/fetchAndFormatMatches.standalone.ts
 * 
 * Features:
 * - Displays match time in both UTC and Moscow time (MSK, UTC+3)
 * - Saves match data in Markdown format for easy reading
 * - Provides full information about available odds and conditions
 */

// Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MATCH_TIME_WINDOW_SECONDS = 86400
const DEFAULT_MIN_ODDS = 1.2
const DEFAULT_SPORT_NAME = process.env.SPORT_NAME || 'Football'
const OUTPUT_DIR = path.join(__dirname, 'data', 'matches')

// Use environment variables if available, or fallbacks
const CHAIN = 'polygon-mainnet'
const GRAPH_URL = process.env.MAINNET_GRAPH_URL || 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3'

// GraphQL query for matches
const GAMES_QUERY = `
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
              title
              reinforcement
              outcomes {
                outcomeId
                currentOdds
                title
                sortOrder
              }
            }
          }
        }
      }
    }
  }
`

const matchTemplate = `
Game Information:
Game ID: {{gameId}} [Use this ID when the bot recommends a match]
Title: {{gameTitle}}
League: {{leagueName}} ({{countryName}})
Teams: {{participants}}
Start Time (UTC): {{startTimeUTC}}
Start Time (МСК): {{startTimeMoscow}}

Available Betting Options:
[Bot recommendations will include Condition ID and Outcome ID - use these to find the correct betting option below]
{{formattedOdds}}`

// Simple template engine replacement for composeContext from @elizaos/core
function composeContext({ state, template }: { state: State; template: string }): string {
  let result = template
  
  for (const [key, value] of Object.entries(state)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), String(value))
  }
  
  return result
}

async function composeGameState(game: Game): Promise<State> {
  const formattedOdds = formatMatches([game])

  return {
    gameId: game.id || game.gameId,
    gameTitle: game.title,
    leagueName: game.league.name,
    countryName: game.country.name,
    participants: game.participants.map((p) => p.name).join(' vs '),
    startTimeUTC: new Date(game.startsAt * 1000).toLocaleString(),
    startTimeMoscow: toMoscowTime(game.startsAt),
    formattedOdds,
    bio: '',
    lore: '',
    messageDirections: '',
    postDirections: '',
    roomId: '00000000-0000-0000-0000-000000000000', // Default UUID
    actors: '',
    recentMessages: '',
    recentMessagesData: [],
  }
}

function parseArguments() {
  const args = process.argv.slice(2)
  const parsedArgs: { [key: string]: string | number } = {}

  for (const arg of args) {
    const [key, value] = arg.split('=')

    switch (key) {
      case '--t': {
        const timeWindow = Number(value)
        if (isNaN(timeWindow)) {
          console.error(`Error: The value t="${value}" is not a valid number.`)
          process.exit(1)
        }
        parsedArgs['timeWindow'] = timeWindow
        break
      }
      default:
        console.log(`Unknown argument: ${arg}`)
        break
    }
  }

  return parsedArgs
}

async function fetchAndFormatMatches() {
  try {
    const parsedArgs = parseArguments()
    const currentTime = Math.floor(Date.now() / 1000)
    const timeWindowDuration = parsedArgs['timeWindow']
      ? Number(parsedArgs['timeWindow'])
      : DEFAULT_MATCH_TIME_WINDOW_SECONDS
    const timeWindow = currentTime + timeWindowDuration

    console.log(`Using chain: ${CHAIN}`)
    console.log(`Using graph URL: ${GRAPH_URL}`)

    console.log(`Match time window: ${timeWindowDuration} seconds`)
    console.log(
      'Fetching upcoming games',
      `timeframe: ${new Date(currentTime * 1000).toLocaleString()} - ${new Date(
        timeWindow * 1000
      ).toLocaleString()}`
    )

    const games = await getMatches(currentTime, timeWindow, {
      sportName: DEFAULT_SPORT_NAME,
      minOdds: DEFAULT_MIN_ODDS,
    })

    if (games.length === 0) {
      console.log(`No upcoming ${DEFAULT_SPORT_NAME} games found.`)
      return
    }

    console.log(`✅ Retrieved ${games.length} upcoming games from Azuro`)

    const allContexts: string[] = []

    for (const game of games) {
      const state = await composeGameState(game)

      const context = composeContext({
        state,
        template: matchTemplate,
      })

      allContexts.push(context)
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    const dateNow = new Date()
    const timestamp = dateNow.toISOString().replace('T', '_').replace(/:/g, '-')
    const outputFile = path.join(OUTPUT_DIR, `matches_${timestamp}.md`)

    const header =
      `Chain: ${CHAIN}\n` +
      `Graph URL: ${GRAPH_URL}\n` +
      `Matches: ${games.length}\n` +
      `${'='.repeat(80)}`

    await fs.writeFile(
      outputFile,
      header + allContexts.join('\n\n' + '-'.repeat(80) + '\n\n'),
      'utf-8'
    )
    console.log(`✅ Matches data saved to: ${outputFile}`)
  } catch (error) {
    console.error('Error fetching matches:', error)
    process.exit(1)
  }
}

fetchAndFormatMatches() 