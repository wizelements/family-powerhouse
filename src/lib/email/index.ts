'use server';

type EmailTemplate = 'invite' | 'password-reset' | 'contribution-confirm' | 'withdrawal-approved' | 'withdrawal-rejected' | 'budget-alert' | 'task-assigned' | 'mention';

interface EmailPayload {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'Family Powerhouse <noreply@familypowerhouse.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getEmailProvider(): 'resend' | 'sendgrid' | 'console' {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  return 'console';
}

async function sendWithResend(email: EmailPayload, html: string): Promise<SendEmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Email:Resend] Failed to send:', error);
    return { success: false, error: `Resend API error: ${response.status}` };
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

async function sendWithSendGrid(email: EmailPayload, html: string): Promise<SendEmailResult> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: email.to }] }],
      from: { email: EMAIL_FROM.match(/<(.+)>/)?.[1] || EMAIL_FROM, name: 'Family Powerhouse' },
      subject: email.subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Email:SendGrid] Failed to send:', error);
    return { success: false, error: `SendGrid API error: ${response.status}` };
  }

  return { success: true, messageId: response.headers.get('x-message-id') || undefined };
}

function renderTemplate(template: EmailTemplate, data: Record<string, unknown>): string {
  const templates: Record<EmailTemplate, (data: Record<string, unknown>) => string> = {
    'invite': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Family Invitation</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; margin: 0 0 20px;">You're Invited! 🎉</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You've been invited to join <strong>${d.familyName}</strong> on Family Powerhouse.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            You've been assigned the role of <strong>${d.role}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${APP_URL}/invite/${d.token}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
    'password-reset': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Reset Your Password</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; margin: 0 0 20px;">Reset Your Password 🔐</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="margin: 30px 0;">
            <a href="${APP_URL}/reset-password/${d.token}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
    'contribution-confirm': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Contribution Confirmed</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #10b981; margin: 0 0 20px;">Contribution Confirmed ✅</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your contribution of <strong>$${d.amount}</strong> to <strong>${d.poolName}</strong> has been confirmed.
          </p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              Pool Progress: <strong>$${d.currentAmount}</strong> of <strong>$${d.targetAmount}</strong> (${d.progressPercent}%)
            </p>
          </div>
          <a href="${APP_URL}/dashboard/pools/${d.poolId}" style="color: #6366f1; font-size: 14px;">View Pool Details →</a>
        </div>
      </body>
      </html>
    `,
    'withdrawal-approved': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Withdrawal Approved</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #10b981; margin: 0 0 20px;">Withdrawal Approved ✅</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your withdrawal request for <strong>$${d.amount}</strong> from <strong>${d.poolName}</strong> has been approved.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Reason: ${d.reason}
          </p>
          <a href="${APP_URL}/dashboard/pools/${d.poolId}" style="color: #6366f1; font-size: 14px;">View Details →</a>
        </div>
      </body>
      </html>
    `,
    'withdrawal-rejected': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Withdrawal Rejected</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #ef4444; margin: 0 0 20px;">Withdrawal Request Declined</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your withdrawal request for <strong>$${d.amount}</strong> from <strong>${d.poolName}</strong> was not approved.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            ${d.comment ? `Reason: ${d.comment}` : 'No reason provided.'}
          </p>
          <a href="${APP_URL}/dashboard/pools/${d.poolId}" style="color: #6366f1; font-size: 14px;">View Details →</a>
        </div>
      </body>
      </html>
    `,
    'budget-alert': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Budget Alert</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #f59e0b; margin: 0 0 20px;">⚠️ Budget Alert</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You've reached <strong>${d.percentUsed}%</strong> of your <strong>${d.categoryName}</strong> budget.
          </p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              Spent: <strong>$${d.spent}</strong> of <strong>$${d.limit}</strong>
            </p>
          </div>
          <a href="${APP_URL}/dashboard/budgets/${d.budgetId}" style="color: #6366f1; font-size: 14px;">View Budget →</a>
        </div>
      </body>
      </html>
    `,
    'task-assigned': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Task Assigned</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; margin: 0 0 20px;">New Task Assigned 📋</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${d.assignerName}</strong> assigned you a task: <strong>${d.taskTitle}</strong>
          </p>
          ${d.dueDate ? `<p style="color: #6b7280; font-size: 14px;">Due: ${d.dueDate}</p>` : ''}
          <a href="${APP_URL}/dashboard/tasks/${d.taskId}" style="color: #6366f1; font-size: 14px;">View Task →</a>
        </div>
      </body>
      </html>
    `,
    'mention': (d) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>You Were Mentioned</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #6366f1; margin: 0 0 20px;">You Were Mentioned 💬</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${d.mentionerName}</strong> mentioned you in <strong>#${d.channelName}</strong>:
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <p style="color: #374151; margin: 0; font-size: 14px;">${d.messagePreview}</p>
          </div>
          <a href="${APP_URL}/dashboard/chat/${d.channelId}" style="color: #6366f1; font-size: 14px;">View Message →</a>
        </div>
      </body>
      </html>
    `,
  };

  return templates[template](data);
}

export async function sendEmail(email: EmailPayload): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  const html = renderTemplate(email.template, email.data);

  if (provider === 'console') {
    console.log('[Email:Console] Would send email:', {
      to: email.to,
      subject: email.subject,
      template: email.template,
    });
    console.log('[Email:Console] HTML preview:\n', html.slice(0, 500) + '...');
    return { success: true, messageId: `console-${Date.now()}` };
  }

  try {
    if (provider === 'resend') {
      return await sendWithResend(email, html);
    } else {
      return await sendWithSendGrid(email, html);
    }
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

export async function sendInviteEmail(
  to: string,
  familyName: string,
  role: string,
  token: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `You're invited to join ${familyName} on Family Powerhouse`,
    template: 'invite',
    data: { familyName, role, token },
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'Reset your Family Powerhouse password',
    template: 'password-reset',
    data: { token },
  });
}

export async function sendContributionConfirmEmail(
  to: string,
  poolName: string,
  poolId: string,
  amount: number,
  currentAmount: number,
  targetAmount: number
): Promise<SendEmailResult> {
  const progressPercent = Math.round((currentAmount / targetAmount) * 100);
  return sendEmail({
    to,
    subject: `Contribution to ${poolName} confirmed`,
    template: 'contribution-confirm',
    data: { poolName, poolId, amount, currentAmount, targetAmount, progressPercent },
  });
}

export async function sendWithdrawalApprovedEmail(
  to: string,
  poolName: string,
  poolId: string,
  amount: number,
  reason: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Withdrawal from ${poolName} approved`,
    template: 'withdrawal-approved',
    data: { poolName, poolId, amount, reason },
  });
}

export async function sendWithdrawalRejectedEmail(
  to: string,
  poolName: string,
  poolId: string,
  amount: number,
  comment?: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Withdrawal from ${poolName} not approved`,
    template: 'withdrawal-rejected',
    data: { poolName, poolId, amount, comment },
  });
}

export async function sendBudgetAlertEmail(
  to: string,
  budgetId: string,
  categoryName: string,
  spent: number,
  limit: number,
  percentUsed: number
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `Budget Alert: ${categoryName} at ${percentUsed}%`,
    template: 'budget-alert',
    data: { budgetId, categoryName, spent, limit, percentUsed },
  });
}

export async function sendTaskAssignedEmail(
  to: string,
  taskId: string,
  taskTitle: string,
  assignerName: string,
  dueDate?: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `New task assigned: ${taskTitle}`,
    template: 'task-assigned',
    data: { taskId, taskTitle, assignerName, dueDate },
  });
}

export async function sendMentionEmail(
  to: string,
  channelId: string,
  channelName: string,
  mentionerName: string,
  messagePreview: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `${mentionerName} mentioned you in #${channelName}`,
    template: 'mention',
    data: { channelId, channelName, mentionerName, messagePreview },
  });
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
}
