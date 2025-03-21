import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
// Use CommonJS style import for node-fetch version 2
import fetch from 'node-fetch'
import * as AzuroDictionaries from '@azuro-org/dictionaries'

/**
 * Standalone script for fetching and formatting matches.
 * Does not depend on other project modules.
 *
 * How to run:
 * 1. To run without arguments:
 *    node --loader ts-node/esm scripts/fetchAndFormatMatches.standalone.ts
 *
 * 2. To run with the match time window argument:
 *    node --loader ts-node/esm scripts/fetchAndFormatMatches.standalone.ts --t=3600
 * 
 * 3. To specify a sport:
 *    SPORT_NAME="Football" node --loader ts-node/esm scripts/fetchAndFormatMatches.standalone.ts
 * 
 * Features:
 * - Displays match time in both UTC and Moscow time (MSK, UTC+3)
 * - Saves match data in Markdown format for easy reading
 * - Provides full information about available odds and conditions
 */

// Types definitions
interface Participant {
  name: string;
  sortOrder: number;
}

interface Outcome {
  outcomeId: string;
  currentOdds: string;
  name: string;
}

interface Condition {
  conditionId: string;
  status: string;
  name: string;
  outcomes: Outcome[];
}

interface Game {
  id: string;
  gameId: string;
  title: string;
  startsAt: number;
  status: string;
  sport: {
    name: string;
  };
  country: {
    name: string;
  };
  league: {
    name: string;
  };
  participants: Participant[];
  conditions: Condition[];
}

interface State {
  gameId: string;
  gameTitle: string;
  leagueName: string;
  countryName: string;
  participants: string;
  startTimeUTC: string;
  startTimeMoscow: string;
  formattedOdds: string;
  [key: string]: any;
}

// Constants
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Function to convert time to Moscow time (UTC+3)
function toMoscowTime(utcTimestamp: number): string {
  // Создаем дату из Unix timestamp
  const utcDate = new Date(utcTimestamp * 1000)
  
  // Получаем компоненты даты в UTC
  const year = utcDate.getUTCFullYear()
  const month = utcDate.getUTCMonth()
  const date = utcDate.getUTCDate()
  const hours = utcDate.getUTCHours()
  const minutes = utcDate.getUTCMinutes()
  const seconds = utcDate.getUTCSeconds()
  
  // Создаем новую дату с теми же компонентами и добавляем 3 часа для МСК
  const moscowDate = new Date(Date.UTC(year, month, date, hours + 3, minutes, seconds))
  
  // Форматируем дату в локальном формате России
  return moscowDate.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

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

// Simple formatter replacement for formatMatches from src/azuro/formatters.js
function formatMatches(games: Game[]): string {
  const formattedMatches = games
    .map((game) => {
      const participants = game.participants
        .map((p) => `${p.name} (Order: ${p.sortOrder})`)
        .join(' vs ')

      const conditions = game.conditions
        .map((c) => {
          const outcomes = c.outcomes
            .map((o) => `      ${o.name || 'Unknown'} (Outcome ID: ${o.outcomeId}): Odds ${o.currentOdds}`)
            .join('\n')
          return `${c.name || 'Unknown'} (Condition ID: ${c.conditionId})\n    Outcomes:\n${outcomes}`
        })
        .join('\n  ')

      return (
        `Match: ${game.title}\n` +
        `Time (UTC): ${new Date(game.startsAt * 1000).toUTCString()}\n` +
        `Time (МСК): ${toMoscowTime(game.startsAt)}\n` +
        `Sport: ${game.sport.name}\n` +
        `League: ${game.league.name}, ${game.country.name}\n` +
        `Teams: ${participants}\n` +
        `Conditions:\n  ${conditions}`
      )
    })
    .join('\n\n')

  return formattedMatches || 'No matches found'
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
      case '--t':
        const timeWindow = Number(value)
        if (isNaN(timeWindow)) {
          console.error(`Error: The value t="${value}" is not a valid number.`)
          process.exit(1)
        }
        parsedArgs['timeWindow'] = timeWindow
        break
      default:
        console.log(`Unknown argument: ${arg}`)
        break
    }
  }

  return parsedArgs
}

// Function to get selection name based on outcomeId
function getSelectionName(outcomeId: string): string {
  try {
    // Пробуем получить имя из библиотеки
    const name = AzuroDictionaries.getSelectionName({ outcomeId });
    if (name) return name;
  } catch (error) {
    console.log(`Error getting selection name for outcomeId ${outcomeId}:`, error);
  }

  // Запасной вариант на случай, если библиотека не вернула имя
  const lastPart = outcomeId.split('-').pop() || outcomeId
  
  const selectionMap: {[key: string]: string} = {
    '1': 'Home Win (1)',
    '2': 'Away Win (2)',
    'X': 'Draw (X)',
    'over': 'Over',
    'under': 'Under',
    '1X': 'Home Win or Draw (1X)',
    'X2': 'Draw or Away Win (X2)',
    '12': 'Home Win or Away Win (12)',
    // Common numeric IDs
    '13': 'Over 0.5 Goals',
    '14': 'Under 0.5 Goals',
    '21': 'Over 1.5 Goals',
    '22': 'Under 1.5 Goals',
    '23': 'Over 2.5 Goals',
    '24': 'Under 2.5 Goals',
    '25': 'Over 3.5 Goals',
    '26': 'Under 3.5 Goals',
    '29': 'Home Team To Score',
    '30': 'Away Team To Score',
    '31': 'Home Team Clean Sheet',
    '38': 'Home No Clean Sheet',
    '39': 'Away No Clean Sheet',
    '40': 'Away Team Clean Sheet',
    '49': 'Both Teams To Score - Yes',
    '50': 'Both Teams To Score - No',
    '51': 'Over 0.5 1st Half',
    '52': 'Under 0.5 1st Half',
    '101': 'Draw No Bet - 1',
    '102': 'Draw No Bet - 2',
    '128': 'Over 2.5 Goals',
    '129': 'Under 2.5 Goals',
    '6266': 'Both Teams To Score - No',
    '6267': 'Both Teams To Score - Yes',
    '6268': 'Both Teams To Score - No Goal'
  }
  
  return selectionMap[lastPart] || `Selection ID: ${lastPart}`
}

// Function to get market name based on conditionId
function getMarketName(conditionId: string): string {
  try {
    // Вместо прямого использования getMarketKey, мы будем извлекать outcomeId из условия
    // и пытаться получить имя рынка для каждого исхода
    
    // Используем наш запасной вариант
    const lastPart = conditionId.substring(conditionId.length - 10)
    
    // Map of some known market types based on observations
    const marketMap: {[key: string]: string} = {
      '0434919594': 'Total Goals Over/Under 1.5',
      '0434919608': 'Total Goals Over/Under 2.5',
      '0434919610': 'Total Goals Over/Under 3.5',
      '0434919636': 'Both Teams To Score',
      '0434919639': 'Draw No Bet',
      '0482638469': 'Match Result (1X2)',
      '0482638660': 'Double Chance',
      '0485132861': 'Asian Handicap',
      '0640393189': 'Total Goals Over/Under 2.5',
      '0640393191': 'Draw No Bet',
      '0640393194': 'Total Goals Over/Under 1.5',
      '0640393199': 'Double Chance',
      '0640393208': 'Total Goals Over/Under 3.5',
      '0640393210': 'Total Goals Over/Under 4.5',
      '0640393233': 'Match Result (1X2)',
      '0640393274': 'Both Teams To Score',
      '0640393300': 'Total Goals Over/Under 2.5',
      '0640393302': 'Away Team Clean Sheet',
      '0640393306': 'Home Team Clean Sheet',
      '0640602218': 'Double Chance',
      '0640602234': 'Match Result (1X2)'
    }
    
    return marketMap[lastPart] || `Market Type (${lastPart})`
  } catch (error) {
    // В случае ошибки используем наш запасной вариант
    const lastPart = conditionId.substring(conditionId.length - 10)
    return `Market Type (${lastPart})`
  }
}

// Replacement for flattenGames from src/azuro/queries/getMatchesQuery.js
function flattenGames(data: any): Game[] {
  const games = data.sports.flatMap((sport: any) =>
    sport.countries.flatMap((country: any) =>
      country.leagues.flatMap((league: any) =>
        league.games.map((game: any) => {
          const conditions = game.conditions.map((condition: any) => ({
            ...condition,
            name: condition.title || getMarketName(condition.conditionId),
            outcomes: condition.outcomes.map((outcome: any) => ({
              ...outcome,
              name: outcome.title || getSelectionName(outcome.outcomeId),
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

// Replacement for filterGamesByOdds from src/azuro/queries/getMatchesQuery.js
function filterGamesByOdds(games: Game[], minOdds: number): Game[] {
  return games.filter((game) =>
    game.conditions.some((condition) =>
      condition.outcomes.some(
        (outcome) => Number(outcome.currentOdds) >= minOdds
      )
    )
  )
}

// Replacement for getMatches from src/azuro/queries/getMatchesQuery.js
async function getMatches(
  startDate: number,
  endDate: number,
  options: { sportName?: string; minOdds?: number } = {}
): Promise<Game[]> {
  const { sportName, minOdds } = options
  const variables = {
    where: sportName ? { name_contains: sportName } : undefined,
    gamesWhere: {
      status: 'Created',
      startsAt_gte: startDate,
      startsAt_lte: endDate,
    },
  }

  console.log('Executing Azuro subgraph query', {
    variables,
  })

  try {
    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GAMES_QUERY,
        variables,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.errors) {
      console.error('Azuro query error:', result.errors)
      throw new Error(result.errors[0].message)
    }

    if (!result.data) {
      console.error('Empty result from Azuro subgraph')
      throw new Error('Empty result.data while fetching subgraph')
    }

    console.log('Azuro query successful')
    const games = flattenGames(result.data)
    return minOdds ? filterGamesByOdds(games, minOdds) : games
  } catch (error) {
    console.error('Error fetching matches:', error)
    throw error
  }
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