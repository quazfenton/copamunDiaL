export interface Player {
  id: number;
  name: string;
  firstName: string;
  position: string;
  preferredPositions: string[];
  image?: string;
  avatar?: string;
  bio?: string;
  email?: string;
  phone?: string;
  location?: string;
  isCaptain?: boolean;
  teams: number[]; // Array of team IDs the player belongs to
  stats?: {
    matches: number;
    goals: number;
    assists: number;
    rating: number;
  };
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
  bio?: string;
  players: Player[];
  reserves: Player[];
  captains: number[]; // Array of player IDs who are captains
  formation: string;
  wins: number;
  losses: number;
  draws: number;
  createdBy: number; // ID of the player who created the team
  location?: string;
  isPrivate?: boolean;
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

export interface Notification {
  id: number;
  type: 'team_invite' | 'match_request' | 'player_invite' | 'match_scheduled';
  title: string;
  message: string;
  fromPlayer?: Player;
  toPlayer: number;
  teamId?: number;
  matchId?: number;
  timestamp: string;
  isRead: boolean;
  status: 'pending' | 'accepted' | 'declined';
}

export interface TeamInvite {
  id: number;
  teamId: number;
  fromPlayerId: number;
  toPlayerId: number;
  message?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface MatchRequest {
  id: number;
  fromTeamId: number;
  toTeamId: number;
  proposedDate: string;
  proposedTime: string;
  proposedLocation: string;
  message?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}