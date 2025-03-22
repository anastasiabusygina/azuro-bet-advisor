import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { fetchUpcomingMatches } from '../showUpcomingMatches';
import fs from 'fs';
import path from 'path';

// Mock node-fetch
jest.mock('node-fetch', () => {
  return jest.fn();
});

// Import fetch after mocking to get the mock
import fetch from 'node-fetch';

// Mock filesystem
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock response class
class MockResponse {
  body: string;
  status: number;
  statusText: string;
  headers: any;
  ok: boolean;
  redirected: boolean;
  type: string;
  url: string;

  constructor(body: string, init: { status?: number, statusText?: string, headers?: any } = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = init.headers || {};
    this.ok = this.status >= 200 && this.status < 300;
    this.redirected = false;
    this.type = 'default';
    this.url = 'https://example.com';
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

  async arrayBuffer(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.body).buffer;
  }

  async blob(): Promise<Blob> {
    return new Blob([this.body], { type: 'application/json' });
  }

  async formData(): Promise<FormData> {
    return new FormData();
  }
}

// Mock dictionary functions
jest.mock('../azuroDictionaries', () => ({
  getMarketKey: jest.fn().mockImplementation((conditionId) => {
    if (conditionId === '0640393189') return 'match_result';
    if (conditionId === '0640393190') return 'totals';
    return 'unknown';
  }),
  getMarketName: jest.fn().mockImplementation(({ marketKey }: { marketKey: string }) => {
    const marketNames: { [key: string]: string } = {
      'match_result': 'Match Result',
      'totals': 'Total Goals Over/Under',
    };
    return marketNames[marketKey] || 'Unknown';
  }),
  getSelectionName: jest.fn().mockImplementation(({ key, outcomeId }: { key: string, outcomeId: string }) => {
    if (key === 'match_result') {
      if (outcomeId === '29') return '1';
      if (outcomeId === '30') return 'X';
      if (outcomeId === '31') return '2';
    } else if (key === 'totals') {
      if (outcomeId === '17') return 'Over';
      if (outcomeId === '32') return 'Under';
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
  ) as unknown as Response);
};

describe('showUpcomingMatches integration tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should fetch upcoming matches from API', async () => {
    // Prepare mock data for API response
    const mockApiResponse = {
      data: {
        sports: [
          {
            name: 'Football',
            countries: [
              {
                name: 'England',
                leagues: [
                  {
                    name: 'Premier League',
                    games: [
                      {
                        id: '12345',
                        gameId: 'G12345',
                        title: 'Team A vs Team B',
                        startsAt: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now
                        status: 'Created',
                        participants: [
                          { name: 'Team A', sortOrder: 1 },
                          { name: 'Team B', sortOrder: 2 }
                        ],
                        conditions: [
                          {
                            conditionId: '0640393189',
                            status: 'Created',
                            title: 'Match Result',
                            reinforcement: '1000000',
                            outcomes: [
                              { outcomeId: '29', currentOdds: '2500000', title: '1', sortOrder: 1 },
                              { outcomeId: '30', currentOdds: '3000000', title: 'X', sortOrder: 2 },
                              { outcomeId: '31', currentOdds: '2800000', title: '2', sortOrder: 3 }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    // Setup mock for fetch
    mockFetch(mockApiResponse);

    // Call the function
    const result = await fetchUpcomingMatches({ hours: 2 });

    // Check that fetch was called with correct arguments
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: expect.stringContaining('GetUpcomingMatches')
      })
    );

    // Check that the request included time filter and status
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('startsAt_gt')
      })
    );

    // Check that the response is processed correctly
    expect(result).toEqual(mockApiResponse);
    expect(result.data.sports).toHaveLength(1);
    expect(result.data.sports[0].name).toBe('Football');
  });

  test('should filter by sport when specified', async () => {
    // Setup mock response
    mockFetch({
      data: {
        sports: []
      }
    });

    // Call with sport filter
    await fetchUpcomingMatches({ sport: 'Basketball' });

    // Verify that sport filter was included in the request
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('Basketball')
      })
    );

    // Verify variables structure
    const callBody = JSON.parse(jest.mocked(fetch).mock.calls[0][1].body);
    expect(callBody.variables.where).toEqual({ name_contains_nocase: 'Basketball' });
  });

  test('should handle empty response', async () => {
    // Mock empty response
    mockFetch({
      data: {
        sports: []
      }
    });

    // Call the function
    const result = await fetchUpcomingMatches();

    // Check result structure
    expect(result.data.sports).toEqual([]);
  });
}); 