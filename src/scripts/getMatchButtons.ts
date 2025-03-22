/**
 * AZURO MATCH BUTTONS VIEWER
 * Script to get information about bets for a specific match from Azuro Protocol API
 * and display them in a format that matches the UI.
 */

import { getMarketKey, getMarketName, getSelectionName } from './azuroDictionaries';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const GRAPH_URL = "https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3";

interface Outcome {
  id: string;
  outcomeId: string;
  currentOdds?: string;
}

interface Condition {
  id: string;
  conditionId: string;
  param?: string;
  outcomes: Outcome[];
}

interface Game {
  id: string;
  title: string;
  league: { title: string };
  startsAt: string;
  conditions: Condition[];
}

interface ApiResponse {
  data: {
    game: Game | null;
  };
}

interface ButtonInfo {
  buttonText: string | null;
  confidence: 'high' | 'medium' | 'low';
  marketType: string | null;
  explanation?: string;
}

/**
 * Get button text for a specific game, condition and outcome
 */
export async function getButtonText(
  gameId: string,
  conditionId: string,
  outcomeId: string
): Promise<ButtonInfo> {
  try {
    const query = `
      query GetGame($id: ID!) {
        game(id: $id) {
          id
          title
          league { title }
          startsAt
          conditions {
            id
            conditionId
            param
            outcomes {
              id
              outcomeId
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          id: gameId,
        },
      }),
    });

    const result = await response.json() as ApiResponse;
    
    if (!result.data || !result.data.game) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Game not found in API'
      };
    }

    const game = result.data.game;
    const condition = game.conditions.find(c => c.conditionId === conditionId);
    
    if (!condition) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Condition not found for this game'
      };
    }

    const outcome = condition.outcomes.find(o => o.outcomeId === outcomeId);
    
    if (!outcome) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Outcome not found for this condition'
      };
    }

    const marketKey = getMarketKey(conditionId);
    const marketNameText = getMarketName({ marketKey });
    const selectionNameText = getSelectionName({ key: marketKey, outcomeId });

    let buttonText = selectionNameText;
    
    // Add parameter for totals
    if (marketKey === 'totals' && condition.param) {
      buttonText = `${buttonText} (${condition.param})`;
    }

    return {
      buttonText,
      confidence: 'high',
      marketType: marketNameText
    };
  } catch (error) {
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: `Error fetching data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Main function to process match buttons
 */
export async function processMatchButtons(gameId: string, conditionId?: string, outcomeId?: string): Promise<void> {
  try {
    // If specific condition and outcome are provided
    if (conditionId && outcomeId) {
      const buttonInfo = await getButtonText(gameId, conditionId, outcomeId);
      console.log(JSON.stringify(buttonInfo, null, 2));
      return;
    }

    // Fetch all game data
    const query = `
      query GetGame($id: ID!) {
        game(id: $id) {
          id
          title
          league { title }
          startsAt
          conditions {
            id
            conditionId
            param
            outcomes {
              id
              outcomeId
              currentOdds
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          id: gameId,
        },
      }),
    });

    const result = await response.json() as ApiResponse;
    
    if (!result.data || !result.data.game) {
      console.log(`Game with ID ${gameId} not found`);
      return;
    }

    const game = result.data.game;
    
    console.log(`\nMatch: ${game.title}`);
    console.log(`League: ${game.league.title}`);
    console.log(`Start time: ${new Date(game.startsAt).toLocaleString()}`);
    console.log('\nAvailable bets:');
    
    // Group conditions by market type for better readability
    const marketGroups: Record<string, Array<{condition: Condition, marketName: string}>> = {};
    
    for (const condition of game.conditions) {
      const marketKey = getMarketKey(condition.conditionId);
      const marketName = getMarketName({ marketKey });
      
      if (!marketGroups[marketName]) {
        marketGroups[marketName] = [];
      }
      
      marketGroups[marketName].push({ condition, marketName });
    }
    
    // Output formatted results
    for (const [marketName, items] of Object.entries(marketGroups)) {
      console.log(`\n## ${marketName}`);
      
      for (const { condition } of items) {
        // If condition has a parameter (like totals)
        if (condition.param) {
          console.log(`   Parameter: ${condition.param}`);
        }
        
        for (const outcome of condition.outcomes) {
          const marketKey = getMarketKey(condition.conditionId);
          const selectionName = getSelectionName({ key: marketKey, outcomeId: outcome.outcomeId });
          let buttonText = selectionName;
          
          // Add parameter for totals
          if (marketKey === 'totals' && condition.param) {
            buttonText = `${buttonText} (${condition.param})`;
          }
          
          const odds = outcome.currentOdds ? parseFloat(outcome.currentOdds) / 1e6 : 'N/A';
          console.log(`   - ${buttonText}: ${odds}`);
        }
      }
    }
    
    // Save JSON output
    const outputDir = path.join(process.cwd(), 'config', 'output');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const jsonOutput = {
      gameId,
      title: game.title,
      league: game.league.title,
      startsAt: game.startsAt,
      conditions: game.conditions
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'match_buttons.json'),
      JSON.stringify(jsonOutput, null, 2)
    );
    
    console.log(`\nResults saved to ${path.join(outputDir, 'match_buttons.json')}`);
    
  } catch (error) {
    console.error('Error processing match buttons:', error);
  }
}

// Allow running the script directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run get:buttons -- <gameId> [--condition <conditionId> --outcome <outcomeId>]');
    process.exit(1);
  }
  
  let gameId = args[0];
  let conditionId: string | undefined;
  let outcomeId: string | undefined;
  
  // Parse command line arguments
  for (let i = 1; i < args.length; i += 2) {
    if (args[i] === '--condition' || args[i] === '-c') {
      conditionId = args[i + 1];
    } else if (args[i] === '--outcome' || args[i] === '-o') {
      outcomeId = args[i + 1];
    }
  }
  
  // Both condition and outcome must be provided together
  if ((conditionId && !outcomeId) || (!conditionId && outcomeId)) {
    console.log('Both --condition and --outcome must be provided together');
    process.exit(1);
  }
  
  processMatchButtons(gameId, conditionId, outcomeId);
} 