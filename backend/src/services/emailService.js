const { Resend } = require('resend');
const { env } = require('../config/env');

const client = env.resend.enabled ? new Resend(env.resend.apiKey) : null;

// Every email in the app goes through this one function so that:
//  - a missing RESEND_API_KEY degrades to a logged no-op instead of crashing
//    checkout/reservation flows (per the "no fake functionality" rule, the
//    caller still gets an honest { sent: false, reason } back)
//  - templates stay in one place (see ./emailTemplates.js)
async function sendEmail({ to, subject, html }) {
  if (!client) {
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY not configured — skipping email "${subject}" to ${to}`);
    return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: env.resend.fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[email] Resend error:', error);
      return { sent: false, reason: 'SEND_FAILED', error };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Unexpected error sending email:', err.message);
    return { sent: false, reason: 'SEND_FAILED' };
  }
}

module.exports = { sendEmail, emailEnabled: env.resend.enabled };
