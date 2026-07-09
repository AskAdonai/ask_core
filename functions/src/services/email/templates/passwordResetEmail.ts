export type PasswordResetEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export function buildPasswordResetEmailContent(params: {
  resetLink: string;
  loginUrl: string;
  recipientEmail: string;
}): PasswordResetEmailContent {
  const { resetLink, loginUrl, recipientEmail } = params;

  const subject = 'Reset your Ask Adonai Admin password';

  const text =
    `Hello,\n\n` +
    `We received a request to reset the password for ${recipientEmail}.\n\n` +
    `Reset your password: ${resetLink}\n\n` +
    `After you set a new password, you can sign in at ${loginUrl}.\n\n` +
    `If you did not request this, you can ignore this email.\n\n` +
    `— Ask Adonai Admin`;

  const html =
    `<p>Hello,</p>` +
    `<p>We received a request to reset the password for <strong>${escapeHtml(recipientEmail)}</strong>.</p>` +
    `<p style="margin: 24px 0;">` +
    `<a href="${escapeHtml(resetLink)}" ` +
    `style="display:inline-block;padding:12px 20px;background:#3d2914;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">` +
    `Reset password</a></p>` +
    `<p>Or copy this link into your browser:<br/>` +
    `<a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>` +
    `<p>After you set a new password, sign in at ` +
    `<a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a>.</p>` +
    `<p>If you did not request this, you can ignore this email.</p>` +
    `<p>— Ask Adonai Admin</p>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
