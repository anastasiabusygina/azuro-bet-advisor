export interface Game {
  id?: string;
  gameId?: string;
  title: string;
  startsAt: number;
  league: {
    name: string;
  };
  country: {
    name: string;
  };
  participants: Array<{
    name: string;
  }>;
  conditions: Condition[];
}

export interface Condition {
  id: string;
  conditionId: string;
  outcomes: Outcome[];
}

export interface Outcome {
  id: string;
  outcomeId: string;
  currentOdds?: number;
}

export interface Participant {
  name: string;
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
  bio: string;
  lore: string;
  messageDirections: string;
  postDirections: string;
  roomId: string;
  actors: string;
  recentMessages: string;
  recentMessagesData: any[];
} 