import * as AzuroDictionaries from '@azuro-org/dictionaries'
import fetch from 'node-fetch'
import { Game, MatchState } from '../interfaces/match'

/**
 * Преобразует UTC timestamp в московское время (UTC+3)
 */
export function toMoscowTime(utcTimestamp: number): string {
  const date = new Date(utcTimestamp * 1000);
  // Добавляем 3 часа для получения московского времени (UTC+3)
  date.setHours(date.getHours() + 3);
  
  // Форматируем время в удобный вид
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}.${month} ${hours}:${minutes}`;
}

/**
 * Получает название исхода ставки по outcomeId
 */
export function getSelectionName(outcomeId: string): string {
  try {
    const parsedId = parseInt(outcomeId);
    return AzuroDictionaries.getSelectionName({ outcomeId: parsedId });
  } catch (error) {
    console.error('Error getting selection name:', error);
    return outcomeId;
  }
}

/**
 * Получает название рынка (типа ставки) по conditionId
 */
export function getMarketName(conditionId: string): string {
  try {
    const [outcomeIdStr] = conditionId.split('_');
    const outcomeId = parseInt(outcomeIdStr);
    return AzuroDictionaries.getMarketName({ outcomeId });
  } catch (error) {
    console.error('Error getting market name:', error);
    return conditionId;
  }
}

/**
 * Преобразует ответ от API в плоский список игр
 */
export function flattenGames(data: any): Game[] {
  const flatGames: Game[] = [];
  
  // Обрабатываем данные, если в ответе есть core_games
  if (data?.data?.core_games) {
    for (const league of data.data.core_games.data) {
      for (const game of league.games) {
        flatGames.push({
          ...game,
          country: league.country,
          league: league,
          sport: league.sport
        });
      }
    }
  }
  
  return flatGames;
}

/**
 * Фильтрует игры по минимальному значению коэффициента
 */
export function filterGamesByOdds(games: Game[], minOdds: number): Game[] {
  return games.filter(game => {
    for (const condition of game.conditions) {
      for (const outcome of condition.outcomes) {
        if (parseFloat(outcome.currentOdds) >= minOdds) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * Получает матчи из API
 */
export async function getMatches(
  startDate: number,
  endDate: number,
  options: { sportName?: string; minOdds?: number } = {}
): Promise<Game[]> {
  const { sportName, minOdds = 1.5 } = options;
  
  try {
    const chainId = process.env.CHAIN || 'polygon-mainnet';
    
    let graphUrl = '';
    if (chainId === 'polygon-mainnet') {
      graphUrl = 'https://api.thegraph.com/subgraphs/name/azuro-protocol/azuro-api-polygon-v3';
    } else if (chainId === 'arbitrum-one') {
      graphUrl = 'https://api.thegraph.com/subgraphs/name/azuro-protocol/azuro-api-arbitrum-v3';
    } else {
      throw new Error(`Unknown chain ID: ${chainId}`);
    }
    
    const query = `
      query GetGames($sportFilter: String, $startsAfter: Int!, $startsBefore: Int!) {
        core_games(
          where: {
            sport_: { name_contains_nocase: $sportFilter },
            startsAt_gt: $startsAfter,
            startsAt_lt: $startsBefore,
            status_in: [Created, Upcoming, Resolved]
          }
          orderBy: startsAt
          orderDirection: asc
        ) {
          data {
            country {
              name
            }
            name
            sport {
              name
            }
            games {
              id
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
    `;
    
    const variables = {
      sportFilter: sportName || '',
      startsAfter: startDate,
      startsBefore: endDate
    };
    
    const response = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    const data = await response.json();
    let games = flattenGames(data);
    
    if (minOdds > 1) {
      games = filterGamesByOdds(games, minOdds);
    }
    
    return games;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

/**
 * Форматирует матчи в читабельный формат
 */
export function formatMatches(games: Game[]): string {
  if (!games || games.length === 0) {
    return 'Нет доступных матчей.';
  }
  
  let result = '# Предстоящие матчи\n\n';
  
  for (const game of games) {
    const utcTime = new Date(game.startsAt * 1000).toUTCString();
    const moscowTime = toMoscowTime(game.startsAt);
    
    result += `## ${game.title}\n`;
    result += `* Лига: ${game.league.name}\n`;
    result += `* Страна: ${game.country.name}\n`;
    result += `* Время (UTC): ${utcTime}\n`;
    result += `* Время (МСК): ${moscowTime}\n\n`;
    
    result += `### Доступные ставки:\n`;
    
    for (const condition of game.conditions) {
      const marketName = getMarketName(condition.conditionId);
      
      result += `#### ${marketName}\n`;
      
      for (const outcome of condition.outcomes) {
        const selectionName = getSelectionName(outcome.outcomeId);
        result += `* ${selectionName}: ${outcome.currentOdds}\n`;
      }
      
      result += '\n';
    }
    
    result += '---\n\n';
  }
  
  return result;
} 