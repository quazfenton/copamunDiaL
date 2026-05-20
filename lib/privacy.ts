/**
 * Privacy Utilities
 * 
 * Helper functions for privacy checks and data access control
 */

import { prisma } from './db'

/**
 * Check if two users are friends
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: userId1, friendId: userId2 },
        { userId: userId2, friendId: userId1 },
      ],
      status: 'ACCEPTED',
    },
  })
  return !!friendship
}

/**
 * Check if user is team member
 */
export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  })
  return !!membership
}

/**
 * Check if user is team captain
 */
export async function isTeamCaptain(userId: string, teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captains: true },
  })
  
  if (!team) return false
  
  return team.captains.some((c) => c.id === userId)
}

/**
 * Check if user is team creator
 */
export async function isTeamCreator(userId: string, teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { createdBy: true },
  })
  
  return team?.createdBy === userId
}

/**
 * Get user's privacy settings
 */
export async function getUserPrivacySettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      location: true,
    },
  })
  
  return {
    showEmail: false, // Default to private
    showPhone: false,
    showLocation: false,
  }
}

/**
 * Sanitize user data for public view
 */
export function sanitizeUserData(user: any, relationship: 'self' | 'friend' | 'public') {
  const { password, ...safeUser } = user
  
  if (relationship === 'self') {
    return safeUser
  }
  
  if (relationship === 'friend') {
    // Friends can see email and phone
    return safeUser
  }
  
  // Public view - remove sensitive fields
  const { email, phone, location, ...publicUser } = safeUser
  return publicUser
}
