export interface Participant {
  name: string;
  sortOrder: number;
}

export interface Outcome {
  outcomeId: string;
  currentOdds: string;
  name: string;
}

export interface Condition {
  conditionId: string;
  status: string;
  name: string;
  outcomes: Outcome[];
}

export interface Game {
  id: string;
  gameId: string;
  title: string;
  startsAt: number;
  status: string;
  sport: {
    name: string;
  };
  country: {
    name: string;
  };
  league: {
    name: string;
  };
  participants: Participant[];
  conditions: Condition[];
}

export interface MatchState {
  gameId: string;
  gameTitle: string;
  leagueName: string;
  countryName: string;
  participants: string;
  startTimeUTC: string;
  startTimeMoscow: string;
  formattedOdds: string;
  [key: string]: any;
} 