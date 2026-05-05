/**
 * Audit Logging System
 * 
 * Tracks security-relevant events and user actions
 */

import { prisma } from './db'

export enum AuditEventType {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // 2FA
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  BACKUP_CODE_USED = 'BACKUP_CODE_USED',

  // Authorization
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',

  // Data Access
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_CREATED = 'DATA_CREATED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',

  // Security
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',

  // System
  API_ERROR = 'API_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',

  // Resource Management (NEW)
  TEAM_CREATED = 'TEAM_CREATED',
  TEAM_UPDATED = 'TEAM_UPDATED',
  TEAM_DELETED = 'TEAM_DELETED',
  PLAYER_PROFILE_UPDATED = 'PLAYER_PROFILE_UPDATED',
  NOTIFICATION_CREATED = 'NOTIFICATION_CREATED',
  TOURNAMENT_CREATED = 'TOURNAMENT_CREATED',
  TOURNAMENT_UPDATED = 'TOURNAMENT_UPDATED',
  TOURNAMENT_REGISTRATION = 'TOURNAMENT_REGISTRATION',

  // Payment Events (NEW)
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
}

export interface AuditEventData {
  // User information
  userId?: string
  userEmail?: string
  
  // Action details
  action?: string
  resource?: string
  resourceId?: string
  
  // Request information
  ipAddress?: string
  userAgent?: string
  path?: string
  method?: string
  
  // Additional context
  metadata?: Record<string, any>
  
  // Outcome
  success?: boolean
  errorMessage?: string
  
  // Risk assessment
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  eventType: AuditEventType,
  data: AuditEventData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eventType,
        userId: data.userId,
        userEmail: data.userEmail,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        path: data.path,
        method: data.method,
        metadata: data.metadata,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
        riskLevel: data.riskLevel ?? 'low',
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging failure shouldn't break the main flow
  }
}

/**
 * Log successful login
 */
export async function logLogin(
  userId: string,
  userEmail: string,
  ipAddress: string,
  userAgent: string,
  method: 'credentials' | 'google' | '2fa' = 'credentials'
): Promise<void> {
  await createAuditLog(AuditEventType.LOGIN_SUCCESS, {
    userId,
    userEmail,
    action: `User logged in via ${method}`,
    ipAddress,
    userAgent,
    metadata: { method },
    riskLevel: 'low',
  })
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ipAddress: string,
  userAgent: string,
  reason: string,
  method: 'credentials' | 'google' | '2fa' = 'credentials'
): Promise<void> {
  await createAuditLog(AuditEventType.LOGIN_FAILED, {
    userEmail: email,
    action: `Failed login attempt: ${reason}`,
    ipAddress,
    userAgent,
    metadata: { method, reason },
    success: false,
    errorMessage: reason,
    riskLevel: 'medium',
  })
}

/**
 * Log password change
 */
export async function logPasswordChange(
  userId: string,
  userEmail: string,
  ipAddress: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await createAuditLog(
    success ? AuditEventType.PASSWORD_CHANGED : AuditEventType.SYSTEM_ERROR,
    {
      userId,
      userEmail,
      action: 'Password change attempted',
      ipAddress,
      userAgent: undefined,
      success,
      errorMessage,
      riskLevel: success ? 'low' : 'medium',
    }
  )
}

/**
 * Log 2FA action
 */
export async function log2FAAction(
  userId: string,
  userEmail: string,
  action: 'enabled' | 'disabled' | 'verified' | 'failed',
  ipAddress: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const eventType =
    action === 'enabled'
      ? AuditEventType.TWO_FACTOR_ENABLED
      : action === 'disabled'
      ? AuditEventType.TWO_FACTOR_DISABLED
      : action === 'verified'
      ? AuditEventType.TWO_FACTOR_VERIFIED
      : AuditEventType.TWO_FACTOR_FAILED

  await createAuditLog(eventType, {
    userId,
    userEmail,
    action: `2FA ${action}`,
    ipAddress,
    success,
    errorMessage,
    riskLevel: action === 'failed' ? 'medium' : 'low',
  })
}

/**
 * Log permission denied
 */
export async function logPermissionDenied(
  userId: string | undefined,
  userEmail: string | undefined,
  resource: string,
  action: string,
  ipAddress: string
): Promise<void> {
  await createAuditLog(AuditEventType.PERMISSION_DENIED, {
    userId,
    userEmail,
    action,
    resource,
    ipAddress,
    success: false,
    errorMessage: 'Access denied',
    riskLevel: 'medium',
  })
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  description: string,
  userId: string | undefined,
  ipAddress: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog(AuditEventType.SUSPICIOUS_ACTIVITY, {
    userId,
    action: description,
    ipAddress,
    metadata,
    success: false,
    riskLevel: 'high',
  })
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  ipAddress: string,
  path: string,
  userId?: string
): Promise<void> {
  await createAuditLog(AuditEventType.RATE_LIMIT_EXCEEDED, {
    userId,
    action: 'Rate limit exceeded',
    path,
    ipAddress,
    success: false,
    riskLevel: 'medium',
  })
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
}

/**
 * Get recent security events
 */
export async function getRecentSecurityEvents(
  limit: number = 100
): Promise<any[]> {
  try {
    return await prisma.auditLog.findMany({
      where: {
        eventType: {
          in: [
            AuditEventType.LOGIN_FAILED,
            AuditEventType.TWO_FACTOR_FAILED,
            AuditEventType.PERMISSION_DENIED,
            AuditEventType.SUSPICIOUS_ACTIVITY,
            AuditEventType.RATE_LIMIT_EXCEEDED,
          ],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  } catch (error) {
    console.error('Failed to fetch security events:', error)
    return []
  }
}

/**
 * Get failed login count for an IP in the last hour
 */
export async function getFailedLoginCount(
  ipAddress: string,
  windowMinutes: number = 60
): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - windowMinutes * 60 * 1000)

    return await prisma.auditLog.count({
      where: {
        ipAddress,
        eventType: AuditEventType.LOGIN_FAILED,
        timestamp: {
          gte: oneHourAgo,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch failed login count:', error)
    return 0
  }
}

/**
 * Clean up old audit logs
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        // Don't delete high-risk events
        riskLevel: {
          notIn: ['high', 'critical'],
        },
      },
    })

    console.log(`Cleaned up ${result.count} old audit logs`)
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error)
  }
}

export default {
  createAuditLog,
  logLogin,
  logFailedLogin,
  logPasswordChange,
  log2FAAction,
  logPermissionDenied,
  logSuspiciousActivity,
  logRateLimitExceeded,
  getUserAuditLogs,
  getRecentSecurityEvents,
  getFailedLoginCount,
  cleanupOldAuditLogs,
  AuditEventType,
}
