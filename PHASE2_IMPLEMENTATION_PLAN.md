# CopaMundial - Phase 2 Implementation Plan

## Executive Summary

This document outlines the comprehensive improvement plan for the CopaMundial/PlayMate sports management application. Based on thorough codebase analysis, we've identified **87 issues** across security, functionality, type safety, and completeness categories.

## Architecture Overview

### Current Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Real-time**: Socket.IO (standalone server)
- **Authentication**: NextAuth.js
- **Validation**: Zod

### Proposed Enhancements
- **MCP Server Integration**: Model Context Protocol for AI agent capabilities
- **Enhanced Security**: Rate limiting, CSRF, input sanitization
- **3rd Party Integrations**: Google Maps, Stripe, SendGrid, Cloudinary
- **Advanced Features**: Player rating engine, ML-based recommendations, tournament brackets

---

## Phase 1: Critical Security Fixes (Week 1)

### 1.1 Security Middleware Implementation

#### Files to Create/Modify:
- `middleware.ts` - Global security middleware
- `app/api/[...all]/route.ts` - Catch-all route for security
- Update all API routes with rate limiting

#### Tasks:
1. **Implement global rate limiting**
   - Auth endpoints: 10 req/min
   - Upload endpoints: 10 req/min  
   - Search endpoints: 30 req/min
   - Default: 100 req/min

2. **Add CSRF protection**
   - Generate tokens on session creation
   - Validate on all state-changing operations
   - Use double-submit cookie pattern

3. **Fix PII exposure**
   - Remove email/phone from public player searches
   - Add privacy settings for user profiles
   - Implement friend-only data sharing

4. **Re-enable image processing**
   - Fix sharp integration in upload route
   - Add file type validation beyond MIME
   - Implement virus scanning hook

### 1.2 Authentication Hardening

#### Files to Modify:
- `lib/auth.ts`
- `lib/security.ts`
- `app/api/auth/[...nextauth]/route.ts`

#### Tasks:
1. **Add password strength requirements**
   - Minimum 8 characters
   - Require uppercase, lowercase, number, special char
   - Check against common passwords list

2. **Implement session management**
   - Add session rotation
   - Implement session revocation
   - Add device fingerprinting

3. **Add 2FA support**
   - TOTP-based (Google Authenticator)
   - SMS-based (Twilio)
   - Email-based codes

---

## Phase 2: API Completeness (Week 2)

### 2.1 Missing API Endpoints

#### Create New Endpoints:

```
Teams:
- GET    /api/teams/[id]/members       - Get team members
- DELETE /api/teams/[id]/members/[userId] - Remove member
- GET    /api/teams/[id]/stats         - Get team statistics

Matches:
- GET    /api/matches/[id]             - Get single match
- GET    /api/matches/[id]/events      - Get match events
- POST   /api/matches/[id]/events      - Add match event

Players:
- GET    /api/players/[id]             - Get player profile
- GET    /api/players/nearby           - Find nearby players

Tournaments:
- GET    /api/tournaments/[id]         - Get tournament details
- PATCH  /api/tournaments/[id]         - Update tournament
- DELETE /api/tournaments/[id]         - Delete tournament
- POST   /api/tournaments/[id]/register - Register team

Leagues:
- GET    /api/leagues/[id]             - Get league details
- DELETE /api/leagues/[id]             - Delete league
- POST   /api/leagues/[id]/teams       - Add team to league

Pickup Games:
- GET    /api/pickup-games/[id]        - Get game details
- PATCH  /api/pickup-games/[id]        - Update game
- DELETE /api/pickup-games/[id]        - Delete game
- POST   /api/pickup-games/[id]/join   - Join game

Friends:
- DELETE /api/friends/[id]             - Remove friend
- GET    /api/friends/status/[userId]  - Check friendship status

Notifications:
- GET    /api/notifications/unread-count - Get unread count
- PUT    /api/notifications/mark-all-read - Mark all read
- DELETE /api/notifications/[id]       - Delete notification
```

### 2.2 Type Safety Improvements

#### Files to Modify:
- `lib/types.ts` - Align with Prisma schema
- `prisma/schema.prisma` - Add missing relations
- All API routes - Remove `any` types

#### Tasks:
1. **Create shared types from Prisma**
   ```typescript
   // lib/prisma-types.ts
   import { Prisma } from '@prisma/client';
   
   export type PlayerWithStats = Prisma.UserGetPayload<{
     include: { teams: true; achievements: true }
   }>;
   
   export type TeamWithMembers = Prisma.TeamGetPayload<{
     include: { 
       members: { include: { user: true } };
       captains: true;
     }
   }>;
   ```

2. **Fix enum inconsistencies**
   - Export Prisma enums
   - Import in frontend types
   - Ensure 1:1 mapping

3. **Standardize ID types**
   - All IDs are strings (cuid)
   - Remove parseInt() calls
   - Update API client signatures

---

## Phase 3: MCP Server Integration (Week 3)

### 3.1 MCP Server Architecture

#### What is MCP?
Model Context Protocol (MCP) enables AI agents to interact with your application through standardized tools and resources.

#### Files to Create:
```
mcp-server/
├── index.ts              # MCP server entry point
├── tools/
│   ├── teams.ts          # Team management tools
│   ├── matches.ts        # Match scheduling tools
│   ├── players.ts        # Player search tools
│   ├── recommendations.ts # ML recommendation tools
│   └── analytics.ts      # Statistics tools
├── resources/
│   ├── players.ts        # Player data resources
│   ├── teams.ts          # Team data resources
│   └── matches.ts        # Match data resources
└── prompts/
    ├── team-builder.ts   # Team composition prompts
    ├── match-analyzer.ts # Match analysis prompts
    └── scout-report.ts   # Player scouting prompts
```

#### Implementation:

```typescript
// mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

const server = new Server({
  name: 'copamundial-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// Register all tools, resources, and prompts
registerTools(server);
registerResources(server);
registerPrompts(server);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3.2 MCP Tools Implementation

#### Team Management Tools:
```typescript
// mcp-server/tools/teams.ts
server.tool(
  'create_team',
  'Create a new sports team',
  {
    name: z.string(),
    bio: z.string().optional(),
    location: z.string().optional(),
    formation: z.string().default('4-4-2'),
    isPrivate: z.boolean().default(false),
  },
  async (params) => {
    const team = await prisma.team.create({
      data: {
        ...params,
        createdBy: params.creatorId,
      },
    });
    return { team };
  }
);

server.tool(
  'find_teams',
  'Search for teams by criteria',
  {
    search: z.string().optional(),
    location: z.string().optional(),
    minRating: z.number().optional(),
    sport: z.string().optional(),
  },
  async (params) => {
    // Implementation
  }
);
```

#### Match Scheduling Tools:
```typescript
// mcp-server/tools/matches.ts
server.tool(
  'schedule_match',
  'Schedule a match between two teams',
  {
    homeTeamId: z.string(),
    awayTeamId: z.string(),
    date: z.string().datetime(),
    location: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  },
  async (params) => {
    // Implementation
  }
);

server.tool(
  'find_available_matches',
  'Find matches matching criteria',
  {
    teamId: z.string(),
    dateRange: z.object({ start: z.string(), end: z.string() }),
    location: z.string().optional(),
    radius: z.number().optional(),
  },
  async (params) => {
    // Implementation
  }
);
```

#### Player Rating Tools:
```typescript
// mcp-server/tools/ratings.ts
import { PlayerRatingEngine } from '@/lib/rating-engine';

const ratingEngine = new PlayerRatingEngine();

server.tool(
  'calculate_player_rating',
  'Calculate comprehensive player rating',
  {
    playerId: z.string(),
    includeHistory: z.boolean().default(true),
  },
  async (params) => {
    const player = await prisma.user.findUnique({
      where: { id: params.playerId },
      include: { 
        matchParticipants: {
          include: { match: true }
        }
      }
    });
    
    const rating = ratingEngine.calculateOverallRating(player, matches);
    return { rating, breakdown: ratingEngine.getBreakdown(player) };
  }
);

server.tool(
  'get_position_effectiveness',
  'Get player effectiveness by position',
  {
    playerId: z.string(),
    position: z.string(),
  },
  async (params) => {
    // Implementation
  }
);
```

### 3.3 MCP Resources Implementation

```typescript
// mcp-server/resources/players.ts
server.resource(
  'player_profile',
  new ResourceTemplate('copamundial://players/{playerId}', {
    list: async () => {
      const players = await prisma.user.findMany({
        select: { id: true, name: true, position: true }
      });
      return {
        resources: players.map(p => ({
          uri: `copamundial://players/${p.id}`,
          name: p.name,
        })),
      };
    },
  }),
  async (uri, playerId) => {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      include: {
        teams: true,
        achievements: true,
        matchParticipants: true,
      },
    });
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(player, null, 2),
      }],
    };
  }
);
```

### 3.4 MCP Prompts Implementation

```typescript
// mcp-server/prompts/team-builder.ts
server.prompt(
  'build_optimal_team',
  'Generate an optimal team composition based on available players',
  {
    availablePlayerIds: z.array(z.string()),
    preferredFormation: z.string().optional(),
    strategy: z.enum(['balanced', 'offensive', 'defensive']).optional(),
  },
  (args) => {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Given these available players: ${args.availablePlayerIds.join(', ')}, 
          suggest an optimal lineup using a ${args.preferredFormation || '4-4-2'} formation 
          with a ${args.strategy || 'balanced'} strategy. Consider player ratings, 
          preferred positions, and team chemistry.`,
        },
      }],
    };
  }
);
```

---

## Phase 4: 3rd Party Integrations (Week 4)

### 4.1 Google Maps Integration

#### Files to Create:
- `lib/maps.ts` - Google Maps utilities
- `app/api/maps/geocode/route.ts` - Geocoding endpoint
- `app/api/maps/distance/route.ts` - Distance matrix endpoint

#### Implementation:
```typescript
// lib/maps.ts
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export async function geocodeAddress(address: string) {
  const response = await client.geocode({
    params: {
      address,
      key: process.env.GOOGLE_MAPS_API_KEY!,
    },
  });
  
  const location = response.data.results[0]?.geometry.location;
  return {
    latitude: location?.lat,
    longitude: location?.lng,
    formattedAddress: response.data.results[0].formatted_address,
  };
}

export async function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const response = await client.distancematrix({
    params: {
      origins: [`${origin.lat},${origin.lng}`],
      destinations: [`${destination.lat},${destination.lng}`],
      key: process.env.GOOGLE_MAPS_API_KEY!,
    },
  });
  
  return response.data.rows[0]?.elements[0];
}
```

### 4.2 Stripe Payment Integration

#### Files to Create:
- `lib/stripe.ts` - Stripe utilities
- `app/api/payments/create-intent/route.ts` - Payment intent
- `app/api/payments/webhook/route.ts` - Webhook handler

#### Implementation:
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function createPaymentIntent({
  amount,
  currency,
  customerId,
  metadata,
}: {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
}) {
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}
```

### 4.3 SendGrid Email Integration

#### Files to Create:
- `lib/email.ts` - Email utilities
- `app/api/emails/send/route.ts` - Email endpoint

#### Implementation:
```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail({
  to,
  subject,
  html,
  templateId,
  dynamicTemplateData,
}: {
  to: string;
  subject?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}) {
  const msg: any = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
  };
  
  if (templateId) {
    msg.templateId = templateId;
    msg.dynamicTemplateData = dynamicTemplateData;
  } else {
    msg.subject = subject;
    msg.html = html;
  }
  
  return sgMail.send(msg);
}
```

### 4.4 Cloudinary Image Storage

#### Files to Modify:
- `app/api/upload/route.ts`

#### Implementation:
```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(
  file: Buffer,
  folder: string,
  options?: {
    width?: number;
    height?: number;
    format?: string;
  }
) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `copamundial/${folder}`,
        transformation: options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(file);
  });
}
```

---

## Phase 5: Advanced Features (Week 5-6)

### 5.1 Player Rating Engine

#### Files to Create:
- `lib/rating-engine.ts` - Rating calculation
- `app/api/players/[id]/rating/route.ts` - Rating endpoint

#### Implementation:
```typescript
// lib/rating-engine.ts
interface RatingMetrics {
  technicalSkill: number;
  physicalAttributes: number;
  mentalAttributes: number;
  consistency: number;
  positionRatings: Record<string, number>;
  performanceIndex: number;
  improvementRate: number;
}

export class PlayerRatingEngine {
  private weights = {
    recentPerformance: 0.4,
    seasonPerformance: 0.3,
    careerPerformance: 0.2,
    peerComparison: 0.1,
  };

  calculateOverallRating(
    player: Player,
    matches: MatchParticipant[]
  ): number {
    const recentMatches = matches.slice(-10);
    const recentRating = this.calculateRecentPerformance(recentMatches);
    const seasonRating = this.calculateSeasonPerformance(matches);
    const careerRating = this.calculateCareerPerformance(matches);
    const peerRating = this.calculatePeerComparison(player, matches);

    return (
      recentRating * this.weights.recentPerformance +
      seasonRating * this.weights.seasonPerformance +
      careerRating * this.weights.careerPerformance +
      peerRating * this.weights.peerComparison
    );
  }

  calculatePositionRating(
    player: Player,
    position: string,
    matches: MatchParticipant[]
  ): number {
    // Position-specific calculation
  }
}
```

### 5.2 ML-Based Match Recommendations

#### Files to Create:
- `lib/recommendation-engine.ts` - ML recommendations
- `app/api/recommendations/matches/route.ts` - Recommendations endpoint

#### Implementation:
```typescript
// lib/recommendation-engine.ts
import * as tf from '@tensorflow/tfjs-node';

export class RecommendationEngine {
  private model: tf.LayersModel | null = null;

  async trainModel(historicalData: MatchData[]) {
    // Prepare features
    const features = historicalData.map(m => [
      m.homeTeamRating,
      m.awayTeamRating,
      m.distance,
      m.timeOfDay,
      m.dayOfWeek,
    ]);

    const labels = historicalData.map(m => m.attendance ? 1 : 0);

    // Build model
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({
      inputShape: [5],
      units: 32,
      activation: 'relu',
    }));
    this.model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    }));

    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    await this.model.fit(
      tf.tensor2d(features),
      tf.tensor2d(labels),
      { epochs: 50 }
    );
  }

  async scoreMatches(
    matches: MatchData[],
    userPreferences: UserPreferences
  ): Promise<ScoredMatch[]> {
    // Implementation
  }
}
```

### 5.3 Tournament Bracket System

#### Files to Create:
- `lib/tournament-bracket.ts` - Bracket generation
- `app/api/tournaments/[id]/bracket/route.ts` - Bracket endpoint

#### Implementation:
```typescript
// lib/tournament-bracket.ts
interface BracketMatch {
  round: number;
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  winnerId?: string;
  homeScore?: number;
  awayScore?: number;
}

export class TournamentBracketGenerator {
  generateSingleElimination(teamIds: string[]): BracketMatch[] {
    const rounds = Math.ceil(Math.log2(teamIds.length));
    const matches: BracketMatch[] = [];
    
    // First round
    let matchNumber = 1;
    for (let i = 0; i < teamIds.length; i += 2) {
      matches.push({
        round: 1,
        matchNumber: matchNumber++,
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[i + 1] || teamIds[i], // Bye
      });
    }
    
    // Subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.ceil(teamIds.length / Math.pow(2, round));
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          round,
          matchNumber: matchNumber++,
        });
      }
    }
    
    return matches;
  }
}
```

---

## Phase 6: Testing & Quality (Week 7)

### 6.1 Unit Tests

#### Files to Create:
```
tests/
├── unit/
│   ├── rating-engine.test.ts
│   ├── recommendation-engine.test.ts
│   ├── security.test.ts
│   └── validators.test.ts
├── integration/
│   ├── api-teams.test.ts
│   ├── api-matches.test.ts
│   └── api-auth.test.ts
└── e2e/
    ├── auth-flow.spec.ts
    ├── team-management.spec.ts
    └── match-scheduling.spec.ts
```

### 6.2 Performance Testing

#### Files to Create:
- `tests/performance/api-benchmark.ts`
- `tests/performance/load-test.js`

---

## Implementation Checklist

### Week 1: Security
- [ ] Global rate limiting middleware
- [ ] CSRF protection
- [ ] PII exposure fixes
- [ ] Image processing re-enabled
- [ ] Password strength validation
- [ ] 2FA implementation

### Week 2: API Completeness
- [ ] 19 new API endpoints
- [ ] Type safety improvements
- [ ] Error handling standardization
- [ ] Response format standardization

### Week 3: MCP Server
- [ ] MCP server setup
- [ ] 15+ MCP tools
- [ ] 10+ MCP resources
- [ ] 5+ MCP prompts

### Week 4: 3rd Party Integrations
- [ ] Google Maps integration
- [ ] Stripe payments
- [ ] SendGrid emails
- [ ] Cloudinary storage

### Week 5-6: Advanced Features
- [ ] Player rating engine
- [ ] ML recommendations
- [ ] Tournament brackets
- [ ] Advanced analytics

### Week 7: Testing
- [ ] Unit tests (80% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance benchmarks

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@googlemaps/google-maps-services-js": "^3.4.0",
    "stripe": "^17.4.0",
    "@sendgrid/mail": "^8.1.4",
    "cloudinary": "^2.5.1",
    "@tensorflow/tfjs-node": "^4.22.0",
    "redis": "^4.7.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "csurf": "^1.11.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@testing-library/react": "^16.3.2",
    "vitest": "^4.0.18",
    "msw": "^2.7.0"
  }
}
```

---

## Success Metrics

### Security
- [ ] Zero critical vulnerabilities
- [ ] All endpoints rate-limited
- [ ] CSRF protection on all state-changing operations
- [ ] PII properly protected

### Functionality
- [ ] All planned API endpoints implemented
- [ ] Zero mock data in production components
- [ ] 100% type safety (no `any` types)

### MCP Integration
- [ ] 15+ tools available
- [ ] 10+ resources accessible
- [ ] 5+ prompts functional

### Quality
- [ ] 80%+ test coverage
- [ ] < 500ms API response time
- [ ] 99.9% uptime

---

## Risk Mitigation

### Technical Risks
1. **MCP adoption complexity**: Start with basic tools, expand gradually
2. **3rd party API costs**: Implement usage quotas, caching
3. **Database performance**: Add indexing, query optimization

### Timeline Risks
1. **Scope creep**: Prioritize P0/P1 items
2. **Integration complexity**: Build incrementally, test frequently
3. **Dependencies delays**: Have fallback options

---

## Next Steps

1. **Immediate** (Today):
   - Fix critical security vulnerabilities
   - Re-enable image processing
   - Add rate limiting

2. **This Week**:
   - Implement missing API endpoints
   - Fix type inconsistencies
   - Add error handling

3. **Next Week**:
   - Begin MCP server implementation
   - Set up 3rd party integrations
   - Start advanced features

---

*This plan provides a comprehensive roadmap for transforming CopaMundial into a production-ready, AI-enhanced sports management platform.*
