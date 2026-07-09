/**
 * One-time setup — creates ask_morning_devotion_card in Twilio Content API.
 *
 * Usage:
 *   cd functions
 *   npx ts-node scripts/createMorningDevotionCardTemplate.ts
 *
 * After creation, submit the generated HX SID for WhatsApp approval (if required),
 * then set:
 *   TWILIO_CONTENT_SID_MORNING_DEVOTION_CARD=HX...
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { resolveTwilioClientCredentials } from '../src/services/twilioCredentials';
import { morningDevotionContentTemplate, morningDevotionSampleVariables } from '../src/templates/morningDevotionTemplate';

loadLocalEnv();

async function main() {
  const { accountSid, username, password } = resolveTwilioClientCredentials();
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...morningDevotionContentTemplate,
      variables: {
        // {{1}} devotion text
        '1': (morningDevotionSampleVariables['1'] || '').slice(0, 300),
        // {{2}} media path suffix after domain
        '2': morningDevotionSampleVariables['2'] || 'uploads/devotion/stage1/day1/image.png',
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Twilio Content API error (${res.status}): ${JSON.stringify(data)}`);
  }

  console.log('Created content template:', {
    accountSid,
    sid: data.sid,
    friendly_name: data.friendly_name,
    approval_create: data?.links?.approval_create,
  });
  console.log(`TWILIO_CONTENT_SID_MORNING_DEVOTION_CARD: "${data.sid}"`);
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});

