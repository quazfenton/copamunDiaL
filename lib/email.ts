/**
 * SendGrid Email Integration
 * 
 * Handles transactional emails for notifications, invitations, etc.
 */

import sgMail from '@sendgrid/mail'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL

if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not configured. Email features will be disabled.')
} else {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

/**
 * Send a transactional email
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  templateId,
  dynamicTemplateData,
  from,
  replyTo,
  cc,
  bcc,
  attachments,
}: {
  to: string | string[]
  subject?: string
  html?: string
  text?: string
  templateId?: string
  dynamicTemplateData?: Record<string, any>
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    content: string
    filename: string
    type: string
    disposition?: string
  }>
}): Promise<{ success: boolean; messageId?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn('Email not sent: SendGrid not configured')
    return { success: false }
  }

  try {
    const msg: any = {
      to: Array.isArray(to) ? to : [to],
      from: from || SENDGRID_FROM_EMAIL || 'noreply@playmate.app',
      replyTo: replyTo || SENDGRID_FROM_EMAIL,
    }

    if (templateId) {
      msg.templateId = templateId
      if (dynamicTemplateData) {
        msg.dynamicTemplateData = dynamicTemplateData
      }
    } else {
      msg.subject = subject
      msg.html = html
      msg.text = text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
    }

    if (cc) {
      msg.cc = Array.isArray(cc) ? cc : [cc]
    }

    if (bcc) {
      msg.bcc = Array.isArray(bcc) ? bcc : [bcc]
    }

    if (attachments) {
      msg.attachments = attachments
    }

    const response = await sgMail.send(msg)
    return {
      success: true,
      messageId: response[0]?.headers?.['x-message-id'],
    }
  } catch (error) {
    console.error('SendGrid email error:', error)
    return { success: false }
  }
}

/**
 * Send team invitation email
 */
export async function sendTeamInviteEmail({
  to,
  teamName,
  inviterName,
  message,
  inviteLink,
}: {
  to: string
  teamName: string
  inviterName: string
  message?: string
  inviteLink: string
}): Promise<{ success: boolean }> {
  return sendEmail({
    to,
    subject: `You've been invited to join ${teamName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invitation</h2>
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join the team <strong>${teamName}</strong>.</p>
        ${message ? `<blockquote>${message}</blockquote>` : ''}
        <p style="margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, feel free to reach out to ${inviterName}.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          This invitation was sent via PlayMate Sports Management Platform.
        </p>
      </div>
    `,
  })
}

/**
 * Send match invitation email
 */
export async function sendMatchInviteEmail({
  to,
  teamName,
  opponentTeamName,
  proposedDate,
  location,
  message,
  responseLink,
}: {
  to: string
  teamName: string
  opponentTeamName: string
  proposedDate: string
  location: string
  message?: string
  responseLink: string
}): Promise<{ success: boolean }> {
  return sendEmail({
    to,
    subject: `Match Request: ${teamName} vs ${opponentTeamName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Match Request</h2>
        <p>Hi ${teamName} team,</p>
        <p><strong>${opponentTeamName}</strong> has challenged you to a match!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 Date:</strong> ${new Date(proposedDate).toLocaleDateString()}</p>
          <p><strong>📍 Location:</strong> ${location}</p>
          ${message ? `<p><strong>📝 Message:</strong> ${message}</p>` : ''}
        </div>
        
        <p style="margin: 30px 0;">
          <a href="${responseLink}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Accept Match
          </a>
          <a href="${responseLink.replace('accept', 'decline')}" 
             style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Decline
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Please respond within 48 hours to confirm the match.
        </p>
      </div>
    `,
  })
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail({
  to,
  amount,
  currency,
  description,
  receiptUrl,
}: {
  to: string
  amount: number
  currency: string
  description: string
  receiptUrl: string
}): Promise<{ success: boolean }> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)

  return sendEmail({
    to,
    subject: 'Payment Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✓ Payment Successful</h2>
        <p>Thank you for your payment!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${formattedAmount}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p style="margin: 30px 0;">
          <a href="${receiptUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Receipt
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If you have any questions about this payment, please contact our support team.
        </p>
      </div>
    `,
  })
}

/**
 * Send tournament registration confirmation
 */
export async function sendTournamentRegistrationEmail({
  to,
  teamName,
  tournamentName,
  startDate,
  location,
  entryFee,
}: {
  to: string
  teamName: string
  tournamentName: string
  startDate: string
  location: string
  entryFee?: number
}): Promise<{ success: boolean }> {
  return sendEmail({
    to,
    subject: `Tournament Registration: ${tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Tournament Registration Confirmed</h2>
        <p>Great news! <strong>${teamName}</strong> has been registered for:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${tournamentName}</h3>
          <p><strong>📅 Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>📍 Location:</strong> ${location}</p>
          ${entryFee ? `<p><strong>💰 Entry Fee:</strong> $${entryFee}</p>` : ''}
        </div>
        
        <p>You will receive more details about the tournament schedule and format closer to the start date.</p>
        
        <p style="color: #666; font-size: 14px;">
          Good luck in the tournament!
        </p>
      </div>
    `,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  resetLink,
  expiryHours = 24,
}: {
  to: string
  resetLink: string
  expiryHours?: number
}): Promise<{ success: boolean }> {
  return sendEmail({
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password.</p>
        
        <p style="margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          This link will expire in ${expiryHours} hours. If you didn't request this reset, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}

/**
 * Send bulk emails
 */
export async function sendBulkEmails(
  emails: Array<{
    to: string
    subject: string
    html: string
  }>
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!SENDGRID_API_KEY) {
    return { success: false, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  try {
    const promises = emails.map(async (email) => {
      try {
        await sgMail.send({
          to: email.to,
          from: SENDGRID_FROM_EMAIL || 'noreply@playmate.app',
          subject: email.subject,
          html: email.html,
        })
        sent++
      } catch {
        failed++
      }
    })

    await Promise.all(promises)

    return { success: failed === 0, sent, failed }
  } catch (error) {
    console.error('Bulk email error:', error)
    return { success: false, sent, failed }
  }
}

export default {
  sendEmail,
  sendTeamInviteEmail,
  sendMatchInviteEmail,
  sendPaymentConfirmationEmail,
  sendTournamentRegistrationEmail,
  sendPasswordResetEmail,
  sendBulkEmails,
}
