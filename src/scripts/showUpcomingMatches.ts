/**
 * AZURO UPCOMING MATCHES VIEWER
 * Script to display upcoming matches and available bets from Azuro Protocol API.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { getMarketKey, getMarketName, getSelectionName } from './azuroDictionaries';

// API Settings
const GRAPH_URL = "https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3";

// Default values
const DEFAULT_TIME_HOURS = 1;
const DEFAULT_SPORT_FILTER = "";
const DEFAULT_CONDITIONS_LIMIT = 10;

// Interfaces
interface Outcome {
  outcomeId: string;
  currentOdds: string;
  title: string;
  sortOrder: number;
}

interface Condition {
  conditionId: string;
  status: string;
  title: string;
  reinforcement: string;
  outcomes: Outcome[];
}

interface Participant {
  name: string;
  sortOrder: number;
}

interface Game {
  id: string;
  gameId: string;
  title: string;
  startsAt: string;
  status: string;
  participants: Participant[];
  conditions: Condition[];
}

interface League {
  name: string;
  games: Game[];
}

interface Country {
  name: string;
  leagues: League[];
}

interface Sport {
  name: string;
  countries: Country[];
}

interface ApiResponse {
  data: {
    sports: Sport[];
  };
}

// Command line arguments interface
interface CommandArgs {
  hours?: number;
  sport?: string;
  noRedirect?: boolean;
  outputFormat?: 'text' | 'json';
  conditionsLimit?: number;
}

/**
 * Fetch upcoming matches from Azuro API
 */
export async function fetchUpcomingMatches(args: CommandArgs = {}): Promise<ApiResponse> {
  const {
    hours = DEFAULT_TIME_HOURS,
    sport = DEFAULT_SPORT_FILTER,
    conditionsLimit = DEFAULT_CONDITIONS_LIMIT
  } = args;

  // Calculate time filter (now + specified hours)
  const now = Math.floor(Date.now() / 1000);
  const futureTime = now + (hours * 60 * 60);

  // Build GraphQL query
  const query = `
    query GetUpcomingMatches($where: Sport_filter, $gamesWhere: Game_filter) {
      sports(where: $where) {
        name
        countries {
          name
          leagues {
            name
            games(where: $gamesWhere, orderBy: startsAt) {
              id
              gameId
              title
              startsAt
              status
              participants {
                name
                sortOrder
              }
              conditions(first: ${conditionsLimit}) {
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
  `;

  // Build variables object
  const variables: any = {
    gamesWhere: {
      startsAt_gt: now.toString(),
      startsAt_lt: futureTime.toString(),
      status: "Created"
    }
  };

  // Add sport filter if specified
  if (sport) {
    variables.where = {
      name_contains_nocase: sport
    };
  }

  // Execute GraphQL query
  const response = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    }),
  });

  return await response.json() as ApiResponse;
}

/**
 * Format and display upcoming matches
 */
export async function showUpcomingMatches(args: CommandArgs = {}): Promise<void> {
  try {
    const {
      hours = DEFAULT_TIME_HOURS,
      sport = DEFAULT_SPORT_FILTER,
      noRedirect = false,
      outputFormat = 'text'
    } = args;

    console.log(`Fetching upcoming matches for the next ${hours} hour(s)${sport ? ` in sport: ${sport}` : ''}...`);

    const result = await fetchUpcomingMatches({
      hours,
      sport,
      conditionsLimit: DEFAULT_CONDITIONS_LIMIT
    });

    if (!result.data || !result.data.sports || result.data.sports.length === 0) {
      console.log('No upcoming matches found');
      return;
    }

    let matchCount = 0;
    const outputData: any[] = [];

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'config', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Output text format
    const outputFilePath = path.join(outputDir, 'upcoming_matches.txt');
    let outputContent = `Upcoming matches for the next ${hours} hour(s)${sport ? ` in sport: ${sport}` : ''}:\n\n`;

    // Process each sport
    for (const sport of result.data.sports) {
      outputContent += `=== ${sport.name.toUpperCase()} ===\n\n`;

      // Process each country
      for (const country of sport.countries) {
        outputContent += `== ${country.name} ==\n\n`;

        // Process each league
        for (const league of country.leagues) {
          outputContent += `= ${league.name} =\n\n`;

          // Process each game
          for (const game of league.games) {
            const startTime = new Date(parseInt(game.startsAt) * 1000);
            outputContent += `[${game.id}] ${game.title} - ${startTime.toLocaleString()}\n`;

            // Add game to output data
            outputData.push({
              id: game.id,
              gameId: game.gameId,
              title: game.title,
              sport: sport.name,
              country: country.name,
              league: league.name,
              startsAt: game.startsAt,
              startTime: startTime.toLocaleString(),
              participants: game.participants.sort((a, b) => a.sortOrder - b.sortOrder).map(p => p.name),
              conditions: game.conditions.map(c => {
                const marketKey = getMarketKey(c.conditionId);
                const marketName = getMarketName({ marketKey });
                
                return {
                  conditionId: c.conditionId,
                  marketKey,
                  marketName,
                  outcomes: c.outcomes.map(o => {
                    const selectionName = getSelectionName({ key: marketKey, outcomeId: o.outcomeId });
                    return {
                      outcomeId: o.outcomeId,
                      selectionName,
                      currentOdds: parseFloat(o.currentOdds) / 1e6
                    };
                  })
                };
              })
            });

            // Process conditions and outcomes
            for (const condition of game.conditions) {
              const marketKey = getMarketKey(condition.conditionId);
              const marketName = getMarketName({ marketKey });
              
              outputContent += `  * ${marketName}\n`;
              
              // Process outcomes
              for (const outcome of condition.outcomes) {
                const selectionName = getSelectionName({ key: marketKey, outcomeId: outcome.outcomeId });
                const odds = parseFloat(outcome.currentOdds) / 1e6;
                
                outputContent += `    - ${selectionName}: ${odds}\n`;
              }
            }
            
            outputContent += '\n';
            matchCount++;
          }
        }
      }
    }

    // Add summary
    outputContent += `\nTotal: ${matchCount} upcoming matches\n`;
    console.log(`Found ${matchCount} upcoming matches`);

    // Save outputs
    fs.writeFileSync(outputFilePath, outputContent);
    fs.writeFileSync(
      path.join(outputDir, 'upcoming_matches.json'),
      JSON.stringify(outputData, null, 2)
    );

    console.log(`Results saved to ${outputFilePath}`);
    console.log(`JSON data saved to ${path.join(outputDir, 'upcoming_matches.json')}`);

    // Output to console or redirect to less
    if (noRedirect) {
      console.log(outputContent);
    } else {
      // In a real scenario, we would pipe to 'less' here,
      // but in Node.js it's better to just output the content
      console.log(outputContent);
    }
  } catch (error) {
    console.error('Error processing upcoming matches:', error);
  }
}

// Allow running the script directly
if (require.main === module) {
  const args: CommandArgs = {};
  const processArgs = process.argv.slice(2);
  
  // Parse command line arguments
  for (let i = 0; i < processArgs.length; i++) {
    const arg = processArgs[i];
    
    if (arg === '--hours' || arg === '-h') {
      const value = processArgs[++i];
      args.hours = parseInt(value, 10);
    } else if (arg === '--sport' || arg === '-s') {
      args.sport = processArgs[++i];
    } else if (arg === '--no-redirect') {
      args.noRedirect = true;
    } else if (arg === '--format' || arg === '-f') {
      const format = processArgs[++i];
      args.outputFormat = (format === 'json' ? 'json' : 'text') as 'text' | 'json';
    } else if (arg === '--conditions-limit' || arg === '-l') {
      const value = processArgs[++i];
      args.conditionsLimit = parseInt(value, 10);
    }
  }
  
  showUpcomingMatches(args);
} 