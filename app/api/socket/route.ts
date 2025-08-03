import { NextRequest } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const config = {
  api: {
    bodyParser: false,
  },
}

const SocketHandler = async (req: NextRequest, res: any) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const httpServer: NetServer = res.socket.server as any
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
          return next(new Error('Authentication error'))
        }
        socket.userId = session.user.id
        next()
      } catch (err) {
        next(new Error('Authentication error'))
      }
    })

    io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`)

      // Join user to their personal room
      socket.join(`user:${socket.userId}`)

      // Join team rooms
      socket.on('join-team', async (teamId: string) => {
        try {
          // Verify user is member of the team
          const membership = await prisma.teamMember.findFirst({
            where: {
              userId: socket.userId,
              teamId: teamId
            }
          })

          if (membership) {
            socket.join(`team:${teamId}`)
            console.log(`User ${socket.userId} joined team ${teamId}`)
          }
        } catch (error) {
          console.error('Error joining team:', error)
        }
      })

      // Leave team rooms
      socket.on('leave-team', (teamId: string) => {
        socket.leave(`team:${teamId}`)
        console.log(`User ${socket.userId} left team ${teamId}`)
      })

      // Handle team formation updates
      socket.on('formation-update', async (data: { teamId: string, formation: string, players: any[] }) => {
        try {
          // Verify user is captain of the team
          const team = await prisma.team.findFirst({
            where: {
              id: data.teamId,
              captains: {
                some: {
                  id: socket.userId
                }
              }
            }
          })

          if (team) {
            // Update formation in database
            await prisma.team.update({
              where: { id: data.teamId },
              data: { formation: data.formation }
            })

            // Broadcast to all team members
            socket.to(`team:${data.teamId}`).emit('formation-updated', {
              teamId: data.teamId,
              formation: data.formation,
              players: data.players,
              updatedBy: socket.userId
            })
          }
        } catch (error) {
          console.error('Error updating formation:', error)
        }
      })

      // Handle team chat messages
      socket.on('team-message', async (data: { teamId: string, content: string }) => {
        try {
          // Verify user is member of the team
          const membership = await prisma.teamMember.findFirst({
            where: {
              userId: socket.userId,
              teamId: data.teamId
            }
          })

          if (membership) {
            // Save message to database
            const message = await prisma.message.create({
              data: {
                content: data.content,
                teamId: data.teamId,
                userId: socket.userId,
                type: 'TEXT'
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    firstName: true,
                    image: true
                  }
                }
              }
            })

            // Broadcast to all team members
            io.to(`team:${data.teamId}`).emit('team-message-received', {
              id: message.id,
              content: message.content,
              type: message.type,
              teamId: message.teamId,
              userId: message.userId,
              user: message.user,
              createdAt: message.createdAt.toISOString()
            })
          }
        } catch (error) {
          console.error('Error sending team message:', error)
        }
      })

      // Handle match score updates
      socket.on('match-score-update', async (data: { matchId: string, homeScore: number, awayScore: number }) => {
        try {
          // Verify user has permission to update match scores
          const match = await prisma.match.findUnique({
            where: { id: data.matchId },
            include: {
              homeTeam: {
                include: {
                  captains: true
                }
              },
              awayTeam: {
                include: {
                  captains: true
                }
              }
            }
          })

          if (match) {
            const isCaptain = match.homeTeam.captains.some(c => c.id === socket.userId) ||
                             match.awayTeam.captains.some(c => c.id === socket.userId)

            if (isCaptain) {
              // Update match score
              await prisma.match.update({
                where: { id: data.matchId },
                data: {
                  homeScore: data.homeScore,
                  awayScore: data.awayScore
                }
              })

              // Broadcast to all match participants
              io.to(`match:${data.matchId}`).emit('match-score-updated', {
                matchId: data.matchId,
                homeScore: data.homeScore,
                awayScore: data.awayScore,
                updatedBy: socket.userId
              })
            }
          }
        } catch (error) {
          console.error('Error updating match score:', error)
        }
      })

      // Handle notifications
      socket.on('send-notification', async (data: { 
        toUserId: string, 
        type: string, 
        title: string, 
        message: string,
        data?: any 
      }) => {
        try {
          // Create notification in database
          const notification = await prisma.notification.create({
            data: {
              userId: data.toUserId,
              type: data.type as any,
              title: data.title,
              message: data.message,
              data: data.data
            }
          })

          // Send to specific user
          io.to(`user:${data.toUserId}`).emit('notification-received', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString()
          })
        } catch (error) {
          console.error('Error sending notification:', error)
        }
      })

      // Handle user presence
      socket.on('user-online', () => {
        socket.broadcast.emit('user-status-changed', {
          userId: socket.userId,
          isOnline: true
        })
      })

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`)
        socket.broadcast.emit('user-status-changed', {
          userId: socket.userId,
          isOnline: false
        })
      })
    })

    res.socket.server.io = io
  }
  res.end()
}

export { SocketHandler as GET, SocketHandler as POST }