import pino from 'pino';

const logger = pino();

const RESEND_API_URL = 'https://api.resend.com/emails';

export type ResendEmailAddress = string;

export type SendResendEmailInput = {
  to: ResendEmailAddress | ResendEmailAddress[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: ResendEmailAddress;
  /** Overrides RESEND_FROM_EMAIL */
  from?: ResendEmailAddress;
};

export type SendResendEmailResult = {
  id: string;
};

export class ResendEmailError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ResendEmailError';
  }
}

export function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

export function getResendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Ask Adonai Admin <noreply@askadonai.com>'
  );
}

export function isResendConfigured(): boolean {
  return Boolean(getResendApiKey());
}

/**
 * Sends a transactional email via Resend.
 * Reusable for any future dashboard / staff notifications.
 */
export async function sendResendEmail(
  input: SendResendEmailInput,
): Promise<SendResendEmailResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new ResendEmailError('Resend is not configured', 503);
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const from = input.from || getResendFromAddress();

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    logger.error(
      { status: response.status, body, to: recipients },
      'Resend API rejected email',
    );
    throw new ResendEmailError(
      'Failed to send email',
      response.status,
      body,
    );
  }

  const id = typeof body?.id === 'string' ? body.id : 'unknown';
  logger.info({ id, to: recipients, subject: input.subject }, 'Resend email sent');
  return { id };
}
