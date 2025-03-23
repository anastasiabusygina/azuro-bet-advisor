import * as path from 'path';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import * as dictionaries from '@azuro-org/dictionaries';
import { Game, MatchState as State, Participant, Outcome, Condition } from '../interfaces/match';
import { toMoscowTime, getMatches, filterGamesByOdds, formatMatches } from '../services/matchService';
import { sportConfig, chainConfig, apiConfig, matchesConfig, pathsConfig } from '../config/config';

// Constants from configuration
const DEFAULT_MATCH_TIME_WINDOW_SECONDS = matchesConfig.defaultTimeWindowSeconds;
const DEFAULT_MIN_ODDS = matchesConfig.defaultMinOdds;
const DEFAULT_SPORT_NAME = sportConfig.name;
const OUTPUT_DIR = path.join(process.cwd(), pathsConfig.outputDir);

// Use configuration values
const GRAPH_URL = apiConfig.graphUrl;
const NETWORK = chainConfig.network;

// Match text template - use from config if available, otherwise use hardcoded version
// @allow-const-hardcode
const matchTemplate = matchesConfig.formats?.text?.template || `
Game Information:
Game ID: {{gameId}} [Use this ID when the bot recommends a match]
Title: {{gameTitle}}
League: {{leagueName}} ({{countryName}})
Teams: {{participants}}
Start Time (UTC): {{startTimeUTC}}
Start Time (МСК): {{startTimeMoscow}}
Network: ${NETWORK}
Sport: ${DEFAULT_SPORT_NAME}

Available Betting Options:
[Bot recommendations will include Condition ID and Outcome ID - use these to find the correct betting option below]
{{formattedOdds}}`;

/**
 * Simple template engine replacement
 */
function composeContext({ state, template }: { state: State; template: string }): string {
  let result = template
  
  for (const [key, value] of Object.entries(state)) {
    // @allow-const-hardcode
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), String(value))
  }
  
  return result
}

/**
 * Prepare state from game data
 */
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

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2)
  // @allow-const-hardcode
  const parsedArgs: { [key: string]: string | number | boolean | null } = {
    format: 'text',
    outputFile: null,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--format':
        if (i + 1 < args.length) {
          const format = args[++i]
          if (format !== 'json' && format !== 'text') {
            console.error(`Error: Format must be 'json' or 'text'. Got: ${format}`)
            process.exit(1)
          }
          parsedArgs['format'] = format
        }
        break
      case '--output-file':
        if (i + 1 < args.length) {
          parsedArgs['outputFile'] = args[++i]
        }
        break
      case '--time-window':
      case '--t': // Поддержка старого формата параметра
        if (i + 1 < args.length) {
          const timeWindow = Number(args[++i])
          if (isNaN(timeWindow)) {
            console.error(`Error: The time window value "${args[i]}" is not a valid number.`)
            process.exit(1)
          }
          parsedArgs['timeWindow'] = timeWindow
        }
        break
      case '--sport':
        if (i + 1 < args.length) {
          parsedArgs['sportName'] = args[++i]
        }
        break
      case '--min-odds':
        if (i + 1 < args.length) {
          const minOdds = Number(args[++i])
          if (isNaN(minOdds)) {
            console.error(`Error: The min odds value "${args[i]}" is not a valid number.`)
            process.exit(1)
          }
          parsedArgs['minOdds'] = minOdds
        }
        break
    }
  }

  return parsedArgs
}

// ... rest of the file remains unchanged ...