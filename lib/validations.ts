/**
 * Comprehensive Zod Validation Schemas
 * 
 * Provides type-safe validation for all API endpoints
 */

import { z } from 'zod'

// ============================================
// Common Schemas & Utilities
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const idSchema = z.string().cuid()

export const dateSchema = z.coerce.date()

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

// ============================================
// User Schemas
// ============================================

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['PLAYER', 'TEAM_MANAGER', 'LEAGUE_ADMIN', 'REFEREE', 'SPECTATOR']).default('PLAYER'),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  position: z.string().max(50).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']).optional(),
  preferredSports: z.array(z.string()).optional(),
  availability: z.record(z.array(z.string())).optional(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
})

export const userProfileSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string().email(),
  image: z.string().url().nullable().optional(),
  role: z.string(),
  createdAt: dateSchema,
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ============================================
// Team Schemas
// ============================================

export const teamCreateSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  sport: z.string().min(1, 'Sport is required'),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  logo: z.string().url().optional(),
  isPublic: z.boolean().default(true),
  maxMembers: z.number().int().min(2).max(50).default(25),
  contactEmail: z.string().email().optional(),
  socialLinks: z.object({
    website: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
    facebook: z.string().url().optional(),
  }).optional(),
})

export const teamUpdateSchema = teamCreateSchema.partial()

export const teamMemberSchema = z.object({
  userId: idSchema,
  role: z.enum(['CAPTAIN', 'COACH', 'PLAYER', 'SUBSTITUTE', 'MANAGER']),
  position: z.string().max(50).optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
})

export const teamInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['PLAYER', 'SUBSTITUTE', 'COACH']).default('PLAYER'),
  message: z.string().max(500).optional(),
})

export const teamSearchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  sport: z.string().optional(),
  location: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxRating: z.coerce.number().min(0).max(5).optional(),
  isPublic: z.coerce.boolean().optional(),
  hasOpenings: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
})

// ============================================
// Match Schemas
// ============================================

export const matchCreateSchema = z.object({
  homeTeamId: idSchema,
  awayTeamId: idSchema,
  sport: z.string().min(1, 'Sport is required'),
  scheduledAt: dateSchema,
  venue: z.string().min(1, 'Venue is required').max(200),
  venueAddress: z.string().max(500).optional(),
  coordinates: coordinatesSchema.optional(),
  matchType: z.enum(['FRIENDLY', 'LEAGUE', 'TOURNAMENT', 'PLAYOFF', 'FINAL']).default('FRIENDLY'),
  rules: z.string().max(2000).optional(),
  maxPlayersPerTeam: z.number().int().min(1).max(30).optional(),
  duration: z.number().int().min(1).max(300).optional(), // minutes
  refereeId: idSchema.optional(),
})

export const matchUpdateSchema = z.object({
  scheduledAt: dateSchema.optional(),
  venue: z.string().max(200).optional(),
  venueAddress: z.string().max(500).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
})

export const matchScoreUpdateSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  events: z.array(z.object({
    type: z.enum(['GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'INJURY', 'OTHER']),
    playerId: idSchema,
    minute: z.number().int().min(0).max(200),
    details: z.string().max(500).optional(),
  })).optional(),
})

export const matchSearchSchema = z.object({
  teamId: idSchema.optional(),
  sport: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  venue: z.string().optional(),
  matchType: z.enum(['FRIENDLY', 'LEAGUE', 'TOURNAMENT', 'PLAYOFF', 'FINAL']).optional(),
  ...paginationSchema.shape,
})

// ============================================
// Match Request Schemas
// ============================================

export const matchRequestCreateSchema = z.object({
  toTeamId: idSchema,
  sport: z.string().min(1, 'Sport is required'),
  proposedDate: dateSchema,
  proposedVenue: z.string().min(1, 'Proposed venue is required').max(200),
  message: z.string().max(1000).optional(),
  matchType: z.enum(['FRIENDLY', 'LEAGUE', 'TOURNAMENT']).default('FRIENDLY'),
})

export const matchRequestResponseSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
  counterDate: dateSchema.optional(),
  counterVenue: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
})

// ============================================
// Tournament Schemas
// ============================================

export const tournamentCreateSchema = z.object({
  name: z.string().min(2, 'Tournament name must be at least 2 characters').max(200),
  sport: z.string().min(1, 'Sport is required'),
  description: z.string().max(2000).optional(),
  bracketType: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE']),
  maxTeams: z.number().int().min(2).max(128),
  minTeams: z.number().int().min(2).max(64).optional(),
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  registrationDeadline: dateSchema.optional(),
  location: z.string().max(200).optional(),
  venues: z.array(z.string().max(200)).optional(),
  entryFee: z.number().min(0).optional(),
  prizeInfo: z.string().max(1000).optional(),
  rules: z.string().max(5000).optional(),
  contactEmail: z.string().email().optional(),
  isPublic: z.boolean().default(true),
  settings: z.object({
    thirdPlaceMatch: z.boolean().optional(),
    groupSize: z.number().int().min(2).max(8).optional(),
    teamsAdvancePerGroup: z.number().int().min(1).max(4).optional(),
    matchDuration: z.number().int().min(1).max(300).optional(),
    breakBetweenMatches: z.number().int().min(0).max(120).optional(),
  }).optional(),
}).refine(data => {
  if (data.endDate && data.startDate > data.endDate) {
    return false
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => {
  if (data.minTeams && data.minTeams > data.maxTeams) {
    return false
  }
  return true
}, {
  message: 'Minimum teams cannot exceed maximum teams',
  path: ['minTeams'],
})

export const tournamentUpdateSchema = tournamentCreateSchema.partial()

export const tournamentTeamRegisterSchema = z.object({
  teamId: idSchema,
  seed: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
})

export const tournamentMatchUpdateSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  winnerId: idSchema.optional(),
})

export const tournamentSearchSchema = z.object({
  query: z.string().max(100).optional(),
  sport: z.string().optional(),
  status: z.enum(['DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  bracketType: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE']).optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  location: z.string().optional(),
  hasOpenings: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
})

// ============================================
// Player Stats Schemas
// ============================================

export const playerStatsUpdateSchema = z.object({
  matchId: idSchema,
  goals: z.number().int().min(0).optional(),
  assists: z.number().int().min(0).optional(),
  yellowCards: z.number().int().min(0).max(2).optional(),
  redCards: z.number().int().min(0).max(1).optional(),
  minutesPlayed: z.number().int().min(0).max(200).optional(),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
})

export const playerStatsQuerySchema = z.object({
  playerId: idSchema.optional(),
  teamId: idSchema.optional(),
  sport: z.string().optional(),
  season: z.string().optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  ...paginationSchema.shape,
})

// ============================================
// Notification Schemas
// ============================================

export const notificationCreateSchema = z.object({
  userId: idSchema,
  type: z.enum(['MATCH_INVITE', 'TEAM_INVITE', 'MATCH_REMINDER', 'SCORE_UPDATE', 'SYSTEM', 'CHAT']),
  title: z.string().min(1).max(200),
  message: z.string().max(1000),
  link: z.string().url().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  expiresAt: dateSchema.optional(),
})

export const notificationUpdateSchema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
})

export const notificationQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.enum(['MATCH_INVITE', 'TEAM_INVITE', 'MATCH_REMINDER', 'SCORE_UPDATE', 'SYSTEM', 'CHAT']).optional(),
  ...paginationSchema.shape,
})

// ============================================
// Chat & Messaging Schemas
// ============================================

export const chatMessageSchema = z.object({
  channelId: idSchema,
  content: z.string().min(1, 'Message cannot be empty').max(2000),
  replyToId: idSchema.optional(),
  attachments: z.array(z.object({
    type: z.enum(['IMAGE', 'FILE', 'LINK']),
    url: z.string().url(),
    name: z.string().max(200).optional(),
    size: z.number().int().optional(),
  })).max(5).optional(),
})

export const chatChannelCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['TEAM', 'MATCH', 'TOURNAMENT', 'DIRECT']),
  participantIds: z.array(idSchema).min(1),
  teamId: idSchema.optional(),
  matchId: idSchema.optional(),
  tournamentId: idSchema.optional(),
})

// ============================================
// Search & Filter Schemas
// ============================================

export const globalSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  types: z.array(z.enum(['USER', 'TEAM', 'MATCH', 'TOURNAMENT'])).optional(),
  sport: z.string().optional(),
  location: z.string().optional(),
  radius: z.number().min(0).max(500).optional(), // km
  coordinates: coordinatesSchema.optional(),
  ...paginationSchema.shape,
})

// ============================================
// File Upload Schemas
// ============================================

export const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(['IMAGE', 'DOCUMENT', 'VIDEO']),
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // 50MB max
  purpose: z.enum(['AVATAR', 'TEAM_LOGO', 'MATCH_PHOTO', 'DOCUMENT', 'ATTACHMENT']),
})

// ============================================
// Analytics Schemas
// ============================================

export const analyticsQuerySchema = z.object({
  entityType: z.enum(['USER', 'TEAM', 'MATCH', 'TOURNAMENT']),
  entityId: idSchema,
  metrics: z.array(z.string()).min(1),
  fromDate: dateSchema,
  toDate: dateSchema,
  granularity: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
})

export const reportGenerateSchema = z.object({
  reportType: z.enum(['TEAM_PERFORMANCE', 'PLAYER_STATS', 'TOURNAMENT_SUMMARY', 'MATCH_ANALYSIS']),
  entityId: idSchema,
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  format: z.enum(['JSON', 'PDF', 'CSV']).default('JSON'),
  includeCharts: z.boolean().default(false),
})

// ============================================
// Webhook Schemas
// ============================================

export const webhookCreateSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'match.created', 'match.updated', 'match.completed',
    'team.created', 'team.updated', 'team.member_added',
    'tournament.created', 'tournament.started', 'tournament.completed',
  ])).min(1),
  secret: z.string().min(16).max(64).optional(),
  isActive: z.boolean().default(true),
})

// ============================================
// Validation Helper Functions
// ============================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, errors: result.error.errors }
}

export function formatValidationErrors(errors: z.ZodError['errors']): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  
  for (const error of errors) {
    const path = error.path.join('.') || 'root'
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(error.message)
  }
  
  return formatted
}

export function createApiResponse<T>(
  data: T | null,
  error: string | null = null,
  status: number = 200
) {
  if (error) {
    return { success: false, error, data: null, status }
  }
  return { success: true, error: null, data, status }
}

// Export all schemas as a namespace
export const schemas = {
  // Pagination
  pagination: paginationSchema,
  
  // User
  userCreate: userCreateSchema,
  userUpdate: userUpdateSchema,
  userProfile: userProfileSchema,
  login: loginSchema,
  passwordReset: passwordResetSchema,
  passwordChange: passwordChangeSchema,
  
  // Team
  teamCreate: teamCreateSchema,
  teamUpdate: teamUpdateSchema,
  teamMember: teamMemberSchema,
  teamInvite: teamInviteSchema,
  teamSearch: teamSearchSchema,
  
  // Match
  matchCreate: matchCreateSchema,
  matchUpdate: matchUpdateSchema,
  matchScoreUpdate: matchScoreUpdateSchema,
  matchSearch: matchSearchSchema,
  
  // Match Request
  matchRequestCreate: matchRequestCreateSchema,
  matchRequestResponse: matchRequestResponseSchema,
  
  // Tournament
  tournamentCreate: tournamentCreateSchema,
  tournamentUpdate: tournamentUpdateSchema,
  tournamentTeamRegister: tournamentTeamRegisterSchema,
  tournamentMatchUpdate: tournamentMatchUpdateSchema,
  tournamentSearch: tournamentSearchSchema,
  
  // Stats
  playerStatsUpdate: playerStatsUpdateSchema,
  playerStatsQuery: playerStatsQuerySchema,
  
  // Notification
  notificationCreate: notificationCreateSchema,
  notificationUpdate: notificationUpdateSchema,
  notificationQuery: notificationQuerySchema,
  
  // Chat
  chatMessage: chatMessageSchema,
  chatChannelCreate: chatChannelCreateSchema,
  
  // Search
  globalSearch: globalSearchSchema,
  
  // File
  fileUpload: fileUploadSchema,
  
  // Analytics
  analyticsQuery: analyticsQuerySchema,
  reportGenerate: reportGenerateSchema,
  
  // Webhook
  webhookCreate: webhookCreateSchema,
}

// Type exports
export type UserCreate = z.infer<typeof userCreateSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type Login = z.infer<typeof loginSchema>
export type TeamCreate = z.infer<typeof teamCreateSchema>
export type TeamUpdate = z.infer<typeof teamUpdateSchema>
export type MatchCreate = z.infer<typeof matchCreateSchema>
export type MatchUpdate = z.infer<typeof matchUpdateSchema>
export type TournamentCreate = z.infer<typeof tournamentCreateSchema>
export type TournamentUpdate = z.infer<typeof tournamentUpdateSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type GlobalSearch = z.infer<typeof globalSearchSchema>
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
