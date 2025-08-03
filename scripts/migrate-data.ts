import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

// Sample data for initial migration
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    name: 'John Doe',
    firstName: 'John',
    position: 'Forward',
    preferredPositions: ['Forward', 'Midfielder'],
    bio: 'Passionate soccer player with excellent scoring ability.',
    phone: '+1 (555) 123-4567',
    location: 'New York, USA',
    rating: 4.2,
    matches: 42,
    goals: 28,
    assists: 15,
    wins: 25,
    losses: 12,
    draws: 5
  },
  {
    email: 'sarah.wilson@example.com',
    name: 'Sarah Wilson',
    firstName: 'Sarah',
    position: 'Midfielder',
    preferredPositions: ['Midfielder', 'Defender'],
    bio: 'Strategic midfielder with excellent passing skills.',
    phone: '+1 (555) 234-5678',
    location: 'Los Angeles, USA',
    rating: 4.0,
    matches: 38,
    goals: 12,
    assists: 22,
    wins: 20,
    losses: 10,
    draws: 8
  },
  {
    email: 'mike.johnson@example.com',
    name: 'Mike Johnson',
    firstName: 'Mike',
    position: 'Defender',
    preferredPositions: ['Defender'],
    bio: 'Solid defender with great leadership qualities.',
    phone: '+1 (555) 345-6789',
    location: 'Chicago, USA',
    rating: 3.8,
    matches: 35,
    goals: 3,
    assists: 8,
    wins: 18,
    losses: 12,
    draws: 5
  }
]

const sampleTeams = [
  {
    name: 'Thunder Bolts',
    bio: 'A competitive soccer team focused on teamwork and excellence.',
    formation: '4-4-2',
    location: 'New York, USA',
    isPrivate: false
  },
  {
    name: 'Lightning Strikers',
    bio: 'Fast-paced attacking team with young talent.',
    formation: '4-3-3',
    location: 'Los Angeles, USA',
    isPrivate: false
  }
]

async function migrateData() {
  try {
    console.log('Starting data migration...')

    // Create users
    const createdUsers = []
    for (const userData of sampleUsers) {
      const hashedPassword = await hashPassword('password123') // Default password
      
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          roles: ['PLAYER']
        }
      })
      
      createdUsers.push(user)
      console.log(`Created user: ${user.name}`)
    }

    // Create teams
    const createdTeams = []
    for (let i = 0; i < sampleTeams.length; i++) {
      const teamData = sampleTeams[i]
      const creator = createdUsers[i]
      
      const team = await prisma.team.create({
        data: {
          ...teamData,
          createdBy: creator.id,
          captains: {
            connect: { id: creator.id }
          }
        }
      })
      
      // Add creator as team member
      await prisma.teamMember.create({
        data: {
          userId: creator.id,
          teamId: team.id,
          position: creator.position || 'Player'
        }
      })
      
      createdTeams.push(team)
      console.log(`Created team: ${team.name}`)
    }

    // Add other users to teams
    for (let i = 1; i < createdUsers.length; i++) {
      const user = createdUsers[i]
      const team = createdTeams[0] // Add to first team
      
      await prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: team.id,
          position: user.position || 'Player'
        }
      })
      
      console.log(`Added ${user.name} to ${team.name}`)
    }

    // Create sample matches
    if (createdTeams.length >= 2) {
      const match = await prisma.match.create({
        data: {
          homeTeamId: createdTeams[0].id,
          awayTeamId: createdTeams[1].id,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
          location: 'Central Park Soccer Field',
          status: 'SCHEDULED'
        }
      })
      
      console.log(`Created sample match: ${createdTeams[0].name} vs ${createdTeams[1].name}`)
    }

    // Create sample pickup game
    const pickupGame = await prisma.pickupGame.create({
      data: {
        location: 'Local Community Center',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
        sport: 'Soccer',
        playersNeeded: 10,
        description: 'Casual soccer game, all skill levels welcome!',
        organizerId: createdUsers[0].id
      }
    })
    
    console.log(`Created pickup game at ${pickupGame.location}`)

    // Create sample notifications
    for (const user of createdUsers.slice(1)) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'TEAM_INVITE',
          title: 'Team Invitation',
          message: `You've been invited to join ${createdTeams[0].name}`,
          data: {
            teamId: createdTeams[0].id,
            fromUserId: createdUsers[0].id
          }
        }
      })
    }
    
    console.log('Created sample notifications')

    // Create sample achievements
    await prisma.achievement.create({
      data: {
        userId: createdUsers[0].id,
        type: 'GOALS',
        title: 'Goal Scorer',
        description: 'Scored 25+ goals in a season'
      }
    })
    
    console.log('Created sample achievements')

    console.log('Data migration completed successfully!')
    
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('Migration finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { migrateData }