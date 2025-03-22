#!/usr/bin/env node

/**
 * Загрузка переменных среды
 */
import dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения из файла .env
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'
// Use CommonJS style import for node-fetch version 2
import fetch from 'node-fetch'
import * as AzuroDictionaries from './azuroDictionaries'
import { settings } from '../config'

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
// Используем process.cwd() для определения путей в CommonJS
const SCRIPT_DIR = path.resolve(process.cwd(), 'scripts/ts');
const PROJECT_ROOT = process.cwd();

// Default parameters
const DEFAULT_TIME_WINDOW = 86400 // 24 hours in seconds
const DEFAULT_SPORT_NAME = settings.matches.defaultSportName
const DEFAULT_MIN_ODDS = 1.2
const MAX_GAMES = 50 // Maximum number of games to fetch

// API URLs
const GRAPH_URL = settings.matches.graphUrl
const CHAIN = 'polygon-mainnet'

// Paths
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'matches')

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
  let timeWindow = DEFAULT_TIME_WINDOW
  let sportName = settings.matches.defaultSportName || DEFAULT_SPORT_NAME
  let minOdds = DEFAULT_MIN_ODDS

  for (const arg of args) {
    if (arg.startsWith('--t=')) {
      const value = arg.split('=')[1]
      timeWindow = parseInt(value, 10) || DEFAULT_TIME_WINDOW
    } else if (arg.startsWith('--sport=')) {
      sportName = arg.split('=')[1] || DEFAULT_SPORT_NAME
    } else if (arg.startsWith('--minOdds=')) {
      minOdds = parseFloat(arg.split('=')[1]) || DEFAULT_MIN_ODDS
    }
  }

  return { timeWindow, sportName, minOdds }
}

function getSelectionName(outcomeId: string): string {
  try {
    const [conditionId, selectionId] = outcomeId.split('-')
    const marketKey = AzuroDictionaries.getMarketKey(conditionId)
    return AzuroDictionaries.getSelectionName({ key: marketKey, outcomeId: selectionId })
  } catch (error) {
    console.error(`Error getting selection name for ${outcomeId}:`, error)
    return 'Unknown'
  }
}

function getMarketName(conditionId: string): string {
  try {
    const marketKey = AzuroDictionaries.getMarketKey(conditionId)
    return AzuroDictionaries.getMarketName({ marketKey })
  } catch (error) {
    console.error(`Error getting market name for ${conditionId}:`, error)
    return 'Unknown'
  }
}

// Flatten deeply nested API response into a simple array of games
function flattenGames(data: any): Game[] {
  const games: Game[] = []

  if (!data || !data.sports) {
    return games
  }

  for (const sport of data.sports) {
    if (!sport.countries) continue

    for (const country of sport.countries) {
      if (!country.leagues) continue

      for (const league of country.leagues) {
        if (!league.games) continue

        for (const game of league.games) {
          games.push({
            ...game,
            league: { name: league.name },
            country: { name: country.name },
            sport: { name: sport.name },
          })
        }
      }
    }
  }

  return games
}

// Filter games to ensure at least one outcome has odds above the specified minimum
function filterGamesByOdds(games: Game[], minOdds: number): Game[] {
  return games.filter((game) => {
    for (const condition of game.conditions) {
      for (const outcome of condition.outcomes) {
        if (parseFloat(outcome.currentOdds) >= minOdds) {
          return true
        }
      }
    }
    return false
  })
}

async function getMatches(
  startDate: number,
  endDate: number,
  options: { sportName?: string; minOdds?: number } = {}
): Promise<Game[]> {
  const { sportName = DEFAULT_SPORT_NAME, minOdds = DEFAULT_MIN_ODDS } = options

  console.log(`Fetching matches from ${new Date(startDate * 1000).toLocaleString()} to ${new Date(endDate * 1000).toLocaleString()}`)
  console.log(`Sport: ${sportName}, Min odds: ${minOdds}`)
  console.log(`Using API endpoint: ${GRAPH_URL}`)
  console.log(`Chain: ${CHAIN}`)

  // Construct GraphQL variables
  const variables = {
    where: sportName ? { name: sportName } : {},
    gamesWhere: {
      startsAt_gt: startDate.toString(),
      startsAt_lt: endDate.toString(),
      status: "Created",
    },
  }

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
      throw new Error(`Network response was not ok: ${response.statusText}`)
    }

    const { data, errors } = await response.json()

    if (errors) {
      console.error('GraphQL errors:', errors)
      return []
    }

    // Process results
    const allGames = flattenGames(data)
    const filteredGames = filterGamesByOdds(allGames, minOdds)

    console.log(`Found ${allGames.length} matches, ${filteredGames.length} with odds >= ${minOdds}`)

    // Set market and selection names
    for (const game of filteredGames) {
      for (const condition of game.conditions) {
        // Set market name
        condition.name = getMarketName(condition.conditionId)

        // Set selection names for each outcome
        for (const outcome of condition.outcomes) {
          outcome.name = getSelectionName(outcome.outcomeId)
        }
      }
    }

    // Limit number of games to avoid large outputs
    return filteredGames.slice(0, MAX_GAMES)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return []
  }
}

async function fetchAndFormatMatches() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    // Parse command line arguments
    const { timeWindow, sportName, minOdds } = parseArguments()

    // Calculate time range
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const endTime = now + timeWindow
    
    // Log configuration settings to help debug issues
    console.log('Configuration settings:')
    console.log('EVM_PRIVATE_KEY:', settings.evm.privateKey ? '[SET]' : '[NOT SET]')
    console.log('CHAIN:', settings.evm.chainConfig.chain.name || '[NOT SET]')
    console.log('RPC_URL:', settings.evm.chainConfig.rpcUrl ? '[SET]' : '[NOT SET]')
    console.log('SPORT_NAME:', settings.matches.defaultSportName || '[NOT SET]')
    console.log('MAINNET_GRAPH_URL:', settings.matches.graphUrl ? '[SET]' : '[NOT SET]')
    
    console.log(`Fetching upcoming games from ${new Date(now * 1000).toLocaleString()} to ${new Date(endTime * 1000).toLocaleString()}`)

    // Fetch matches
    const matches = await getMatches(now, endTime, { sportName, minOdds })

    if (matches.length === 0) {
      console.log('No matches found')
      return
    }

    console.log(`Retrieved ${matches.length} upcoming games for ${sportName}`)

    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const filename = `matches_${timestamp}.md`
    const filepath = path.join(OUTPUT_DIR, filename)

    // Format matches
    let content = `# Upcoming Matches\n\n`
    content += `Retrieved on: ${new Date().toLocaleString()}\n`
    content += `Sport: ${sportName}\n`
    content += `Time window: ${timeWindow} seconds (${timeWindow / 3600} hours)\n\n`

    // Add each match
    for (const match of matches) {
      const state = await composeGameState(match)
      content += composeContext({ state, template: matchTemplate })
      content += '\n\n---\n\n'
    }

    // Write to file
    await fs.writeFile(filepath, content, 'utf8')
    console.log(`Matches data saved to ${filepath}`)

    return matches
  } catch (error) {
    console.error('Error in fetching and formatting matches:', error)
  }
}

// Execute if this file is run directly
if (require.main === module) {
  fetchAndFormatMatches()
}

// Export for use as a module
export { fetchAndFormatMatches, getMatches, parseArguments } 