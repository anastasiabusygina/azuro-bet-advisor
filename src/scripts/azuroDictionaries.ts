/**
 * Module with functions for converting IDs from Azuro API to readable names
 * This is a simplified version that replaces @azuro-org/dictionaries
 */

/**
 * Determines market key by condition ID
 * @param {string} conditionId Condition ID
 * @returns {string} Market key
 */
export function getMarketKey(conditionId: string): string {
  // In reality, there should be more complex logic here
  // Simplified version for demonstration
  if (conditionId.endsWith('0640393189')) {
    return 'match_result';
  } else if (conditionId.endsWith('0640393190')) {
    return 'totals';
  } else if (conditionId.endsWith('0640393191')) {
    return 'double_chance';
  } else if (conditionId.endsWith('0640393192')) {
    return 'match_result_and_totals';
  } else {
    return 'unknown';
  }
}

/**
 * Gets market name by market key
 * @param {Object} params Parameters
 * @param {string} params.marketKey Market key
 * @returns {string} Market name
 */
export function getMarketName({ marketKey }: { marketKey: string }): string {
  const marketNames: Record<string, string> = {
    'match_result': 'Match Result',
    'totals': 'Total Goals Over/Under',
    'double_chance': 'Double Chance',
    'match_result_and_totals': 'Match Result & Over/Under',
    'handicap': 'Handicap',
    'both_teams_to_score': 'Both Teams to Score',
    'correct_score': 'Correct Score',
    'odd_or_even': 'Odd or Even'
  };

  return marketNames[marketKey] || 'Unknown Market';
}

/**
 * Gets selection name by market key and outcome ID
 * @param {Object} params Parameters
 * @param {string} params.key Market key
 * @param {string} params.outcomeId Outcome ID
 * @returns {string} Selection name
 */
export function getSelectionName({ key, outcomeId }: { key: string, outcomeId: string }): string {
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
    if (outcomeId === '9739') return '1 & Under';
    if (outcomeId === '9740') return 'X & Over';
    if (outcomeId === '9741') return 'X & Under';
    if (outcomeId === '9742') return '2 & Over';
    if (outcomeId === '9743') return '2 & Under';
  } else if (key === 'handicap') {
    if (outcomeId === '47') return '1';
    if (outcomeId === '48') return '2';
  }

  return 'Unknown Selection';
} 