import { Player, TeamData, MatchData, LeagueData, PickupGameData, FormationType } from './types';

// Formation positions for different sports
export const formationPositions = {
  Soccer: {
    "4-4-2": [
      { top: "90%", left: "50%" },  // GK
      { top: "75%", left: "20%" },  // LB
      { top: "75%", left: "40%" },  // CB1
      { top: "75%", left: "60%" },  // CB2
      { top: "75%", left: "80%" },  // RB
      { top: "55%", left: "15%" },  // LM
      { top: "55%", left: "35%" },  // CM1
      { top: "55%", left: "65%" },  // CM2
      { top: "55%", left: "85%" },  // RM
      { top: "30%", left: "40%" },  // ST1
      { top: "30%", left: "60%" },  // ST2
    ],
    "4-3-3": [
      { top: "90%", left: "50%" },  // GK
      { top: "75%", left: "20%" },  // LB
      { top: "75%", left: "40%" },  // CB1
      { top: "75%", left: "60%" },  // CB2
      { top: "75%", left: "80%" },  // RB
      { top: "55%", left: "30%" },  // CM1
      { top: "55%", left: "50%" },  // CM2
      { top: "55%", left: "70%" },  // CM3
      { top: "30%", left: "25%" },  // LW
      { top: "30%", left: "50%" },  // ST
      { top: "30%", left: "75%" },  // RW
    ],
    "3-5-2": [
      { top: "90%", left: "50%" },  // GK
      { top: "75%", left: "30%" },  // CB1
      { top: "75%", left: "50%" },  // CB2
      { top: "75%", left: "70%" },  // CB3
      { top: "55%", left: "15%" },  // LWB
      { top: "55%", left: "35%" },  // CM1
      { top: "55%", left: "50%" },  // CM2
      { top: "55%", left: "65%" },  // CM3
      { top: "55%", left: "85%" },  // RWB
      { top: "30%", left: "40%" },  // ST1
      { top: "30%", left: "60%" },  // ST2
    ],
    "4-2-3-1": [
      { top: "90%", left: "50%" },  // GK
      { top: "75%", left: "20%" },  // LB
      { top: "75%", left: "40%" },  // CB1
      { top: "75%", left: "60%" },  // CB2
      { top: "75%", left: "80%" },  // RB
      { top: "60%", left: "40%" },  // CDM1
      { top: "60%", left: "60%" },  // CDM2
      { top: "40%", left: "25%" },  // LM
      { top: "40%", left: "50%" },  // CAM
      { top: "40%", left: "75%" },  // RM
      { top: "25%", left: "50%" },  // ST
    ]
  }
};

// Players data
export const players: Player[] = [
  { 
    id: 1, 
    name: "John Doe", 
    firstName: "John",
    position: "Forward", 
    preferredPositions: ["Forward", "Midfielder"], 
    avatar: "/placeholder.svg", 
    isCaptain: true,
    teams: [1],
    bio: "Passionate soccer player with excellent scoring ability.",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    stats: { matches: 42, goals: 28, assists: 15, rating: 4.2 }
  },
  { 
    id: 2, 
    name: "Jane Smith", 
    firstName: "Jane",
    position: "Midfielder", 
    preferredPositions: ["Midfielder", "Defender"], 
    avatar: "/placeholder.svg",
    teams: [1],
    bio: "Creative midfielder with excellent passing skills.",
    email: "jane.smith@example.com",
    stats: { matches: 38, goals: 8, assists: 22, rating: 4.0 }
  },
  { 
    id: 3, 
    name: "Mike Johnson", 
    firstName: "Mike",
    position: "Defender", 
    preferredPositions: ["Defender"], 
    avatar: "/placeholder.svg",
    teams: [1],
    bio: "Solid defender with strong aerial ability.",
    email: "mike.johnson@example.com",
    stats: { matches: 40, goals: 3, assists: 8, rating: 3.8 }
  },
  { 
    id: 4, 
    name: "Sarah Williams", 
    firstName: "Sarah",
    position: "Goalkeeper", 
    preferredPositions: ["Goalkeeper"], 
    avatar: "/placeholder.svg",
    teams: [1],
    bio: "Reliable goalkeeper with quick reflexes.",
    email: "sarah.williams@example.com",
    stats: { matches: 35, goals: 0, assists: 2, rating: 4.1 }
  },
  { 
    id: 5, 
    name: "Tom Brown", 
    firstName: "Tom",
    position: "Forward", 
    preferredPositions: ["Forward"], 
    avatar: "/placeholder.svg",
    teams: [1],
    bio: "Fast striker with great finishing ability.",
    email: "tom.brown@example.com",
    stats: { matches: 30, goals: 18, assists: 7, rating: 3.9 }
  },
  { 
    id: 6, 
    name: "Emily Davis", 
    firstName: "Emily",
    position: "Midfielder", 
    preferredPositions: ["Midfielder", "Forward"], 
    avatar: "/placeholder.svg",
    teams: [1],
    bio: "Versatile player who can play multiple positions.",
    email: "emily.davis@example.com",
    stats: { matches: 36, goals: 12, assists: 14, rating: 3.7 }
  },
  { 
    id: 7, 
    name: "David Wilson", 
    firstName: "David",
    position: "Defender", 
    preferredPositions: ["Defender", "Midfielder"], 
    avatar: "/placeholder.svg",
    teams: [2],
    bio: "Strong defender who can also play in midfield.",
    email: "david.wilson@example.com",
    stats: { matches: 32, goals: 4, assists: 9, rating: 3.6 }
  },
  { 
    id: 8, 
    name: "Lisa Taylor", 
    firstName: "Lisa",
    position: "Midfielder", 
    preferredPositions: ["Midfielder"], 
    avatar: "/placeholder.svg",
    teams: [2],
    bio: "Box-to-box midfielder with great work rate.",
    email: "lisa.taylor@example.com",
    stats: { matches: 34, goals: 7, assists: 11, rating: 3.8 }
  },
  { 
    id: 9, 
    name: "Robert Martinez", 
    firstName: "Robert",
    position: "Forward", 
    preferredPositions: ["Forward"], 
    avatar: "/placeholder.svg",
    teams: [2],
    bio: "Clinical finisher with great positioning.",
    email: "robert.martinez@example.com",
    stats: { matches: 29, goals: 21, assists: 6, rating: 4.0 }
  },
  { 
    id: 10, 
    name: "Jessica Anderson", 
    firstName: "Jessica",
    position: "Defender", 
    preferredPositions: ["Defender"], 
    avatar: "/placeholder.svg",
    teams: [2],
    bio: "Tough defender with leadership qualities.",
    email: "jessica.anderson@example.com",
    stats: { matches: 31, goals: 2, assists: 5, rating: 3.7 }
  },
  { 
    id: 11, 
    name: "Michael Thomas", 
    firstName: "Michael",
    position: "Goalkeeper", 
    preferredPositions: ["Goalkeeper"], 
    avatar: "/placeholder.svg",
    teams: [2],
    bio: "Experienced goalkeeper with excellent shot-stopping.",
    email: "michael.thomas@example.com",
    stats: { matches: 33, goals: 0, assists: 1, rating: 3.9 }
  },
];

// Teams data
export const teams: TeamData[] = [
  {
    id: 1,
    name: "John's Team",
    logo: "/placeholder.svg",
    bio: "A competitive team focused on attacking football and teamwork.",
    players: players.slice(0, 6),
    reserves: [],
    captains: [1],
    formation: "4-4-2",
    wins: 5,
    losses: 2,
    draws: 1,
    createdBy: 1,
    location: "New York, USA",
    isPrivate: false
  },
  {
    id: 2,
    name: "Rival FC",
    logo: "/placeholder.svg",
    bio: "An experienced team with a strong defensive style.",
    players: players.slice(6, 11),
    reserves: [],
    captains: [7],
    formation: "4-3-3",
    wins: 4,
    losses: 3,
    draws: 1,
    createdBy: 7,
    location: "Brooklyn, NY",
    isPrivate: false
  },
  {
    id: 3,
    name: "City United",
    logo: "/placeholder.svg",
    bio: "A young and dynamic team with fast-paced gameplay.",
    players: [],
    reserves: [],
    captains: [],
    formation: "3-5-2",
    wins: 6,
    losses: 1,
    draws: 1,
    createdBy: 0,
    location: "Manhattan, NY",
    isPrivate: false
  }
];

// Matches data
export const matches: MatchData[] = [
  {
    id: 1,
    homeTeam: teams[0],
    awayTeam: teams[1],
    date: "2023-06-15",
    time: "15:00",
    location: "Main Stadium",
    status: "completed",
    score: {
      home: 2,
      away: 1
    }
  },
  {
    id: 2,
    homeTeam: teams[0],
    awayTeam: teams[2],
    date: "2023-06-22",
    time: "18:30",
    location: "City Arena",
    status: "scheduled"
  },
  {
    id: 3,
    homeTeam: teams[1],
    awayTeam: teams[2],
    date: "2023-06-08",
    time: "20:00",
    location: "Rival Stadium",
    status: "completed",
    score: {
      home: 0,
      away: 2
    }
  }
];

// Leagues data
export const leagues: LeagueData[] = [
  {
    id: 1,
    name: "Premier League",
    teams: teams,
    matches: matches,
    startDate: "2023-05-01",
    endDate: "2023-07-30"
  },
  {
    id: 2,
    name: "Champions Cup",
    teams: teams.slice(0, 2),
    matches: matches.slice(0, 1),
    startDate: "2023-06-01",
    endDate: "2023-08-15"
  }
];

// Pickup games data
export const pickupGames: PickupGameData[] = [
  {
    id: 1,
    location: "Community Field",
    date: "2023-06-18",
    time: "17:00",
    sport: "Soccer",
    playersNeeded: 10,
    playersJoined: 6,
    organizer: players[0]
  },
  {
    id: 2,
    location: "Downtown Court",
    date: "2023-06-20",
    time: "19:00",
    sport: "Basketball",
    playersNeeded: 8,
    playersJoined: 5,
    organizer: players[1]
  }
];

// Formation positions
export const formations = {
  "4-4-2": [
    { x: 48, y: 88, number: 1, name: "Goalkeeper" },
    { x: 18, y: 68, number: 2, name: "RB" },
    { x: 38, y: 68, number: 3, name: "CB" },
    { x: 58, y: 68, number: 4, name: "CB" },
    { x: 78, y: 68, number: 5, name: "LB" },
    { x: 18, y: 48, number: 6, name: "RM" },
    { x: 38, y: 48, number: 7, name: "CM" },
    { x: 58, y: 48, number: 8, name: "CM" },
    { x: 78, y: 48, number: 9, name: "LM" },
    { x: 33, y: 28, number: 10, name: "ST" },
    { x: 63, y: 28, number: 11, name: "ST" },
  ],
  "4-3-3": [
    { x: 48, y: 88, number: 1, name: "Goalkeeper" },
    { x: 18, y: 68, number: 2, name: "RB" },
    { x: 38, y: 68, number: 3, name: "CB" },
    { x: 58, y: 68, number: 4, name: "CB" },
    { x: 78, y: 68, number: 5, name: "LB" },
    { x: 28, y: 48, number: 6, name: "CM" },
    { x: 48, y: 48, number: 7, name: "CM" },
    { x: 68, y: 48, number: 8, name: "CM" },
    { x: 18, y: 28, number: 9, name: "RW" },
    { x: 48, y: 23, number: 10, name: "ST" },
    { x: 78, y: 28, number: 11, name: "LW" },
  ],
  "3-5-2": [
    { x: 48, y: 88, number: 1, name: "Goalkeeper" },
    { x: 28, y: 68, number: 2, name: "CB" },
    { x: 48, y: 68, number: 3, name: "CB" },
    { x: 68, y: 68, number: 4, name: "CB" },
    { x: 18, y: 48, number: 5, name: "RWB" },
    { x: 38, y: 48, number: 6, name: "CM" },
    { x: 48, y: 43, number: 7, name: "CDM" },
    { x: 58, y: 48, number: 8, name: "CM" },
    { x: 78, y: 48, number: 9, name: "LWB" },
    { x: 38, y: 28, number: 10, name: "ST" },
    { x: 58, y: 28, number: 11, name: "ST" },
  ],
  "4-2-3-1": [
    { x: 48, y: 88, number: 1, name: "Goalkeeper" },
    { x: 18, y: 68, number: 2, name: "RB" },
    { x: 38, y: 68, number: 3, name: "CB" },
    { x: 58, y: 68, number: 4, name: "CB" },
    { x: 78, y: 68, number: 5, name: "LB" },
    { x: 38, y: 53, number: 6, name: "CDM" },
    { x: 58, y: 53, number: 7, name: "CDM" },
    { x: 28, y: 38, number: 8, name: "RAM" },
    { x: 48, y: 38, number: 9, name: "CAM" },
    { x: 68, y: 38, number: 10, name: "LAM" },
    { x: 48, y: 23, number: 11, name: "ST" },
  ],
} as const;

// Formation positions for different sports
export const formationPositions = {
  Soccer: {
    "4-4-2": [
      { top: "85%", left: "50%" }, // GK
      { top: "65%", left: "20%" }, // RB
      { top: "65%", left: "40%" }, // CB
      { top: "65%", left: "60%" }, // CB
      { top: "65%", left: "80%" }, // LB
      { top: "45%", left: "20%" }, // RM
      { top: "45%", left: "40%" }, // CM
      { top: "45%", left: "60%" }, // CM
      { top: "45%", left: "80%" }, // LM
      { top: "25%", left: "35%" }, // ST
      { top: "25%", left: "65%" }, // ST
    ],
    "4-3-3": [
      { top: "85%", left: "50%" }, // GK
      { top: "65%", left: "20%" }, // RB
      { top: "65%", left: "40%" }, // CB
      { top: "65%", left: "60%" }, // CB
      { top: "65%", left: "80%" }, // LB
      { top: "45%", left: "30%" }, // CM
      { top: "45%", left: "50%" }, // CM
      { top: "45%", left: "70%" }, // CM
      { top: "25%", left: "20%" }, // RW
      { top: "20%", left: "50%" }, // ST
      { top: "25%", left: "80%" }, // LW
    ],
    "3-5-2": [
      { top: "85%", left: "50%" }, // GK
      { top: "65%", left: "30%" }, // CB
      { top: "65%", left: "50%" }, // CB
      { top: "65%", left: "70%" }, // CB
      { top: "45%", left: "15%" }, // RWB
      { top: "45%", left: "35%" }, // CM
      { top: "50%", left: "50%" }, // CDM
      { top: "45%", left: "65%" }, // CM
      { top: "45%", left: "85%" }, // LWB
      { top: "25%", left: "35%" }, // ST
      { top: "25%", left: "65%" }, // ST
    ],
    "4-2-3-1": [
      { top: "85%", left: "50%" }, // GK
      { top: "65%", left: "20%" }, // RB
      { top: "65%", left: "40%" }, // CB
      { top: "65%", left: "60%" }, // CB
      { top: "65%", left: "80%" }, // LB
      { top: "50%", left: "40%" }, // CDM
      { top: "50%", left: "60%" }, // CDM
      { top: "35%", left: "25%" }, // RAM
      { top: "35%", left: "50%" }, // CAM
      { top: "35%", left: "75%" }, // LAM
      { top: "20%", left: "50%" }, // ST
    ],
  },
  Basketball: {
    "1-2-2": [
      { top: "80%", left: "50%" }, // PG
      { top: "60%", left: "30%" }, // SG
      { top: "60%", left: "70%" }, // SF
      { top: "30%", left: "30%" }, // PF
      { top: "30%", left: "70%" }, // C
    ],
    "2-3": [
      { top: "80%", left: "30%" }, // PG
      { top: "80%", left: "70%" }, // SG
      { top: "50%", left: "20%" }, // SF
      { top: "50%", left: "50%" }, // PF
      { top: "50%", left: "80%" }, // C
    ],
    "3-2": [
      { top: "80%", left: "20%" }, // PG
      { top: "80%", left: "50%" }, // SG
      { top: "80%", left: "80%" }, // SF
      { top: "40%", left: "35%" }, // PF
      { top: "40%", left: "65%" }, // C
    ],
  },
  "American Football": {
    "4-3": [
      { top: "85%", left: "50%" }, // QB
      { top: "75%", left: "30%" }, // RB
      { top: "75%", left: "70%" }, // WR
      { top: "65%", left: "50%" }, // OL
      { top: "55%", left: "30%" }, // DL
      { top: "55%", left: "50%" }, // DL
      { top: "55%", left: "70%" }, // DL
      { top: "45%", left: "30%" }, // LB
      { top: "45%", left: "50%" }, // LB
      { top: "45%", left: "70%" }, // LB
      { top: "35%", left: "50%" }, // S
    ],
    "3-4": [
      { top: "85%", left: "50%" }, // QB
      { top: "75%", left: "30%" }, // RB
      { top: "75%", left: "70%" }, // WR
      { top: "65%", left: "50%" }, // OL
      { top: "55%", left: "35%" }, // DL
      { top: "55%", left: "50%" }, // DL
      { top: "55%", left: "65%" }, // DL
      { top: "45%", left: "20%" }, // LB
      { top: "45%", left: "40%" }, // LB
      { top: "45%", left: "60%" }, // LB
      { top: "45%", left: "80%" }, // LB
    ],
    "Nickel": [
      { top: "85%", left: "50%" }, // QB
      { top: "75%", left: "30%" }, // RB
      { top: "75%", left: "70%" }, // WR
      { top: "65%", left: "50%" }, // OL
      { top: "55%", left: "30%" }, // DL
      { top: "55%", left: "50%" }, // DL
      { top: "55%", left: "70%" }, // DL
      { top: "45%", left: "35%" }, // LB
      { top: "45%", left: "65%" }, // LB
      { top: "35%", left: "30%" }, // CB
      { top: "35%", left: "70%" }, // CB
    ],
  },
  Baseball: {
    "Standard": [
      { top: "85%", left: "50%" }, // P
      { top: "75%", left: "50%" }, // C
      { top: "65%", left: "30%" }, // 1B
      { top: "55%", left: "45%" }, // 2B
      { top: "55%", left: "55%" }, // SS
      { top: "65%", left: "70%" }, // 3B
      { top: "40%", left: "20%" }, // LF
      { top: "30%", left: "50%" }, // CF
      { top: "40%", left: "80%" }, // RF
    ],
    "Shift": [
      { top: "85%", left: "50%" }, // P
      { top: "75%", left: "50%" }, // C
      { top: "65%", left: "30%" }, // 1B
      { top: "55%", left: "60%" }, // 2B
      { top: "55%", left: "70%" }, // SS
      { top: "65%", left: "80%" }, // 3B
      { top: "40%", left: "20%" }, // LF
      { top: "30%", left: "50%" }, // CF
      { top: "40%", left: "80%" }, // RF
    ],
    "Infield In": [
      { top: "85%", left: "50%" }, // P
      { top: "75%", left: "50%" }, // C
      { top: "60%", left: "30%" }, // 1B
      { top: "50%", left: "45%" }, // 2B
      { top: "50%", left: "55%" }, // SS
      { top: "60%", left: "70%" }, // 3B
      { top: "40%", left: "20%" }, // LF
      { top: "30%", left: "50%" }, // CF
      { top: "40%", left: "80%" }, // RF
    ],
  },
};