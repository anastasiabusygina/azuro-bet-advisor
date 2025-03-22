/**
 * Модуль, предоставляющий мокированные данные и функции для маппинга кнопок матча
 * Используется для тестирования и отладки без реальных API-вызовов
 */

/**
 * Мокированный ответ от API с данными о доступных ставках
 */
export const mockAvailableBets = {
  game: {
    id: '1006000000000026825979',
    provider: {
      id: '1006'
    },
    startsAt: 1685084100,
    sport: {
      id: '6',
      name: 'Table Tennis'
    },
    league: {
      id: '137',
      name: 'Liga Pro (Czech Republic)',
      country: 'Czech Republic'
    },
    participants: [
      {
        id: '268259',
        name: 'Lukas Zeman'
      },
      {
        id: '270486',
        name: 'Tadeas Zika'
      }
    ],
    status: 1,
    slug: 'table-tennis/liga-pro-czech-republic/lukas-zeman-vs-tadeas-zika-1685084100',
    conditions: [
      {
        id: '1006000000000026825979',
        status: 1,
        outcomes: [
          {
            id: '1006000000000026825979-29',
            odds: '1820084894472',
            status: 1
          },
          {
            id: '1006000000000026825979-31',
            odds: '1922730109860',
            status: 1
          }
        ],
        core: false,
        gameId: '1006000000000026825979'
      },
      {
        id: '1006000000000026825979',
        status: 1,
        outcomes: [
          {
            id: '1006000000000026825979-00',
            odds: '1850000000043',
            status: 1,
            parameterX: '2.5'
          },
          {
            id: '1006000000000026825979-00',
            odds: '1850000000043',
            status: 1,
            parameterX: '2.5'
          }
        ],
        core: false,
        gameId: '1006000000000026825979'
      },
      {
        id: '1006000000000026825979',
        status: 1,
        outcomes: [
          {
            id: '1006000000000026825979-20',
            odds: '2716381643963',
            status: 1,
            parameterX: '-1.5'
          },
          {
            id: '1006000000000026825979-01',
            odds: '1402634122881',
            status: 1,
            parameterX: '+1.5'
          }
        ],
        core: false,
        gameId: '1006000000000026825979'
      },
      {
        id: '1006000000000026825979',
        status: 1,
        outcomes: [
          {
            id: '1006000000000026825979-10',
            odds: '1850000000043',
            status: 1,
            parameterX: 'E'
          },
          {
            id: '1006000000000026825979-11',
            odds: '1850000000043',
            status: 1,
            parameterX: 'O'
          }
        ],
        core: false,
        gameId: '1006000000000026825979'
      }
    ]
  }
};

/**
 * Мокированный словарь маппинга ID параметров на их отображаемые значения
 */
export const mockParameterMapping: Record<string, string> = {
  "1.5": "1.5",
  "2.5": "2.5",
  "3.5": "3.5",
  "+1.5": "+1.5",
  "-1.5": "-1.5",
  "E": "Even",
  "O": "Odd"
};

/**
 * Мокированный словарь маппинга ID условий на названия типов ставок
 */
export const mockConditionTypeMapping: Record<string, string> = {
  // Match Winner (1X2)
  "1006000000000026825979": "Match Winner",
  
  // Over/Under
  "1006000000000026825979-00": "Total Points",
  
  // Asian Handicap
  "1006000000000026825979-20": "Handicap Games",
  
  // Odd/Even
  "1006000000000026825979-10": "Total Ponts Odd/Even"
};

/**
 * Мокированный словарь маппинга ID исходов на названия кнопок для разных типов ставок
 */
export const mockOutcomeMapping: Record<string, Record<string, string>> = {
  // Маппинг для основных исходов
  "Match Winner": {
    "1006000000000026825979-29": "1",
    "1006000000000026825979-31": "2",
    "1006000000000026825979-30": "X"
  },
  
  // Маппинг для тоталов
  "Total Points": {
    "1006000000000026825979-00-over": "Over",
    "1006000000000026825979-00-under": "Under"
  },
  
  // Маппинг для форы
  "Handicap Games": {
    "1006000000000026825979-20": "Team 1",
    "1006000000000026825979-01": "Team 2"
  },
  
  // Маппинг для чет/нечет
  "Total Ponts Odd/Even": {
    "1006000000000026825979-10": "No",
    "1006000000000026825979-11": "Yes"
  }
};

/**
 * Мокированный словарь маппинга маркеров направления для разных исходов
 * + - положительный исход (выгодно)
 * - - отрицательный исход (не выгодно)
 * = - нейтральный исход
 */
export const mockDirectionMarkers: Record<string, string> = {
  "1006000000000026825979-29": "-",
  "1006000000000026825979-31": "-",
  "1006000000000026825979-00-over": "-",
  "1006000000000026825979-00-under": "-",
  "1006000000000026825979-20": "+",
  "1006000000000026825979-01": "-",
  "1006000000000026825979-10": "-",
  "1006000000000026825979-11": "-"
};

/**
 * Мокированная функция для получения данных игры
 * @param gameId ID игры
 * @returns Мокированные данные игры
 */
export function mockGetGameData(gameId: string) {
  if (gameId === '1006000000000026825979') {
    return mockAvailableBets.game;
  }
  
  return null;
} 