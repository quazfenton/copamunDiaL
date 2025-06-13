export interface Player {
  id: number;
  name: string;
  position: string;
  image?: string;
  avatar?: string;
  isCaptain?: boolean;
}

export type FormationType = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

export interface PositionCoordinates {
  x: number;
  y: number;
  number: number;
  name: string;
}

export interface TeamData {
  id: number;
  name: string;
  logo?: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
}

export interface MatchData {
  id: number;
  homeTeam: TeamData;
  awayTeam: TeamData;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  score?: {
    home: number;
    away: number;
  };
}

export interface LeagueData {
  id: number;
  name: string;
  teams: TeamData[];
  matches: MatchData[];
  startDate: string;
  endDate: string;
}

export interface PickupGameData {
  id: number;
  location: string;
  date: string;
  time: string;
  sport: string;
  playersNeeded: number;
  playersJoined: number;
  organizer: Player;
}