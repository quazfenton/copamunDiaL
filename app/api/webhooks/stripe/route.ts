/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for:
 * - Payment intent succeeded
 * - Payment intent failed
 * - Checkout session completed
 * - Refunds
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { sendPaymentConfirmationEmail } from '@/lib/email';
import { createAuditLog, AuditEventType } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      /**
       * Payment Intent Succeeded
       */
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('PaymentIntent succeeded:', paymentIntent.id);

        // Update tournament registration
        if (paymentIntent.metadata.tournamentId && paymentIntent.metadata.teamId) {
          await prisma.tournamentTeam.updateMany({
            where: {
              tournamentId: paymentIntent.metadata.tournamentId,
              teamId: paymentIntent.metadata.teamId,
            },
            data: {
              status: 'CONFIRMED',
            },
          });

          // Create audit log
          await createAuditLog(AuditEventType.PAYMENT_SUCCEEDED, {
            userId: paymentIntent.metadata.userId,
            resourceId: paymentIntent.id,
            metadata: {
              amount: paymentIntent.amount,
              tournamentId: paymentIntent.metadata.tournamentId,
              teamId: paymentIntent.metadata.teamId,
            },
          });
        }

        // Update league registration
        if (paymentIntent.metadata.leagueId && paymentIntent.metadata.teamId) {
          await prisma.leagueTeam.updateMany({
            where: {
              leagueId: paymentIntent.metadata.leagueId,
              teamId: paymentIntent.metadata.teamId,
            },
            data: {
              status: 'CONFIRMED',
            },
          });
        }

        break;
      }

      /**
       * Payment Intent Failed
       */
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log('PaymentIntent failed:', paymentIntent.id);

        // Notify user of failed payment
        if (paymentIntent.metadata.userId) {
          await prisma.notification.create({
            data: {
              userId: paymentIntent.metadata.userId,
              type: 'SYSTEM',
              title: 'Payment Failed',
              message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} failed. Please try again.`,
              data: {
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
              },
            },
          });

          // Create audit log
          await createAuditLog(AuditEventType.PAYMENT_FAILED, {
            userId: paymentIntent.metadata.userId,
            resourceId: paymentIntent.id,
            metadata: {
              amount: paymentIntent.amount,
              failureReason: paymentIntent.last_payment_error?.message,
            },
          });
        }

        break;
      }

      /**
       * Checkout Session Completed
       */
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('Checkout session completed:', session.id);

        // Handle tournament registration
        if (session.metadata?.type === 'tournament_registration') {
          const team = await prisma.team.findUnique({
            where: { id: session.metadata.teamId },
          });

          if (team) {
            // Create tournament team registration
            await prisma.tournamentTeam.create({
              data: {
                tournamentId: session.metadata.tournamentId,
                teamId: session.metadata.teamId,
                status: 'CONFIRMED',
              },
            });

            // Send confirmation email
            if (session.customer_details?.email) {
              await sendPaymentConfirmationEmail(
                session.customer_details.email,
                session.metadata.tournamentName || 'Tournament',
                (session.amount_total || 0) / 100,
                session.currency || 'usd',
                team.name,
                session.metadata.startDate || '',
                session.metadata.location || ''
              );
            }

            // Create audit log
            await createAuditLog(AuditEventType.TOURNAMENT_REGISTRATION, {
              userId: session.metadata.userId,
              resourceId: session.id,
              metadata: {
                tournamentId: session.metadata.tournamentId,
                teamId: session.metadata.teamId,
                amount: session.amount_total,
              },
            });
          }
        }

        // Handle league registration
        if (session.metadata?.type === 'league_registration') {
          const team = await prisma.team.findUnique({
            where: { id: session.metadata.teamId },
          });

          if (team) {
            await prisma.leagueTeam.create({
              data: {
                leagueId: session.metadata.leagueId,
                teamId: session.metadata.teamId,
                status: 'CONFIRMED',
              },
            });

            // Send confirmation email
            if (session.customer_details?.email) {
              await sendPaymentConfirmationEmail(
                session.customer_details.email,
                session.metadata.leagueName || 'League',
                (session.amount_total || 0) / 100,
                session.currency || 'usd',
                team.name
              );
            }
          }
        }

        break;
      }

      /**
       * Refund Processed
       */
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        
        console.log('Charge refunded:', charge.id);

        // Update payment record
        if (charge.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            charge.payment_intent as string
          );

          if (paymentIntent.metadata.tournamentId) {
            await prisma.tournamentTeam.updateMany({
              where: {
                tournamentId: paymentIntent.metadata.tournamentId,
                teamId: paymentIntent.metadata.teamId,
              },
              data: {
                status: 'REGISTERED', // Reset to registered so they can re-pay
              },
            });
          }

          // Notify user
          if (paymentIntent.metadata.userId) {
            await prisma.notification.create({
              data: {
                userId: paymentIntent.metadata.userId,
                type: 'SYSTEM',
                title: 'Refund Processed',
                message: `Your refund of $${(charge.amount_refunded / 100).toFixed(2)} has been processed.`,
                data: {
                  chargeId: charge.id,
                  amount: charge.amount_refunded,
                },
              },
            });
          }
        }

        break;
      }

      /**
       * Dispute Created
       */
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;

        console.log('Dispute created:', dispute.id);

        // Flag for manual review
        await createAuditLog(AuditEventType.PAYMENT_DISPUTE, {
          userId: dispute.metadata?.userId,
          resourceId: dispute.charge as string,
          metadata: {
            disputeId: dispute.id,
            amount: dispute.amount,
            reason: dispute.reason,
            status: dispute.status,
          },
          riskLevel: 'high',
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// GET handler for testing webhook endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
