/**
 * Notification Preferences System
 * 
 * Allows users to customize their notification settings
 */

import { prisma } from './db'

export interface NotificationPreferences {
  // Email notifications
  emailTeamInvites: boolean
  emailMatchRequests: boolean
  emailMatchReminders: boolean
  emailLeagueUpdates: boolean
  emailTournamentUpdates: boolean
  emailPaymentNotifications: boolean
  emailMarketing: boolean

  // Push notifications
  pushTeamInvites: boolean
  pushMatchRequests: boolean
  pushMatchReminders: boolean
  pushLiveScores: boolean
  pushLeagueUpdates: boolean

  // In-app notifications
  inAppAll: boolean

  // Notification frequency
  digestEnabled: boolean
  digestFrequency: 'daily' | 'weekly' | 'monthly'

  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart: number // Hour (0-23)
  quietHoursEnd: number // Hour (0-23)
}

const defaultPreferences: NotificationPreferences = {
  // Email - enabled by default for important notifications
  emailTeamInvites: true,
  emailMatchRequests: true,
  emailMatchReminders: true,
  emailLeagueUpdates: true,
  emailTournamentUpdates: true,
  emailPaymentNotifications: true,
  emailMarketing: false,

  // Push - enabled by default
  pushTeamInvites: true,
  pushMatchRequests: true,
  pushMatchReminders: true,
  pushLiveScores: true,
  pushLeagueUpdates: true,

  // In-app - always enabled
  inAppAll: true,

  // Digest - disabled by default
  digestEnabled: false,
  digestFrequency: 'weekly',

  // Quiet hours - disabled by default
  quietHoursEnabled: false,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8, // 8 AM
}

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (!prefs) {
    // Create default preferences
    return setNotificationPreferences(userId, defaultPreferences)
  }

  return {
    emailTeamInvites: prefs.emailTeamInvites ?? defaultPreferences.emailTeamInvites,
    emailMatchRequests: prefs.emailMatchRequests ?? defaultPreferences.emailMatchRequests,
    emailMatchReminders: prefs.emailMatchReminders ?? defaultPreferences.emailMatchReminders,
    emailLeagueUpdates: prefs.emailLeagueUpdates ?? defaultPreferences.emailLeagueUpdates,
    emailTournamentUpdates: prefs.emailTournamentUpdates ?? defaultPreferences.emailTournamentUpdates,
    emailPaymentNotifications: prefs.emailPaymentNotifications ?? defaultPreferences.emailPaymentNotifications,
    emailMarketing: prefs.emailMarketing ?? defaultPreferences.emailMarketing,
    pushTeamInvites: prefs.pushTeamInvites ?? defaultPreferences.pushTeamInvites,
    pushMatchRequests: prefs.pushMatchRequests ?? defaultPreferences.pushMatchRequests,
    pushMatchReminders: prefs.pushMatchReminders ?? defaultPreferences.pushMatchReminders,
    pushLiveScores: prefs.pushLiveScores ?? defaultPreferences.pushLiveScores,
    pushLeagueUpdates: prefs.pushLeagueUpdates ?? defaultPreferences.pushLeagueUpdates,
    inAppAll: prefs.inAppAll ?? defaultPreferences.inAppAll,
    digestEnabled: prefs.digestEnabled ?? defaultPreferences.digestEnabled,
    digestFrequency: (prefs.digestFrequency as any) ?? defaultPreferences.digestFrequency,
    quietHoursEnabled: prefs.quietHoursEnabled ?? defaultPreferences.quietHoursEnabled,
    quietHoursStart: prefs.quietHoursStart ?? defaultPreferences.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd ?? defaultPreferences.quietHoursEnd,
  }
}

/**
 * Update user's notification preferences
 */
export async function setNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...preferences,
    },
    update: preferences,
  })

  return {
    emailTeamInvites: prefs.emailTeamInvites ?? defaultPreferences.emailTeamInvites,
    emailMatchRequests: prefs.emailMatchRequests ?? defaultPreferences.emailMatchRequests,
    emailMatchReminders: prefs.emailMatchReminders ?? defaultPreferences.emailMatchReminders,
    emailLeagueUpdates: prefs.emailLeagueUpdates ?? defaultPreferences.emailLeagueUpdates,
    emailTournamentUpdates: prefs.emailTournamentUpdates ?? defaultPreferences.emailTournamentUpdates,
    emailPaymentNotifications: prefs.emailPaymentNotifications ?? defaultPreferences.emailPaymentNotifications,
    emailMarketing: prefs.emailMarketing ?? defaultPreferences.emailMarketing,
    pushTeamInvites: prefs.pushTeamInvites ?? defaultPreferences.pushTeamInvites,
    pushMatchRequests: prefs.pushMatchRequests ?? defaultPreferences.pushMatchRequests,
    pushMatchReminders: prefs.pushMatchReminders ?? defaultPreferences.pushMatchReminders,
    pushLiveScores: prefs.pushLiveScores ?? defaultPreferences.pushLiveScores,
    pushLeagueUpdates: prefs.pushLeagueUpdates ?? defaultPreferences.pushLeagueUpdates,
    inAppAll: prefs.inAppAll ?? defaultPreferences.inAppAll,
    digestEnabled: prefs.digestEnabled ?? defaultPreferences.digestEnabled,
    digestFrequency: (prefs.digestFrequency as any) ?? defaultPreferences.digestFrequency,
    quietHoursEnabled: prefs.quietHoursEnabled ?? defaultPreferences.quietHoursEnabled,
    quietHoursStart: prefs.quietHoursStart ?? defaultPreferences.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd ?? defaultPreferences.quietHoursEnd,
  }
}

/**
 * Check if user wants to receive a specific notification type via email
 */
export async function shouldSendEmailNotification(
  userId: string,
  type: 'team_invite' | 'match_request' | 'match_reminder' | 'league_update' | 'tournament_update' | 'payment'
): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId)

  switch (type) {
    case 'team_invite':
      return prefs.emailTeamInvites
    case 'match_request':
      return prefs.emailMatchRequests
    case 'match_reminder':
      return prefs.emailMatchReminders
    case 'league_update':
      return prefs.emailLeagueUpdates
    case 'tournament_update':
      return prefs.emailTournamentUpdates
    case 'payment':
      return prefs.emailPaymentNotifications
    default:
      return false
  }
}

/**
 * Check if user wants to receive a specific notification via push
 */
export async function shouldSendPushNotification(
  userId: string,
  type: 'team_invite' | 'match_request' | 'match_reminder' | 'live_score' | 'league_update'
): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId)

  // Check if in-app notifications are enabled
  if (!prefs.inAppAll) {
    return false
  }

  switch (type) {
    case 'team_invite':
      return prefs.pushTeamInvites
    case 'match_request':
      return prefs.pushMatchRequests
    case 'match_reminder':
      return prefs.pushMatchReminders
    case 'live_score':
      return prefs.pushLiveScores
    case 'league_update':
      return prefs.pushLeagueUpdates
    default:
      return false
  }
}

/**
 * Check if current time is within user's quiet hours
 */
export async function isWithinQuietHours(userId: string): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId)

  if (!prefs.quietHoursEnabled) {
    return false
  }

  const currentHour = new Date().getHours()
  const { quietHoursStart, quietHoursEnd } = prefs

  // Handle quiet hours that span midnight (e.g., 22:00 - 08:00)
  if (quietHoursStart > quietHoursEnd) {
    // Quiet hours span midnight
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd
  } else {
    // Quiet hours within same day
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd
  }
}

/**
 * Get users who should receive a specific notification type
 */
export async function getUsersForNotification(
  type: 'email' | 'push',
  notificationType: string
): Promise<string[]> {
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      inAppAll: true,
    },
    select: {
      userId: true,
      emailTeamInvites: true,
      emailMatchRequests: true,
      emailMatchReminders: true,
      pushTeamInvites: true,
      pushMatchRequests: true,
      pushMatchReminders: true,
    },
  })

  return prefs
    .filter((p) => {
      if (type === 'email') {
        switch (notificationType) {
          case 'team_invite':
            return p.emailTeamInvites
          case 'match_request':
            return p.emailMatchRequests
          case 'match_reminder':
            return p.emailMatchReminders
          default:
            return false
        }
      } else {
        switch (notificationType) {
          case 'team_invite':
            return p.pushTeamInvites
          case 'match_request':
            return p.pushMatchRequests
          case 'match_reminder':
            return p.pushMatchReminders
          default:
            return false
        }
      }
    })
    .map((p) => p.userId)
}

/**
 * Reset preferences to defaults
 */
export async function resetNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  // Delete existing preferences (will recreate with defaults on next get)
  await prisma.notificationPreference.delete({
    where: { userId },
  }).catch(() => {}) // Ignore if doesn't exist

  return defaultPreferences
}

export default {
  getNotificationPreferences,
  setNotificationPreferences,
  shouldSendEmailNotification,
  shouldSendPushNotification,
  isWithinQuietHours,
  getUsersForNotification,
  resetNotificationPreferences,
  defaultPreferences,
}
