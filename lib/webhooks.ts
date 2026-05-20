/**
 * Webhook System
 * 
 * Allows external services to subscribe to events and receive notifications
 */

import { prisma } from './db'
import { z } from 'zod'
import crypto from 'crypto'

export enum WebhookEventType {
  MATCH_CREATED = 'MATCH_CREATED',
  MATCH_STARTED = 'MATCH_STARTED',
  MATCH_COMPLETED = 'MATCH_COMPLETED',
  GOAL_SCORED = 'GOAL_SCORED',
  TEAM_CREATED = 'TEAM_CREATED',
  TEAM_UPDATED = 'TEAM_UPDATED',
  TOURNAMENT_CREATED = 'TOURNAMENT_CREATED',
  TOURNAMENT_COMPLETED = 'TOURNAMENT_COMPLETED',
  USER_REGISTERED = 'USER_REGISTERED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
}

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  createdAt: Date
  data: Record<string, any>
}

export interface WebhookSubscription {
  id: string
  url: string
  events: WebhookEventType[]
  secret: string
  active: boolean
  createdAt: Date
}

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEventType)),
  secret: z.string().min(16).optional(),
})

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number = Date.now()
): string {
  const signedPayload = `${timestamp}.${payload}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(signedPayload)
  const signature = hmac.digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300000 // 5 minutes
): boolean {
  try {
    const timestamp = parseInt(signature.match(/t=(\d+)/)?.[1] || '0', 10)
    const receivedSignature = signature.match(/v1=([a-f0-9]+)/)?.[1]

    if (!timestamp || !receivedSignature) {
      return false
    }

    // Check timestamp tolerance
    const now = Date.now()
    if (Math.abs(now - timestamp) > tolerance) {
      return false
    }

    // Generate expected signature
    const expectedSignature = generateWebhookSignature(payload, secret, timestamp)
    const expectedSig = expectedSignature.match(/v1=([a-f0-9]+)/)?.[1]

    return receivedSignature === expectedSig
  } catch {
    return false
  }
}

/**
 * Create webhook subscription
 */
export async function createWebhook(
  userId: string,
  data: z.infer<typeof createWebhookSchema>
): Promise<{ success: boolean; webhook?: WebhookSubscription; error?: string }> {
  try {
    // Generate secret if not provided
    const secret = data.secret || crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.webhookSubscription.create({
      data: {
        userId,
        url: data.url,
        events: data.events,
        secret,
        active: true,
      },
    })

    return {
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events as WebhookEventType[],
        secret,
        active: webhook.active,
        createdAt: webhook.createdAt,
      },
    }
  } catch (error) {
    console.error('Create webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create webhook',
    }
  }
}

/**
 * Get webhooks for a user
 */
export async function getUserWebhooks(userId: string): Promise<WebhookSubscription[]> {
  const webhooks = await prisma.webhookSubscription.findMany({
    where: { userId, active: true },
    select: {
      id: true,
      url: true,
      events: true,
      secret: true,
      active: true,
      createdAt: true,
    },
  })

  return webhooks.map((w) => ({
    ...w,
    events: w.events as WebhookEventType[],
  }))
}

/**
 * Delete webhook subscription
 */
export async function deleteWebhook(
  userId: string,
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const webhook = await prisma.webhookSubscription.findFirst({
      where: { id: webhookId, userId },
    })

    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    await prisma.webhookSubscription.delete({
      where: { id: webhookId },
    })

    return { success: true }
  } catch (error) {
    console.error('Delete webhook error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete webhook',
    }
  }
}

/**
 * Send webhook event to all subscribed endpoints
 */
export async function sendWebhookEvent(
  eventType: WebhookEventType,
  data: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  try {
    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.webhookSubscription.findMany({
      where: {
        active: true,
        events: { has: eventType },
      },
    })

    let sent = 0
    let failed = 0

    const payload = JSON.stringify({
      id: crypto.randomUUID(),
      type: eventType,
      createdAt: new Date().toISOString(),
      data,
    })

    // Send to each webhook
    for (const webhook of webhooks) {
      try {
        const signature = generateWebhookSignature(payload, webhook.secret)

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
            'User-Agent': 'CopaMundial-Webhook/1.0',
          },
          body: payload,
        })

        if (response.ok) {
          sent++
          // Log successful delivery
          await prisma.webhookDelivery.create({
            data: {
              webhookId: webhook.id,
              eventType,
              status: 'DELIVERED',
              responseStatus: response.status,
              payload,
            },
          })
        } else {
          failed++
          // Log failed delivery
          await prisma.webhookDelivery.create({
            data: {
              webhookId: webhook.id,
              eventType,
              status: 'FAILED',
              responseStatus: response.status,
              payload,
              errorMessage: await response.text(),
            },
          })
        }
      } catch (error) {
        failed++
        // Log error
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            eventType,
            status: 'ERROR',
            payload,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    }

    return { sent, failed }
  } catch (error) {
    console.error('Send webhook event error:', error)
    return { sent: 0, failed: 0 }
  }
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<any[]> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return deliveries
}

/**
 * Retry failed webhook delivery
 */
export async function retryWebhookDelivery(
  deliveryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: true,
      },
    })

    if (!delivery) {
      return { success: false, error: 'Delivery not found' }
    }

    if (delivery.status === 'DELIVERED') {
      return { success: false, error: 'Cannot retry successful delivery' }
    }

    const signature = generateWebhookSignature(
      delivery.payload,
      delivery.webhook.secret
    )

    const response = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'User-Agent': 'CopaMundial-Webhook/1.0',
      },
      body: delivery.payload,
    })

    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          responseStatus: response.status,
          attempts: { increment: 1 },
        },
      })
      return { success: true }
    } else {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          responseStatus: response.status,
          attempts: { increment: 1 },
        },
      })
      return { success: false, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Retry failed',
    }
  }
}

/**
 * Cleanup old webhook deliveries
 */
export async function cleanupOldDeliveries(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    const result = await prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: 'DELIVERED',
      },
    })

    return result.count
  } catch (error) {
    console.error('Cleanup deliveries error:', error)
    return 0
  }
}

export default {
  createWebhook,
  getUserWebhooks,
  deleteWebhook,
  sendWebhookEvent,
  getWebhookDeliveries,
  retryWebhookDelivery,
  cleanupOldDeliveries,
  generateWebhookSignature,
  verifyWebhookSignature,
  WebhookEventType,
}
