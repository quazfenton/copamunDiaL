# CopaMundial - Complete API Endpoints Reference

**Version:** 3.0.0  
**Last Updated:** March 3, 2026  
**Base URL:** `http://localhost:3000/api` (development)

---

## Table of Contents

1. [Authentication & Auth](#authentication--auth)
2. [Teams](#teams)
3. [Players](#players)
4. [Matches](#matches)
5. [Leagues](#leagues)
6. [Tournaments](#tournaments)
7. [Notifications](#notifications)
8. [Friends](#friends)
9. [Pickup Games](#pickup-games)
10. [Search & Recommendations](#search--recommendations)
11. [Analytics](#analytics)
12. [Webhooks](#webhooks)
13. [File Upload](#file-upload)
14. [User Settings](#user-settings)
15. [Error Responses](#error-responses)

---

## Authentication & Auth

### Session Management

#### GET `/auth/session`
Get current user session

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://..."
  },
  "expires": "2026-03-04T00:00:00.000Z"
}
```

---

### Two-Factor Authentication

#### GET `/auth/2fa`
Get 2FA status for current user

**Response:**
```json
{
  "enabled": false,
  "setupRequired": true
}
```

#### POST `/auth/2fa`
Enable 2FA

**Request:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "backupCodes": ["ABC123", "DEF456", ...]
}
```

#### PATCH `/auth/2fa`
Disable 2FA

**Request:**
```json
{
  "token": "123456"
}
```

---

## Teams

### Team Management

#### GET `/teams`
List teams with filtering and pagination

**Query Parameters:**
- `search` (string) - Search by team name
- `location` (string) - Filter by location
- `userTeamsOnly` (boolean) - Only show user's teams
- `take` (number, default: 10) - Number of results
- `skip` (number, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team_123",
      "name": "FC Barcelona",
      "logo": "https://...",
      "bio": "Professional soccer team",
      "formation": "4-3-3",
      "location": "Barcelona, Spain",
      "isPrivate": false,
      "wins": 15,
      "losses": 3,
      "draws": 2,
      "rating": 85.5,
      "captains": ["user_123"],
      "players": [...],
      "reserves": [...],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

**Security:** Rate limited (30 req/min), input sanitization

#### POST `/teams`
Create new team

**Request:**
```json
{
  "name": "FC Barcelona",
  "bio": "Professional soccer team",
  "location": "Barcelona, Spain",
  "formation": "4-3-3",
  "isPrivate": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...team object }
}
```

**Security:** Rate limited, input sanitization, audit logging

#### GET `/teams/[id]`
Get team by ID

**Response:** Team object with full details

#### PUT `/teams/[id]`
Update team

**Request:** Team update object (all fields optional)

#### DELETE `/teams/[id]`
Delete team

**Security:** Only team creator/captain can delete

---

### Team Members

#### GET `/teams/[id]/members`
Get team members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "member_123",
      "userId": "user_123",
      "teamId": "team_123",
      "position": "Forward",
      "isReserve": false,
      "joinedAt": "2026-01-01T00:00:00.000Z",
      "user": {
        "id": "user_123",
        "name": "John Doe",
        "image": "https://...",
        "position": "Forward",
        "rating": 78.5
      }
    }
  ]
}
```

#### DELETE `/teams/[id]/members/[userId]`
Remove team member

**Security:** Only team creator/captain can remove members

---

### Team Statistics

#### GET `/teams/[id]/stats`
Get team statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": "team_123",
    "matches": {
      "total": 20,
      "wins": 15,
      "losses": 3,
      "draws": 2,
      "winRate": 0.75
    },
    "goals": {
      "for": 45,
      "against": 18,
      "difference": 27,
      "avgPerMatch": 2.25
    },
    "players": {
      "count": 18,
      "averageRating": 75.3,
      "topPlayers": [...]
    }
  }
}
```

---

## Players

### Player Management

#### GET `/players`
List players with filtering

**Query Parameters:**
- `search` (string) - Search by name
- `position` (string) - Filter by position
- `location` (string) - Filter by location
- `includePrivate` (boolean) - Include private fields (friends only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "name": "John Doe",
      "firstName": "John",
      "position": "Forward",
      "preferredPositions": ["ST", "LW"],
      "image": "https://...",
      "bio": "Experienced striker",
      "rating": 78.5,
      "stats": {
        "matches": 25,
        "goals": 18,
        "assists": 7,
        "rating": 78.5
      },
      "teams": ["team_123", "team_456"],
      "isCaptain": false
    }
  ]
}
```

**Security:** Rate limited, input sanitization

#### POST `/players`
Update player profile

**Request:**
```json
{
  "name": "John Doe",
  "firstName": "John",
  "position": "Forward",
  "preferredPositions": ["ST", "LW"],
  "bio": "Experienced striker",
  "phone": "+1234567890",
  "location": "Barcelona"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...player object }
}
```

**Security:** Rate limited, input sanitization, audit logging

#### PUT `/players`
Full player profile update

**Request:** Same as POST

---

### Player Profile

#### GET `/players/[id]`
Get player profile by ID

**Response:** Player object with full details

**Privacy:** Returns private fields only for self or friends

---

## Matches

### Match Management

#### GET `/matches`
List matches with filtering

**Query Parameters:**
- `teamId` (string) - Filter by team
- `status` (string) - SCHEDULED, LIVE, COMPLETED, CANCELLED
- `date` (string) - Filter by date
- `leagueId` (string) - Filter by league
- `sport` (string) - Filter by sport
- `ageGroup` (string) - Filter by age group
- `latitude`, `longitude`, `radius` - Location-based filtering

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "match_123",
      "homeTeamId": "team_123",
      "awayTeamId": "team_456",
      "date": "2026-03-10T15:00:00.000Z",
      "location": "Camp Nou",
      "latitude": 41.3809,
      "longitude": 2.1228,
      "sport": "soccer",
      "status": "SCHEDULED",
      "homeScore": null,
      "awayScore": null,
      "homeTeam": {
        "id": "team_123",
        "name": "FC Barcelona",
        "logo": "https://..."
      },
      "awayTeam": {
        "id": "team_456",
        "name": "Real Madrid",
        "logo": "https://..."
      }
    }
  ]
}
```

#### POST `/matches`
Create new match

**Request:**
```json
{
  "homeTeamId": "team_123",
  "awayTeamId": "team_456",
  "date": "2026-03-10T15:00:00.000Z",
  "location": "Camp Nou",
  "latitude": 41.3809,
  "longitude": 2.1228,
  "sport": "soccer",
  "leagueId": "league_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...match object }
}
```

**Security:** User must be captain/creator of home team

---

### Live Score

#### GET `/matches/[id]/live-score`
Get current match score and events

**Response:**
```json
{
  "success": true,
  "data": {
    "match": {
      "id": "match_123",
      "homeTeam": {...},
      "awayTeam": {...},
      "homeScore": 2,
      "awayScore": 1,
      "status": "LIVE"
    },
    "events": [
      {
        "id": "event_123",
        "type": "GOAL",
        "minute": 23,
        "playerId": "user_123",
        "playerName": "John Doe",
        "team": "home",
        "details": { "assist": "user_456" }
      }
    ],
    "participants": [...]
  }
}
```

#### POST `/matches/[id]/live-score`
Update live match score

**Request:**
```json
{
  "homeScore": 2,
  "awayScore": 1,
  "minute": 75,
  "additionalTime": 3,
  "status": "LIVE",
  "events": [
    {
      "type": "GOAL",
      "playerId": "user_123",
      "minute": 73,
      "team": "home",
      "details": { "assist": "user_456" }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "match": { ...updated match },
    "events": [...]
  }
}
```

**Security:** Only team captains can update score

---

### Match Events

#### GET `/matches/[id]/events`
Get match events

**Response:** Array of match events

#### POST `/matches/[id]/events`
Add match event

**Request:**
```json
{
  "type": "GOAL",
  "playerId": "user_123",
  "minute": 45,
  "details": { "assist": "user_456" }
}
```

---

## Leagues

### League Management

#### GET `/leagues`
List all leagues

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "league_123",
      "name": "La Liga",
      "description": "Spanish top division",
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2027-05-31T00:00:00.000Z",
      "isPublic": true,
      "creator": {...},
      "teams": [...]
    }
  ]
}
```

#### POST `/leagues`
Create new league

**Request:**
```json
{
  "name": "La Liga",
  "description": "Spanish top division",
  "startDate": "2026-08-01",
  "endDate": "2027-05-31",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...league object }
}
```

#### GET `/leagues/[id]`
Get league by ID

#### PATCH `/leagues/[id]`
Update league

#### DELETE `/leagues/[id]`
Delete league

---

### League Teams

#### POST `/leagues/[id]/teams`
Add team to league

**Request:**
```json
{
  "teamId": "team_123"
}
```

#### DELETE `/leagues/[id]/teams/[teamId]`
Remove team from league

---

### League Standings

#### GET `/leagues/[id]/standings`
Get league standings

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "teamId": "team_123",
      "teamName": "FC Barcelona",
      "played": 20,
      "wins": 15,
      "losses": 3,
      "draws": 2,
      "goalsFor": 45,
      "goalsAgainst": 18,
      "goalDifference": 27,
      "points": 47
    }
  ]
}
```

---

## Tournaments

### Tournament Management

#### GET `/tournaments`
List tournaments

**Query Parameters:**
- `sport` (string)
- `status` (string) - DRAFT, REGISTRATION_OPEN, IN_PROGRESS, COMPLETED
- `dateFrom`, `dateTo` (string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tournament_123",
      "name": "Summer Cup 2026",
      "description": "Annual summer tournament",
      "sport": "soccer",
      "bracketType": "SINGLE_ELIMINATION",
      "status": "REGISTRATION_OPEN",
      "maxTeams": 16,
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2026-07-15T00:00:00.000Z",
      "registrationEnd": "2026-06-15T00:00:00.000Z",
      "location": "Barcelona",
      "entryFee": 100.00
    }
  ]
}
```

#### POST `/tournaments`
Create tournament

**Request:**
```json
{
  "name": "Summer Cup 2026",
  "description": "Annual summer tournament",
  "sport": "soccer",
  "bracketType": "SINGLE_ELIMINATION",
  "maxTeams": 16,
  "startDate": "2026-07-01",
  "endDate": "2026-07-15",
  "registrationEnd": "2026-06-15",
  "location": "Barcelona",
  "entryFee": 100.00
}
```

---

### Tournament Registration

#### POST `/tournaments/[id]/register`
Register team for tournament

**Request:**
```json
{
  "teamId": "team_123"
}
```

#### GET `/tournaments/[id]/bracket`
Get tournament bracket

---

## Notifications

### Notification Management

#### GET `/notifications`
Get user notifications

**Query Parameters:**
- `unreadOnly` (boolean) - Only unread notifications
- `limit` (number, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "userId": "user_123",
      "type": "TEAM_INVITE",
      "title": "Team Invitation",
      "message": "You've been invited to join FC Barcelona",
      "data": { "teamId": "team_123" },
      "isRead": false,
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/notifications/unread-count`
Get unread notification count

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

#### PUT `/notifications/[id]`
Mark notification as read

#### PUT `/notifications/mark-all-read`
Mark all notifications as read

#### DELETE `/notifications/[id]`
Delete notification

---

## Friends

### Friendship Management

#### GET `/friends/status/[userId]`
Check friendship status with user

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "friends", // self, friends, pending_sent, pending_received, not_friends
    "userId": "user_123",
    "friendId": "user_456"
  }
}
```

#### DELETE `/friends/[friendshipId]`
Remove friendship

---

## Pickup Games

### Pickup Game Management

#### GET `/pickup-games`
List pickup games

**Query Parameters:**
- `sport` (string)
- `date` (string)
- `location` (string)
- `latitude`, `longitude`, `radius` (number)

#### POST `/pickup-games`
Create pickup game

**Request:**
```json
{
  "location": "Central Park",
  "latitude": 40.785093,
  "longitude": -73.968285,
  "date": "2026-03-10T10:00:00.000Z",
  "sport": "soccer",
  "playersNeeded": 10,
  "description": "Casual 5v5 pickup game"
}
```

---

### Game Participation

#### GET `/pickup-games/[id]`
Get pickup game details

#### POST `/pickup-games/[id]/join`
Join pickup game

#### PATCH `/pickup-games/[id]`
Update pickup game (organizer only)

#### DELETE `/pickup-games/[id]`
Delete pickup game (organizer only)

---

## Search & Recommendations

### Global Search

#### GET `/search`
Global search across all entities

**Query Parameters:**
- `q` (string) - Search query
- `type` (string) - players, teams, matches, all
- `limit` (number, default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "players": [...],
    "teams": [...],
    "matches": [...]
  }
}
```

#### POST `/search/advanced`
Advanced search with filters

---

### AI Recommendations

#### GET `/recommendations/teams`
Get team recommendations

**Query Parameters:**
- `teamId` (string)
- `maxDistance` (number, km)
- `skillLevel` (string) - casual, competitive, professional

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "match": {...},
        "score": 85,
        "reasons": ["Well-matched skill levels", "Convenient location"]
      }
    ],
    "count": 10
  }
}
```

#### GET `/recommendations/matches`
Get match recommendations

---

### AI Analysis

#### GET `/analyze/opponent`
Analyze opponent team

**Query Parameters:**
- `ourTeamId` (string)
- `opponentTeamId` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "rating": 75.5,
      "formation": "4-4-2",
      "winRate": "65.0",
      "recentForm": "W-W-D-L-W"
    },
    "offense": {
      "goalsPerMatch": "2.3",
      "totalGoals": 23
    },
    "defense": {
      "goalsAgainstPerMatch": "1.2",
      "cleanSheets": 5
    },
    "strengths": ["High-scoring offense", "Strong defense"],
    "weaknesses": ["Limited squad depth"],
    "recommendations": ["Focus on defensive solidity"]
  }
}
```

#### GET `/chemistry/team/[id]`
Calculate team chemistry

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": "78.5",
    "level": "Good",
    "breakdown": {
      "consistencyScore": "82.3",
      "winRate": "75.0",
      "positionDiversity": "72.7"
    },
    "insights": ["Strong team cohesion", "Good position balance"]
  }
}
```

#### POST `/training/plan`
Generate training plan

**Request:**
```json
{
  "teamId": "team_123",
  "duration": 4,
  "focus": ["defense", "fitness"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": "team_123",
    "teamName": "FC Barcelona",
    "duration": 4,
    "focusAreas": ["defensive-organization", "attacking-finishing"],
    "weeklyPlans": [
      {
        "week": 1,
        "focus": "defensive-organization",
        "sessions": [...]
      }
    ]
  }
}
```

---

## Analytics

### Dashboard Analytics

#### GET `/analytics/dashboard`
Get analytics dashboard data

**Query Parameters:**
- `type` (string) - overview, player, team, match

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTeams": 5,
      "upcomingMatches": 3,
      "recentForm": "W-W-D"
    },
    "player": {...},
    "team": {...}
  }
}
```

---

### Admin Analytics

#### GET `/admin/dashboard`
Admin dashboard data

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1250,
      "totalTeams": 85,
      "totalMatches": 450,
      "totalTournaments": 12
    },
    "userGrowth": [...],
    "securityAnalytics": {...},
    "recentActivity": [...]
  }
}
```

---

## Webhooks

### Stripe Webhooks

#### POST `/webhooks/stripe`
Stripe webhook handler

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `checkout.session.completed`
- `charge.refunded`
- `charge.dispute.created`

**Security:** Requires Stripe signature header

---

## File Upload

### Image Upload

#### POST `/upload`
Upload image file

**Request:** Multipart form data with `file` field

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "publicId": "copamundial/avatars/abc123",
    "width": 200,
    "height": 200
  }
}
```

**Security:** File signature validation, size limits (5MB), image processing

---

## User Settings

### Notification Preferences

#### GET `/user/preferences/notifications`
Get notification preferences

**Response:**
```json
{
  "success": true,
  "data": {
    "emailTeamInvites": true,
    "emailMatchRequests": true,
    "pushTeamInvites": true,
    "pushMatchReminders": true,
    "digestEnabled": false,
    "digestFrequency": "weekly",
    "quietHoursEnabled": true,
    "quietHoursStart": 22,
    "quietHoursEnd": 8
  }
}
```

#### PUT `/user/preferences/notifications`
Update notification preferences

**Request:**
```json
{
  "emailTeamInvites": false,
  "pushMatchReminders": true,
  "digestFrequency": "daily"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Rate Limit Headers

All API responses include rate limit headers:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1677849600
Retry-After: 60 (if rate limited)
```

---

## Authentication

### Required Headers

Most endpoints require authentication via NextAuth.js session:

```
Authorization: Bearer <token>
```

Or via session cookie (automatic in browser).

### Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth | 5 req/min | 1 minute |
| Upload | 5 req/min | 1 minute |
| Search | 5 req/10s | 10 seconds |
| API (default) | 30 req/min | 1 minute |
| Teams | 60 req/min | 1 minute |
| Players | 100 req/min | 1 minute |

---

## MCP Server Tools

The following tools are available via MCP protocol:

1. `create_team` - Create new teams
2. `find_teams` - Search teams
3. `schedule_match` - Schedule matches
4. `calculate_player_rating` - Player ratings
5. `get_team_statistics` - Team stats
6. `find_available_matches` - Match discovery
7. `get_match_recommendations` - AI recommendations
8. `analyze_opponent` - Opponent analysis
9. `generate_training_plan` - Training plans
10. `find_nearby_players` - Location search
11. `calculate_team_chemistry` - Team chemistry

---

## SDK Integration

### JavaScript/TypeScript

```typescript
import { CopaMundialClient } from '@copamundial/sdk';

const client = new CopaMundialClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.copamundial.com',
});

// Get teams
const teams = await client.teams.list({
  search: 'Barcelona',
  take: 10,
});

// Create match
const match = await client.matches.create({
  homeTeamId: 'team_123',
  awayTeamId: 'team_456',
  date: new Date('2026-03-10'),
});

// Get AI recommendations
const recommendations = await client.ai.getMatchRecommendations({
  teamId: 'team_123',
  maxDistance: 50,
});
```

---

**API Version:** 3.0.0  
**Last Updated:** March 3, 2026  
**Support:** api@copamundial.com
