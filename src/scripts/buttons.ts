import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as dictionaries from '@azuro-org/dictionaries';
import { sportConfig, chainConfig, apiConfig } from '../config/config';

// Constants
const __filename = process.cwd() + '/src/scripts/buttons.ts';
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../../data/output');

// URL API for requests using configuration values
const API_URL = apiConfig.graphUrl;

// Использование других конфигурационных значений
const CURRENT_SPORT = sportConfig.name;
const CURRENT_CHAIN = chainConfig.network;

// Types definition
interface Game {
  id: string;
  title: string;
  startsAt: string;
  league: {
    name: string;
    title?: string;
  };
  country: {
    name: string;
  };
  conditions: Condition[];
}

interface Condition {
  id: string;
  conditionId: string;
  status?: string;
  title?: string;
  reinforcement?: number;
  param?: string;
  outcomes: Outcome[];
}

interface Outcome {
  id: string;
  outcomeId: string;
  currentOdds?: number;
  title?: string;
  sortOrder?: number;
}

interface ButtonResult {
  buttonText: string | null;
  confidence: 'high' | 'medium' | 'low';
  marketType: string | null;
  explanation?: string;
}

/**
 * Fetch game data from API
 */
async function getGameData(gameId: string): Promise<Game | null> {
  try {
    // Input validation
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid gameId: must be a non-empty string');
    }
    
    // GraphQL query to get game data
    const query = `
      {
        game(id: "${gameId}") {
          id
          title
          startsAt
          league {
            title
          }
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

    // Send request to API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    // Check if request was successful
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Parse response
    const result = await response.json() as { 
      data?: { game?: Game }, 
      errors?: Array<{ message: string }> 
    };

    // Check for errors in response
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    // Check if response has data
    if (!result.data) {
      console.log('No data returned from API');
      return null;
    }

    // Fix league.name field
    const game = result.data?.game;
    if (game && game.league && game.league.title) {
      game.league.name = game.league.title;
    }

    // Add country field if missing
    if (game && !game.country) {
      game.country = { name: 'Unknown' };
    }

    return game || null;
  } catch (error) {
    console.error('Error fetching game data:', (error as Error).message);
    console.error(error);
    throw error;
  }
}

/**
 * Get button text for a specific bet
 */
async function getButtonText(gameId: string, conditionId: string, outcomeId: string): Promise<ButtonResult> {
  try {
    // Get game data
    const gameData = await getGameData(gameId);
    
    // Check if game was found
    if (!gameData) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Game not found in API'
      };
    }
    
    // Find condition by conditionId
    const condition = gameData.conditions.find(c => c.conditionId === conditionId);
    
    // Check if condition was found
    if (!condition) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: `Condition ${conditionId} not found for game ${gameId}`
      };
    }
    
    // Find outcome by outcomeId
    const outcome = condition.outcomes.find(o => o.outcomeId === outcomeId);
    
    // Check if outcome was found
    if (!outcome) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: `Outcome ${outcomeId} not found for condition ${conditionId}`
      };
    }
    
    // Get market key from dictionary
    const [outcomeIdStr] = conditionId.split('_');
    const outcomeId_parsed = parseInt(outcomeIdStr);
    const marketKey = dictionaries.getMarketKey(outcomeId_parsed) || 'unknown';
    
    // Get market name from dictionary
    const marketName = dictionaries.getMarketName({ marketKey }) || marketKey;
    
    // Get selection name from dictionary
    const selectionName = dictionaries.getSelectionName({ 
      outcomeId: parseInt(outcomeId) 
    }) || outcomeId;
    
    // Format button text
    let buttonText = selectionName;
    
    // For bets with parameter (like totals) add parameter
    if (condition.param && (marketKey === 'totals' || marketKey.includes('totals'))) {
      buttonText += ` (${condition.param})`;
    }
    
    // Return mapping result
    return {
      buttonText,
      confidence: 'high',
      marketType: marketName
    };
  } catch (error) {
    // Return object with error info
    console.error(error);
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Format button details as JSON
 */
function formatButtonAsJson(gameId: string, conditionId: string, outcomeId: string, buttonResult: ButtonResult) {
  return {
    gameId,
    conditionId,
    outcomeId,
    buttonText: buttonResult.buttonText,
    confidence: buttonResult.confidence,
    marketType: buttonResult.marketType,
    explanation: buttonResult.explanation || null
  };
}

/**
 * Format button details as text
 */
function formatButtonAsText(gameId: string, conditionId: string, outcomeId: string, buttonResult: ButtonResult): string {
  return `
Данные о ставке:
- Game ID: ${gameId}
- Condition ID: ${conditionId}
- Outcome ID: ${outcomeId}
- Спорт: ${CURRENT_SPORT}
- Сеть: ${CURRENT_CHAIN}

Информация о кнопке:
- Текст кнопки: ${buttonResult.buttonText || "Не найдено"}
- Уверенность: ${buttonResult.confidence}
- Тип ставки: ${buttonResult.marketType || "Неизвестно"}
${buttonResult.explanation ? `- Примечание: ${buttonResult.explanation}` : ""}
`;
}

/**
 * Format all buttons for a game
 */
async function formatAllButtonsForGame(gameId: string, format: string, filterConditionId?: string, filterOutcomeId?: string) {
  try {
    const gameData = await getGameData(gameId);
    
    if (!gameData) {
      console.error(`Game with ID ${gameId} not found`);
      return null;
    }
    
    const allButtons = [];
    
    for (const condition of gameData.conditions) {
      // Skip if we're filtering by conditionId and this isn't the one
      if (filterConditionId && condition.conditionId !== filterConditionId) {
        continue;
      }
      
      for (const outcome of condition.outcomes) {
        // Skip if we're filtering by outcomeId and this isn't the one
        if (filterOutcomeId && outcome.outcomeId !== filterOutcomeId) {
          continue;
        }
        
        const buttonResult = await getButtonText(gameId, condition.conditionId, outcome.outcomeId);
        
        if (format === 'json') {
          allButtons.push(formatButtonAsJson(gameId, condition.conditionId, outcome.outcomeId, buttonResult));
        } else {
          allButtons.push(formatButtonAsText(gameId, condition.conditionId, outcome.outcomeId, buttonResult));
        }
      }
    }
    
    if (format === 'json') {
      return {
        gameId,
        title: gameData.title,
        buttons: allButtons
      };
    } else {
      return `
Информация о матче:
ID: ${gameId}
Название: ${gameData.title}

Доступные ставки:
${allButtons.join('\n' + '-'.repeat(50) + '\n')}
`;
    }
  } catch (error) {
    console.error('Error formatting buttons:', error);
    return null;
  }
}

/**
 * Main function to get match buttons
 */
async function getMatchButtons() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    let gameId = '';
    let conditionId = '';
    let outcomeId = '';
    let format = 'text';
    let outputFile = '';
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--format':
          if (i + 1 < args.length) {
            const formatValue = args[++i];
            if (formatValue !== 'json' && formatValue !== 'text') {
              console.error(`Error: Format must be 'json' or 'text'. Got: ${formatValue}`);
              process.exit(1);
            }
            format = formatValue;
          }
          break;
        case '--output-file':
          if (i + 1 < args.length) {
            outputFile = args[++i];
          }
          break;
        case '--condition':
        case '-c':
          if (i + 1 < args.length) {
            conditionId = args[++i];
          }
          break;
        case '--outcome':
        case '-o':
          if (i + 1 < args.length) {
            outcomeId = args[++i];
          }
          break;
        default:
          if (!arg.startsWith('--') && !gameId) {
            gameId = arg;
          }
          break;
      }
    }
    
    if (!gameId) {
      console.error('Error: Game ID is required');
      process.exit(1);
    }
    
    let output = '';
    
    // If we have both conditionId and outcomeId, just get one button
    if (conditionId && outcomeId) {
      const buttonResult = await getButtonText(gameId, conditionId, outcomeId);
      
      if (format === 'json') {
        output = JSON.stringify(formatButtonAsJson(gameId, conditionId, outcomeId, buttonResult), null, 2);
      } else {
        output = formatButtonAsText(gameId, conditionId, outcomeId, buttonResult);
      }
    } else {
      // Otherwise, get all buttons (with optional filters)
      const result = await formatAllButtonsForGame(gameId, format, conditionId, outcomeId);
      
      if (!result) {
        console.error('Error getting buttons');
        process.exit(1);
      }
      
      if (format === 'json') {
        output = JSON.stringify(result, null, 2);
      } else {
        output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      }
    }
    
    // Save or print output
    if (outputFile) {
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, output, 'utf-8');
      console.log(`Output saved to ${outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Execute main function
getMatchButtons(); 