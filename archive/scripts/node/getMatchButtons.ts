/**
 * Модуль для сопоставления ID игры, условия и исхода с соответствующими
 * кнопками в пользовательском интерфейсе Azuro
 */

// Используем node-fetch версии 2.x (CommonJS)
import fetch from 'node-fetch';

// Импортируем вспомогательные функции для работы со словарями
import {
  getMarketKey,
  getMarketName,
  getSelectionName
} from './azuroDictionaries';

// Типы данных
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

// URL API для запросов
const API_URL = 'https://api.azuro.org/graphql/subgraph/polygon-mumbai';

/**
 * Получает данные о матче по его ID
 * @param {string} gameId ID матча
 * @returns {Promise<Object|null>} Promise с данными о матче или null
 */
async function getGameData(gameId: string): Promise<Game | null> {
  try {
    // Валидация входных данных
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid gameId: must be a non-empty string');
    }
    
    // Запрос GraphQL для получения данных о матче
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

    // Отправляем запрос к API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    // Проверяем успешность запроса
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Разбираем ответ
    const result = await response.json() as { 
      data?: { game?: Game }, 
      errors?: Array<{ message: string }> 
    };

    // Проверяем наличие ошибок в ответе
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    // Проверяем наличие данных в ответе
    if (!result.data) {
      console.log('No data returned from API');
      return null;
    }

    // Возвращаем данные о матче
    return result.data?.game || null;
  } catch (error) {
    console.error('Error fetching game data:', (error as Error).message);
    throw error;
  }
}

/**
 * Получает текст кнопки для ставки по ID игры, условия и исхода
 * @param {string} gameId ID матча
 * @param {string} conditionId ID условия
 * @param {string} outcomeId ID исхода
 * @returns {Promise<Object>} Promise с информацией о соответствующей кнопке
 */
async function getButtonText(gameId: string, conditionId: string, outcomeId: string): Promise<ButtonResult> {
  try {
    // Получаем данные о матче
    const gameData = await getGameData(gameId);
    
    // Проверяем, что матч найден
    if (!gameData) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Game not found in API'
      };
    }
    
    // Находим нужное условие по conditionId
    const condition = gameData.conditions.find(c => c.conditionId === conditionId);
    
    // Проверяем, что условие найдено
    if (!condition) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: `Condition ${conditionId} not found for game ${gameId}`
      };
    }
    
    // Находим нужный исход по outcomeId
    const outcome = condition.outcomes.find(o => o.outcomeId === outcomeId);
    
    // Проверяем, что исход найден
    if (!outcome) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: `Outcome ${outcomeId} not found for condition ${conditionId}`
      };
    }
    
    // Получаем ключ рынка из словаря
    const marketKey = getMarketKey(conditionId);
    
    // Получаем имя рынка из словаря
    const marketName = getMarketName(marketKey);
    
    // Получаем имя выбора из словаря
    const selectionName = getSelectionName(marketKey, outcomeId);
    
    // Формируем текст кнопки
    let buttonText = selectionName;
    
    // Для ставок с параметром (например, тоталы) добавляем параметр
    if (condition.param && (marketKey === 'totals' || marketKey.includes('totals'))) {
      buttonText += ` (${condition.param})`;
    }
    
    // Возвращаем результат сопоставления
    return {
      buttonText,
      confidence: 'high',
      marketType: marketName
    };
  } catch (error) {
    // Возвращаем объект с информацией об ошибке
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Обрабатывает рекомендацию от ИИ-бота и форматирует ее для отображения
 * @param {Object|string} recommendation Рекомендация от ИИ-бота
 * @returns {Promise<string>} Promise с форматированной рекомендацией
 */
async function processRecommendation(recommendation: Recommendation | string): Promise<string> {
  // Проверяем формат рекомендации
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
  
  // Извлекаем данные из рекомендации
  const { gameId, conditionId, outcomeId } = recommendation;
  
  // Получаем текст кнопки для ставки
  const result = await getButtonText(gameId, conditionId, outcomeId);
  
  // Формируем ответ в зависимости от результата
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

// Экспортируем функции для использования в других модулях
export {
  getGameData,
  getButtonText,
  processRecommendation
}; 