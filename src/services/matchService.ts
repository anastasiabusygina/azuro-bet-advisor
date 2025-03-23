import { Game } from '../interfaces/match';
import { matchesConfig } from '../config/config';

/**
 * Конвертирует время в московское
 */
export function toMoscowTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  
  return new Intl.DateTimeFormat('ru-RU', matchesConfig.timeZone?.dateFormat).format(date);
}

/**
 * Получает матчи из API или другого источника
 */
export async function getMatches(
  timeWindow: number, 
  sportName: string
): Promise<Game[]> {
  // Заглушка - в реальном коде здесь будет запрос к API
  return [
    // Пример матча
    {
      id: '123',
      gameId: '123',
      title: 'Team A vs Team B',
      startsAt: Math.floor(Date.now() / 1000) + 3600, // через час
      league: {
        name: 'Premier League'
      },
      country: {
        name: 'England'
      },
      participants: [
        { name: 'Team A' },
        { name: 'Team B' }
      ],
      conditions: []
    }
  ];
}

/**
 * Фильтрует игры по минимальным коэффициентам
 */
export function filterGamesByOdds(games: Game[], minOdds: number): Game[] {
  return games.filter(game => {
    // Проверяем, что хотя бы один исход имеет коэффициент >= minOdds
    return game.conditions.some(condition => 
      condition.outcomes.some(outcome => 
        (outcome.currentOdds || 0) >= minOdds
      )
    );
  });
}

/**
 * Форматирует список матчей для вывода
 */
export function formatMatches(games: Game[]): string {
  return games.map(game => {
    const conditionsText = game.conditions.map(condition => {
      const outcomesText = condition.outcomes.map(outcome => 
        `Outcome ID: ${outcome.outcomeId}, Odds: ${outcome.currentOdds || 'N/A'}`
      ).join('\n    ');
      
      return `Condition ID: ${condition.conditionId}\n    ${outcomesText}`;
    }).join('\n  ');
    
    return `${conditionsText}`;
  }).join('\n\n');
} 