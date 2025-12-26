import { mailer } from './mailer';

interface InviteEmailParams {
  to: string;
  companyName: string;
  role: string;
  inviteToken: string;
}

export async function sendInvitationEmail({
  to,
  companyName,
  role,
  inviteToken,
}: InviteEmailParams) {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

  const subject = `You're invited to join ${companyName} on SmartCRM`;

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>You're invited to ${companyName}</h2>
      <p>You have been invited to join <strong>${companyName}</strong> as <strong>${role}</strong>.</p>
      <p>Click the button below to accept the invitation:</p>
      <p>
        <a href="${inviteLink}" style="
          background:#4f46e5;
          color:white;
          padding:10px 16px;
          border-radius:6px;
          text-decoration:none;
          display:inline-block;
        ">
          Accept Invitation
        </a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <hr />
      <p style="font-size:12px;color:#666;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  await mailer.sendMail({
    from: `"SmartCRM" <${process.env.EMAIL_ADDRESS}>`,
    to,
    subject,
    html,
  });
}