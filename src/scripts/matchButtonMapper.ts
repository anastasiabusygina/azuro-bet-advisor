/**
 * Module for mapping game ID, condition, and outcome to corresponding 
 * buttons in Azuro interface
 */

// Use node-fetch version 2.x (CommonJS)
import fetch from 'node-fetch';

// Import helper functions for working with dictionaries
import {
  getMarketKey,
  getMarketName,
  getSelectionName
} from './azuroDictionaries';

// Data types
interface Game {
  id: string;
  title: string;
  startsAt: string;
  league: {
    title: string;
  };
  conditions: Condition[];
}

interface Condition {
  id: string;
  conditionId: string;
  param?: string;
  outcomes: Outcome[];
}

interface Outcome {
  id: string;
  outcomeId: string;
}

interface ButtonResult {
  buttonText: string | null;
  confidence: 'high' | 'medium' | 'low';
  marketType: string | null;
  explanation?: string;
}

interface Recommendation {
  gameId: string;
  conditionId: string;
  outcomeId: string;
}

// API URL for requests
const API_URL = 'https://api.azuro.org/graphql/subgraph/polygon-mumbai';

/**
 * Gets match data by its ID
 * @param {string} gameId Match ID
 * @returns {Promise<Object|null>} Promise with match data or null
 */
async function getGameData(gameId: string): Promise<Game | null> {
  try {
    // Input validation
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid gameId: must be a non-empty string');
    }
    
    // GraphQL query to get match data
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

    // Check if request is successful
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

    // Check for data in response
    if (!result.data) {
      console.log('No data returned from API');
      return null;
    }

    // Return match data
    return result.data?.game || null;
  } catch (error) {
    console.error('Error fetching game data:', (error as Error).message);
    throw error;
  }
}

/**
 * Gets button text for bet by game ID, condition and outcome
 * @param {string} gameId Match ID
 * @param {string} conditionId Condition ID
 * @param {string} outcomeId Outcome ID
 * @returns {Promise<Object>} Promise with button information
 */
async function getButtonText(gameId: string, conditionId: string, outcomeId: string): Promise<ButtonResult> {
  try {
    // Get match data
    const gameData = await getGameData(gameId);
    
    // Check that match is found
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
    
    // Check that condition is found
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
    
    // Check that outcome is found
    if (!outcome) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: `Outcome ${outcomeId} not found for condition ${conditionId}`
      };
    }
    
    // Get market key from dictionary
    const marketKey = getMarketKey(conditionId);
    
    // Get market name from dictionary
    const marketName = getMarketName({ marketKey });
    
    // Get selection name from dictionary
    const selectionName = getSelectionName({ key: marketKey, outcomeId });
    
    // Form button text
    let buttonText = selectionName;
    
    // For bets with parameter (e.g., totals) add parameter
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
    // Log error
    console.error(`Error mapping button: ${(error as Error).message}`);
    
    // Return object with error information
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Processes AI bot recommendation and formats it for display
 * @param {Object|string} recommendation Recommendation from AI bot
 * @returns {Promise<string>} Promise with formatted recommendation
 */
async function processRecommendation(recommendation: Recommendation | string): Promise<string> {
  // Check recommendation format
  if (typeof recommendation === 'string') {
    return `
Рекомендация ИИ-бота:
- Game ID: undefined
- Condition ID: undefined
- Outcome ID: undefined

Не удалось определить соответствующую кнопку в интерфейсе.
Причина: Некорректный формат рекомендации

Рекомендуется:
1. Проверить формат рекомендации
2. Убедиться, что используется правильный формат объекта с полями gameId, conditionId, outcomeId
`;
  }
  
  // Extract data from recommendation
  const { gameId, conditionId, outcomeId } = recommendation;
  
  // Get button text for bet
  let result;
  try {
    result = await getButtonText(gameId, conditionId, outcomeId);
  } catch (err: any) {
    console.error(`Ошибка при получении текста кнопки: ${err.message}`);
    return `
Рекомендация ИИ-бота:
- Game ID: ${gameId}
- Condition ID: ${conditionId}
- Outcome ID: ${outcomeId}

Не удалось определить соответствующую кнопку в интерфейсе.
Причина: ${err.message}

Рекомендуется:
1. Запустить скрипт get_match_buttons.sh ${gameId}
2. Проверить вывод в файле config/output/match_buttons.txt
`;
  }
  
  // Form response based on result
  if (result.buttonText) {
    return `
Рекомендация ИИ-бота:
- Game ID: ${gameId}
- Condition ID: ${conditionId}
- Outcome ID: ${outcomeId}

Соответствующая кнопка в интерфейсе: "${result.buttonText}"
Уровень уверенности: ${result.confidence}
Тип рынка: ${result.marketType}

↓↓↓ НАЖМИТЕ ЭТУ КНОПКУ ↓↓↓
${result.buttonText}
`;
  } else {
    return `
Рекомендация ИИ-бота:
- Game ID: ${gameId}
- Condition ID: ${conditionId}
- Outcome ID: ${outcomeId}

Не удалось определить соответствующую кнопку в интерфейсе.
Причина: ${result.explanation}

Рекомендуется:
1. Запустить скрипт get_match_buttons.sh ${gameId}
2. Проверить вывод в файле config/output/match_buttons.txt
`;
  }
}

// Export functions for use in other modules
export {
  getGameData,
  getButtonText,
  processRecommendation
}; 