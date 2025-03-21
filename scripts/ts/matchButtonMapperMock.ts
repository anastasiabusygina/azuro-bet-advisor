/**
 * Этот файл содержит заглушки функций для тестирования модуля matchButtonMapper
 * Он имитирует поведение оригинального модуля, но позволяет контролировать возвращаемые значения
 */

// Types
export interface ButtonMappingResult {
  buttonText: string | null;
  confidence: 'high' | 'medium' | 'low' | 'N/A';
  marketType: string | null;
  explanation?: string;
}

// Хранилище мок-данных
let mockGameData: any = null;
let mockErrorMode: boolean = false;

/**
 * Устанавливает мок-данные для тестирования
 * @param {any} data Данные для возврата функцией getGameData
 */
function setMockGameData(data: any): void {
  mockGameData = data;
}

/**
 * Устанавливает режим ошибки для тестирования обработки ошибок
 * @param {boolean} errorMode Включить/выключить режим ошибки
 */
function setMockErrorMode(errorMode: boolean): void {
  mockErrorMode = errorMode;
}

/**
 * Мок-версия getGameData, которая возвращает заранее установленные данные
 * @param {string} gameId ID матча (не используется в мок-версии)
 * @returns {Promise<any>} Promise с данными о матче или null
 */
async function getGameData(gameId: string): Promise<any> {
  if (mockErrorMode) {
    throw new Error('API connection error');
  }
  return mockGameData;
}

/**
 * Заглушка для getButtonText, которая использует мок-версию getGameData
 * @param {string} gameId ID матча
 * @param {string} conditionId ID условия
 * @param {string} outcomeId ID исхода
 * @returns {Promise<Object>} Объект с результатом сопоставления
 */
async function getButtonText(gameId: string, conditionId: string, outcomeId: string): Promise<ButtonMappingResult> {
  try {
    // Вызываем мок-версию getGameData, которая возвращает предустановленные данные
    const gameData = await getGameData(gameId);
    
    if (!gameData) {
      return {
        buttonText: null,
        confidence: 'low',
        marketType: null,
        explanation: 'Game not found in API'
      };
    }
    
    // Эмулируем поведение в зависимости от переданных параметров
    // Для тестов можно добавить условия для разных сценариев
    
    if (outcomeId === '29') {
      return {
        buttonText: '1',
        confidence: 'high',
        marketType: 'Match Result'
      };
    } else if (outcomeId === '31') {
      return {
        buttonText: '2',
        confidence: 'high',
        marketType: 'Match Result'
      };
    } else if (outcomeId === '32' && conditionId.includes('0640393189')) {
      return {
        buttonText: 'Under (2.5)',
        confidence: 'medium',
        marketType: 'Total Goals Over/Under'
      };
    } else if (outcomeId === '6266') {
      return {
        buttonText: '1X',
        confidence: 'high',
        marketType: 'Double Chance'
      };
    } else if (outcomeId === '9738' && conditionId.includes('0640393189')) {
      return {
        buttonText: '1 & Over (2.5)',
        confidence: 'high',
        marketType: 'Match Result & Over/Under'
      };
    }
    
    // Для неизвестных ID возвращаем null
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: 'Could not determine button text for this outcome'
    };
    
  } catch (error) {
    return {
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Вспомогательная функция для получения рекомендации в читаемом виде
 * @param {any} recommendation Рекомендация от ИИ-бота
 * @returns {Promise<string>} Promise с результатом в читаемом виде
 */
async function processRecommendation(recommendation: any): Promise<string> {
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
  
  const { gameId, conditionId, outcomeId } = recommendation;
  const result = await getButtonText(gameId, conditionId, outcomeId);
  
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

// Экспортируем функции
export {
  setMockGameData,
  setMockErrorMode,
  getGameData,
  getButtonText,
  processRecommendation
}; 