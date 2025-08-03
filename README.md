# PlayMate - Sports Management Application

A comprehensive, production-ready sports team management application built with Next.js, featuring real-time communication, database persistence, authentication, and mobile optimization.

## 🚀 Features

### Core Functionality
- **Team Management**: Create, manage, and organize sports teams
- **Player Profiles**: Detailed player statistics, achievements, and profiles
- **Match Scheduling**: Schedule and manage matches between teams
- **League Management**: Create and manage competitive leagues
- **Pickup Games**: Organize casual pickup games in your area

### Real-time Features
- **Live Chat**: Team-based real-time messaging
- **Formation Updates**: Real-time formation changes visible to all team members
- **Match Scoring**: Live score updates during matches
- **Notifications**: Instant notifications for invites, matches, and updates
- **User Presence**: See who's online/offline

### Advanced Features
- **Authentication**: Secure user authentication with NextAuth.js
- **File Uploads**: Profile pictures and team logos with image optimization
- **Mobile Optimized**: Responsive design with PWA support
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Database Persistence**: PostgreSQL with Prisma ORM

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Real-time**: Socket.IO
- **File Upload**: Sharp for image processing
- **Validation**: Zod
- **Drag & Drop**: React DnD

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd copamunDiaL
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
Copy the example environment file and configure your variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/playmate_db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Site URL for Socket.IO
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database with sample data (optional)
npx ts-node scripts/migrate-data.ts
```

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the application.

## 📱 Mobile & PWA Support

The application is fully responsive and includes Progressive Web App (PWA) features:

- **Installable**: Can be installed on mobile devices and desktops
- **Offline Support**: Basic offline functionality with service workers
- **Mobile Navigation**: Touch-friendly navigation optimized for mobile
- **App-like Experience**: Full-screen mode and native app feel

## 🔧 Development

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature-specific components
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication configuration
│   ├── db.ts             # Database client
│   └── types.ts          # TypeScript type definitions
├── hooks/                 # Custom React hooks
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── scripts/              # Utility scripts
```

### Key Components

#### Enhanced Sports App (`components/enhanced-sports-app.tsx`)
Main application component with authentication, real-time features, and error handling.

#### Real-time Hooks (`hooks/use-socket.ts`)
Custom hooks for Socket.IO integration:
- `useSocket()`: Basic socket connection
- `useTeamSocket()`: Team-specific real-time features
- `useNotifications()`: Real-time notifications
- `useUserPresence()`: User online/offline status

#### API Client (`lib/api-client.ts`)
Centralized API client with error handling and retry logic.

### Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users**: Player profiles with authentication
- **Teams**: Team information and settings
- **Matches**: Scheduled and completed matches
- **Leagues**: Competitive league management
- **Notifications**: Real-time notification system
- **Messages**: Team chat functionality

## 🔐 Authentication

The app supports multiple authentication methods:

1. **Google OAuth**: Sign in with Google account
2. **Email/Password**: Traditional email authentication
3. **Session Management**: Secure session handling with NextAuth.js

## 🌐 API Endpoints

### Players
- `GET /api/players` - Get all players
- `PUT /api/players` - Update player profile

### Teams
- `GET /api/teams` - Get teams
- `POST /api/teams` - Create new team
- `PUT /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team

### Matches
- `GET /api/matches` - Get matches
- `POST /api/matches` - Create match

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/[id]` - Update notification

### File Upload
- `POST /api/upload` - Upload files (avatars, team logos)

## 🚀 Deployment

### Environment Variables for Production
```env
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

### Build and Deploy
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Deployment Platforms
The application can be deployed on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **DigitalOcean App Platform**
- **AWS/GCP/Azure**

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include error messages, browser/device info, and steps to reproduce

## 🔮 Future Enhancements

- [ ] Advanced statistics and analytics
- [ ] Video analysis integration
- [ ] Tournament bracket management
- [ ] Social media integration
- [ ] Advanced search and filtering
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Calendar integration
- [ ] Payment processing for leagues
- [ ] AI-powered team recommendations

---

/* Main application orchestrator: components/sports-management-app.tsx - Contains all primary state management for teams, players, matches, leagues, and pickup games.

Data models: lib/types.ts - TypeScript interfaces defining Player, TeamData, MatchData, LeagueData, PickupGameData, Notification, TeamInvite, and MatchRequest.

Static data: lib/data.ts - Contains initial data for teams, players, matches, leagues, and pickup games.

UI Components I've examined:

Formation graphics with draggable player positions: components/formation-graphic.tsx and components/player-position.tsx
Team lineup management: components/team-lineup.tsx
Team management dialogs: components/team-management.tsx
Player invitation dialogs: components/player-invite.tsx
Match finder with filtering capabilities: components/match-finder.tsx
Desktop dashboard with widget cards: components/desktop.tsx
Additional UI components: player-card.tsx, soccer-field.tsx, sport-selector.tsx, etc.
Supporting libraries:

shadcn/ui components (dialog, tabs, button, card, etc.)
Framer Motion for animations
React DnD for drag-and-drop functionality
Key technical concepts identified:

Next.js 14 with App Router architecture
React Server Components and Client Components pattern
TypeScript for type safety
Component composition with shadcn/ui
Sports-specific UI elements (formation graphics, player positions)
State management using React hooks
Responsive UI design with Tailwind CSS
Dialog-based interfaces
Data modeling for various sports management entities
Tabbed interfaces for organizing functionality */