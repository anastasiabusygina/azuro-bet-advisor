import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
import { subgraphClient } from './azuro/client.js'

// Интерфейсы для типизации данных
interface BetRecommendation {
  gameId: string
  conditionId: string
  outcomeId: string
  betType?: string
  betValue?: string
  odds?: number
  confidence?: number
  reasoning?: string
}

interface MatchCondition {
  conditionId: string
  betType: string
  outcomeOptions: Array<{
    id: string
    name: string
    value: string // Значение тотала, например "1.5"
    odds: number
  }>
}

// Запрос для получения детальной информации о ставке
const BET_DETAILS_QUERY: DocumentNode = gql`
  query GetBetDetails($gameId: String!, $conditionId: String!) {
    game(id: $gameId) {
      gameId
      title
      startsAt
      sport {
        name
      }
      conditions(where: { conditionId: $conditionId }) {
        conditionId
        status
        marketName
        parameterX
        outcomes {
          outcomeId
          currentOdds
          selectionName
        }
      }
    }
  }
`

/**
 * Получает детальную информацию о ставке по ID игры и ID условия
 * 
 * @param gameId - ID игры
 * @param conditionId - ID условия ставки
 * @returns Promise с детальной информацией о ставке
 */
async function getBetDetails(gameId: string, conditionId: string) {
  const result = await subgraphClient.query(BET_DETAILS_QUERY, {
    gameId,
    conditionId
  }).toPromise()

  if (result.error) {
    throw new Error(`Ошибка при получении деталей ставки: ${result.error.message}`)
  }

  if (!result.data || !result.data.game) {
    throw new Error('Не удалось получить информацию о ставке')
  }

  return result.data.game
}

/**
 * Обрабатывает рекомендацию ставки и добавляет дополнительную информацию
 * 
 * @param recommendation - Базовая рекомендация без детальной информации
 * @returns Promise с обогащенной рекомендацией
 */
export async function enrichBetRecommendation(recommendation: BetRecommendation): Promise<BetRecommendation> {
  try {
    // Получаем детальную информацию о ставке из Azuro API
    const gameDetails = await getBetDetails(recommendation.gameId, recommendation.conditionId)
    
    // Находим условие с нужным ID
    const condition = gameDetails.conditions[0]
    if (!condition) {
      throw new Error(`Условие с ID ${recommendation.conditionId} не найдено`)
    }
    
    // Находим исход с нужным ID
    const outcome = condition.outcomes.find(o => o.outcomeId === recommendation.outcomeId)
    if (!outcome) {
      throw new Error(`Исход с ID ${recommendation.outcomeId} не найден`)
    }
    
    // Извлекаем значение параметра (например, тотал 1.5, 2.5, 3.5)
    const parameterValue = condition.parameterX || "1.5" // Значение по умолчанию, если не указано
    
    // Формируем обогащенную рекомендацию
    return {
      ...recommendation,
      betType: condition.marketName,
      betValue: `${outcome.selectionName} (${parameterValue})`,
      odds: Number(outcome.currentOdds)
    }
  } catch (error) {
    console.error('Ошибка при обогащении рекомендации:', error)
    return recommendation // Возвращаем исходную рекомендацию в случае ошибки
  }
}

/**
 * Определяет, какая кнопка на экране соответствует рекомендованной ставке
 * 
 * @param recommendation - Рекомендация ставки
 * @param availableButtons - Доступные кнопки на экране
 * @returns Подходящая кнопка или null, если не найдена
 */
export function findMatchingButton(
  recommendation: BetRecommendation,
  availableButtons: Array<{ label: string, value: string, odds: number }>
) {
  // Если в рекомендации есть полное значение ставки с параметром
  if (recommendation.betValue) {
    return availableButtons.find(button => button.label === recommendation.betValue)
  }
  
  // Иначе пытаемся найти по ID и типу ставки
  return availableButtons.find(button => {
    const [outcome, parameter] = button.label.split(' (')
    // Проверяем совпадение типа ставки (например, "1 & Over")
    return outcome === recommendation.betType && 
           // Если параметр тотала указан явно, проверяем его
           (!recommendation.betValue || parameter.includes(recommendation.betValue))
  })
}

/**
 * Основная функция для улучшения рекомендаций
 * 
 * @param gameId - ID игры
 * @param availableConditions - Доступные условия для ставок
 * @returns Promise с улучшенными рекомендациями
 */
export async function improveRecommendations(
  gameId: string, 
  availableConditions: MatchCondition[]
): Promise<MatchCondition[]> {
  // Получаем детали игры из API
  const gameDetails = await getBetDetails(gameId, availableConditions[0].conditionId)
  
  // Обогащаем информацию о доступных ставках
  return availableConditions.map(condition => {
    const matchingCondition = gameDetails.conditions.find(c => c.conditionId === condition.conditionId)
    
    if (matchingCondition) {
      const outcomeOptions = condition.outcomeOptions.map(option => {
        const matchingOutcome = matchingCondition.outcomes.find(o => o.outcomeId === option.id)
        return {
          ...option,
          value: matchingCondition.parameterX || option.value, // Добавляем значение параметра
          odds: matchingOutcome ? Number(matchingOutcome.currentOdds) : option.odds
        }
      })
      
      return {
        ...condition,
        betType: matchingCondition.marketName,
        outcomeOptions
      }
    }
    
    return condition
  })
} 