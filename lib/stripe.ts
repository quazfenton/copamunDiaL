/**
 * Stripe Payment Integration
 * 
 * Handles payment processing for tournament entry fees, league fees, etc.
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not configured. Payment features will be disabled.')
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null

/**
 * Create a payment intent
 */
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  metadata,
  description,
}: {
  amount: number // Amount in cents
  currency?: string
  customerId?: string
  metadata?: Record<string, string>
  description?: string
}): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata: metadata || {},
      description,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error('Payment intent creation error:', error)
    throw new Error('Failed to create payment intent')
  }
}

/**
 * Create a checkout session for tournaments or leagues
 */
export async function createCheckoutSession({
  amount,
  currency = 'usd',
  successUrl,
  cancelUrl,
  customerId,
  metadata,
  lineItems,
}: {
  amount?: number // Amount in cents (if not using lineItems)
  currency?: string
  successUrl: string
  cancelUrl: string
  customerId?: string
  metadata?: Record<string, string>
  lineItems?: Array<{
    price_data: {
      product_data: {
        name: string
        description?: string
        images?: string[]
      }
      unit_amount: number
      currency: string
    }
    quantity: number
  }>
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems || [
        {
          price_data: {
            product_data: {
              name: 'Tournament Entry Fee',
              description: 'Entry fee for tournament participation',
            },
            unit_amount: amount || 0,
            currency,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    })

    return session
  } catch (error) {
    console.error('Checkout session creation error:', error)
    throw new Error('Failed to create checkout session')
  }
}

/**
 * Create a customer
 */
export async function createCustomer({
  email,
  name,
  metadata,
}: {
  email: string
  name?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Customer | null> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: metadata || {},
    })

    return customer
  } catch (error) {
    console.error('Customer creation error:', error)
    throw new Error('Failed to create customer')
  }
}

/**
 * Get or create customer
 */
export async function getOrCreateCustomer(
  email: string,
  userId: string
): Promise<Stripe.Customer | null> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  try {
    // Search for existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0] as Stripe.Customer
    }

    // Create new customer
    const user = await import('@prisma/client').then((m) =>
      m.PrismaClient ? null : null
    )

    const customer = await stripe.customers.create({
      email,
      name: userId,
      metadata: {
        userId,
      },
    })

    return customer
  } catch (error) {
    console.error('Get or create customer error:', error)
    throw new Error('Failed to get or create customer')
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null
): Stripe.Event | null {
  if (!stripe || !STRIPE_WEBHOOK_SECRET || !signature) {
    return null
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
    return event
  } catch (error) {
    console.error('Webhook signature verification error:', error)
    return null
  }
}

/**
 * Process webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<{
  success: boolean
  type: string
  data?: any
}> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Handle successful payment
        console.log('Payment succeeded:', paymentIntent.id)
        // Update database, send confirmation email, etc.
        return {
          success: true,
          type: event.type,
          data: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata,
          },
        }

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', failedIntent.id)
        // Notify user, update database, etc.
        return {
          success: false,
          type: event.type,
          data: {
            paymentIntentId: failedIntent.id,
            error: failedIntent.last_payment_error?.message,
          },
        }

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout completed:', session.id)
        // Fulfill order, grant access, etc.
        return {
          success: true,
          type: event.type,
          data: {
            sessionId: session.id,
            customerId: session.customer,
            metadata: session.metadata,
          },
        }

      default:
        console.log('Unhandled webhook event type:', event.type)
        return {
          success: true,
          type: event.type,
        }
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return {
      success: false,
      type: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number // Partial refund amount in cents
): Promise<Stripe.Refund | null> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // If not provided, full refund
    })

    return refund
  } catch (error) {
    console.error('Refund error:', error)
    throw new Error('Failed to process refund')
  }
}

export default {
  stripe,
  createPaymentIntent,
  createCheckoutSession,
  createCustomer,
  getOrCreateCustomer,
  verifyWebhookSignature,
  processWebhookEvent,
  refundPayment,
}
