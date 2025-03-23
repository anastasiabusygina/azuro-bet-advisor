// @ts-nocheck
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { getButtonText, processRecommendation } from './matchButtonMapper';

// Мокаем node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

// Импортируем fetch после мокирования, чтобы получить мок
import fetch from 'node-fetch';

// Создаем класс Response вручную для тестов
class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = init.headers || {};
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    return JSON.parse(this.body);
  }
}

// Мокаем словарные функции
jest.mock('./azuroDictionaries', () => ({
  getMarketKey: jest.fn().mockImplementation((conditionId) => {
    if (conditionId === '0640393189') return 'match_result';
    if (conditionId === '0640393190') return 'totals';
    if (conditionId === '0640393191') return 'double_chance';
    if (conditionId === '0640393192') return 'match_result_and_totals';
    return 'unknown';
  }),
  getMarketName: jest.fn().mockImplementation((key) => {
    const marketNames = {
      'match_result': 'Match Result',
      'totals': 'Total Goals Over/Under',
      'double_chance': 'Double Chance',
      'match_result_and_totals': 'Match Result & Over/Under',
    };
    return marketNames[key] || 'Unknown';
  }),
  getSelectionName: jest.fn().mockImplementation((key, outcomeId) => {
    if (key === 'match_result') {
      if (outcomeId === '29') return '1';
      if (outcomeId === '30') return 'X';
      if (outcomeId === '31') return '2';
    } else if (key === 'totals') {
      if (outcomeId === '17') return 'Over';
      if (outcomeId === '32') return 'Under';
    } else if (key === 'double_chance') {
      if (outcomeId === '6266') return '1X';
      if (outcomeId === '6267') return '12';
      if (outcomeId === '6268') return 'X2';
    } else if (key === 'match_result_and_totals') {
      if (outcomeId === '9738') return '1 & Over';
    }
    return 'Unknown';
  })
}));

// Вспомогательная функция для подготовки ответа fetch
const mockFetch = (data) => {
  fetch.mockResolvedValueOnce(new MockResponse(
    JSON.stringify(data),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  ));
};

describe('matchButtonMapper интеграционные тесты', () => {
  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
  });

  test('Должен получать данные из GraphQL API', async () => {
    // Подготавливаем мок-данные для ответа API
    const mockApiResponse = {
      data: {
        game: {
          id: '12345',
          title: 'Team A vs Team B',
          league: { title: 'Example League' },
          startsAt: '2023-10-01T15:00:00Z',
          conditions: [
            {
              id: '1',
              conditionId: '0640393189',
              outcomes: [
                { id: '1_29', outcomeId: '29' },
                { id: '1_30', outcomeId: '30' },
                { id: '1_31', outcomeId: '31' }
              ]
            }
          ]
        }
      }
    };

    // Настраиваем мок для fetch
    mockFetch(mockApiResponse);

    // Запрашиваем маппинг для кнопки
    const result = await getButtonText('12345', '0640393189', '29');

    // Проверяем, что fetch был вызван с правильными аргументами
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: expect.any(String)
      })
    );

    // Проверяем, что результат корректен
    expect(result).toEqual({
      buttonText: '1',
      confidence: 'high',
      marketType: 'Match Result'
    });
  });

  test('Должен обрабатывать ставку типа 1X2', async () => {
    // Аналогичные мок-данные для Match Result (1X2)
    const mockApiResponse = {
      data: {
        game: {
          id: '12345',
          title: 'Team A vs Team B',
          league: { title: 'Example League' },
          startsAt: '2023-10-01T15:00:00Z',
          conditions: [
            {
              id: '1',
              conditionId: '0640393189',
              outcomes: [
                { id: '1_29', outcomeId: '29' },
                { id: '1_30', outcomeId: '30' },
                { id: '1_31', outcomeId: '31' }
              ]
            }
          ]
        }
      }
    };

    mockFetch(mockApiResponse);
    const result = await getButtonText('12345', '0640393189', '31');

    expect(result).toEqual({
      buttonText: '2',
      confidence: 'high',
      marketType: 'Match Result'
    });
  });

  test('Должен обрабатывать ставку типа Over/Under', async () => {
    // Мок-данные для Total Goals Over/Under
    const mockApiResponse = {
      data: {
        game: {
          id: '12345',
          title: 'Team A vs Team B',
          league: { title: 'Example League' },
          startsAt: '2023-10-01T15:00:00Z',
          conditions: [
            {
              id: '2',
              conditionId: '0640393190',
              param: '2.5',
              outcomes: [
                { id: '2_17', outcomeId: '17' },
                { id: '2_32', outcomeId: '32' }
              ]
            }
          ]
        }
      }
    };

    mockFetch(mockApiResponse);
    const result = await getButtonText('12345', '0640393190', '32');

    expect(result).toEqual({
      buttonText: 'Under (2.5)',
      confidence: 'high',
      marketType: 'Total Goals Over/Under'
    });
  });

  test('Должен обрабатывать ошибки подключения к API', async () => {
    // Имитируем ошибку API
    jest.mocked(fetch).mockRejectedValueOnce(new Error('API connection failed'));
    
    const result = await getButtonText('12345', '0640393189', '29');

    expect(result).toEqual({
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: expect.stringContaining('API connection failed')
    });
  });

  test('Должен обрабатывать случаи, когда игра не найдена', async () => {
    // Мок-данные, когда игра не найдена
    const mockApiResponse = {
      data: {
        game: null
      }
    };

    mockFetch(mockApiResponse);
    const result = await getButtonText('999', '0640393189', '29');

    expect(result).toEqual({
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: 'Game not found in API'
    });
  });

  test('Должен форматировать рекомендации от ИИ-бота', async () => {
    // Мок-данные для обработки рекомендации
    const mockApiResponse = {
      data: {
        game: {
          id: '12345',
          title: 'Team A vs Team B',
          league: { title: 'Example League' },
          startsAt: '2023-10-01T15:00:00Z',
          conditions: [
            {
              id: '1',
              conditionId: '0640393189',
              outcomes: [
                { id: '1_29', outcomeId: '29' },
                { id: '1_30', outcomeId: '30' },
                { id: '1_31', outcomeId: '31' }
              ]
            }
          ]
        }
      }
    };

    mockFetch(mockApiResponse);
    
    const recommendation = {
      gameId: '12345',
      conditionId: '0640393189',
      outcomeId: '29'
    };
    
    const result = await processRecommendation(recommendation);
    
    expect(result).toContain('Game ID: 12345');
    expect(result).toContain('Condition ID: 0640393189');
    expect(result).toContain('Outcome ID: 29');
    expect(result).toContain('Соответствующая кнопка в интерфейсе: "1"');
    expect(result).toContain('Уровень уверенности: high');
    expect(result).toContain('Тип рынка: Match Result');
  });

  /**
   * INTEGRATION TEST - REQUIRES EXTERNAL SERVICE
   * 
   * Этот тест требует подключения к реальному API Azuro и должен пропускаться в CI.
   * Не будет работать в автоматическом режиме - нужен только для ручного запуска.
   */
  // test('Должен работать с реальным API', async () => {
  //   // Интеграционный тест, не запускать в CI
  //   const isCI = process.env.CI === 'true';
  //   
  //   if (isCI) {
  //     console.log('Пропускаем тест с реальным API в CI');
  //     return;
  //   }
  //   
  //   // Этот тест использует реальный API, поэтому его лучше запускать вручную
  //   const result = await getButtonText(
  //     '100610060000000000267304920000000000000', 
  //     '100610060000000000267304920000000000000640393189', 
  //     '29'
  //   );
  //   
  //   // Проверяем только структуру ответа
  //   expect(result).toHaveProperty('buttonText');
  //   expect(result).toHaveProperty('confidence');
  //   expect(result).toHaveProperty('marketType');
  // }, 10000);
}); 