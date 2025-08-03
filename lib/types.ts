export interface Player {
  id: string;
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
  teams: string[]; // Array of team IDs the player belongs to
  stats?: {
    matches: number;
    goals: number;
    assists: number;
    rating: number;
  };
  isOnline?: boolean;
  lastSeen?: string;
  achievements?: Achievement[];
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  bio?: string;
  phone?: string;
  location?: string;
  roles: Role[];
  firstName?: string;
  position?: string;
  preferredPositions: string[];
  rating?: number;
  isActive: boolean;
  matches: number;
  goals: number;
  assists: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  updatedAt: string;
}

export enum Role {
  PLAYER = 'PLAYER',
  TEAM_MANAGER = 'TEAM_MANAGER',
  LEAGUE_ADMIN = 'LEAGUE_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type FormationType = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

export interface PositionCoordinates {
  x: number;
  y: number;
  number: number;
  name: string;
}

export interface TeamData {
  id: string;
  name: string;
  logo?: string;
  bio?: string;
  players: Player[];
  reserves: Player[];
  captains: string[]; // Array of player IDs who are captains
  formation: string;
  wins: number;
  losses: number;
  draws: number;
  createdBy: string; // ID of the player who created the team
  location?: string;
  isPrivate?: boolean;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchData {
  id: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  date: string;
  location: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  participants?: MatchParticipant[];
  events?: MatchEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  userId: string;
  teamId: string;
  position?: string;
  goals: number;
  assists: number;
  rating?: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: EventType;
  minute: number;
  userId?: string;
  details?: any;
}

export interface LeagueData {
  id: string;
  name: string;
  teams: TeamData[];
  matches: MatchData[];
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PickupGameData {
  id: string;
  location: string;
  date: string;
  sport: string;
  playersNeeded: number;
  playersJoined: number;
  organizer: Player;
  description?: string;
  participants?: Player[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  fromPlayer?: Player;
  toPlayer: string;
  teamId?: string;
  matchId?: string;
  timestamp: string;
  isRead: boolean;
  status: InviteStatus;
  data?: any;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  fromPlayerId: string;
  toPlayerId: string;
  message?: string;
  timestamp: string;
  status: InviteStatus;
}

export interface MatchRequest {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  fromUserId: string;
  proposedDate: string;
  proposedLocation: string;
  message?: string;
  timestamp: string;
  status: InviteStatus;
}

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  teamId?: string;
  userId: string;
  user: Player;
  createdAt: string;
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED'
}

export enum NotificationType {
  TEAM_INVITE = 'TEAM_INVITE',
  MATCH_REQUEST = 'MATCH_REQUEST',
  PLAYER_INVITE = 'PLAYER_INVITE',
  MATCH_SCHEDULED = 'MATCH_SCHEDULED',
  MATCH_REMINDER = 'MATCH_REMINDER',
  ACHIEVEMENT = 'ACHIEVEMENT',
  SYSTEM = 'SYSTEM'
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM'
}

export enum EventType {
  GOAL = 'GOAL',
  ASSIST = 'ASSIST',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  MATCH_START = 'MATCH_START',
  MATCH_END = 'MATCH_END',
  HALF_TIME = 'HALF_TIME'
}