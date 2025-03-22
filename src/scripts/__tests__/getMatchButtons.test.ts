import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { getButtonText } from '../getMatchButtons';

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

// Import fetch after mocking to get the mock
import fetch from 'node-fetch';

// Mock response class
class MockResponse {
  body: string;
  status: number;
  statusText: string;
  headers: any;
  ok: boolean;

  constructor(body: string, init: { status?: number, statusText?: string, headers?: any } = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = init.headers || {};
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
  }
}

// Mock dictionary functions
jest.mock('../azuroDictionaries', () => ({
  getMarketKey: jest.fn().mockImplementation((conditionId) => {
    if (conditionId === '0640393189') return 'match_result';
    if (conditionId === '0640393190') return 'totals';
    if (conditionId === '0640393191') return 'double_chance';
    if (conditionId === '0640393192') return 'match_result_and_totals';
    return 'unknown';
  }),
  getMarketName: jest.fn().mockImplementation(({ marketKey }) => {
    const marketNames = {
      'match_result': 'Match Result',
      'totals': 'Total Goals Over/Under',
      'double_chance': 'Double Chance',
      'match_result_and_totals': 'Match Result & Over/Under',
    };
    return marketNames[marketKey] || 'Unknown';
  }),
  getSelectionName: jest.fn().mockImplementation(({ key, outcomeId }) => {
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

// Helper function to prepare fetch response
const mockFetch = (data: any) => {
  jest.mocked(fetch).mockResolvedValueOnce(new MockResponse(
    JSON.stringify(data),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  ));
};

describe('getMatchButtons integration tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should retrieve data from GraphQL API', async () => {
    // Prepare mock data for API response
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

    // Setup mock for fetch
    mockFetch(mockApiResponse);

    // Request button mapping
    const result = await getButtonText('12345', '0640393189', '29');

    // Check that fetch was called with correct arguments
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: expect.any(String)
      })
    );

    // Check that result is correct
    expect(result).toEqual({
      buttonText: '1',
      confidence: 'high',
      marketType: 'Match Result'
    });
  });

  test('should handle 1X2 bet type', async () => {
    // Similar mock data for Match Result (1X2)
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

  test('should handle Over/Under bet type', async () => {
    // Mock data for Total Goals Over/Under
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

  test('should handle API connection errors', async () => {
    // Simulate API error
    jest.mocked(fetch).mockRejectedValueOnce(new Error('API connection failed'));
    
    const result = await getButtonText('12345', '0640393189', '29');

    expect(result).toEqual({
      buttonText: null,
      confidence: 'low',
      marketType: null,
      explanation: expect.stringContaining('API connection failed')
    });
  });

  test('should handle cases where game is not found', async () => {
    // Mock data when game is not found
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
}); 