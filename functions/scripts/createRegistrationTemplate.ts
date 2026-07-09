#!/usr/bin/env npx ts-node
/**
 * One-time setup — creates ask_registration_complete in Twilio Content API.
 *
 *   npx ts-node scripts/createRegistrationTemplate.ts
 *
 * Copy the printed SID into functions/.env.yaml:
 *   TWILIO_CONTENT_SID_REGISTRATION_COMPLETE=HX...
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';

loadLocalEnv();

import { resolveTwilioClientCredentials } from '../src/services/twilioCredentials';
import { registrationCompleteContentTemplate } from '../src/templates/registrationCompleteTemplate';

const CONTENT_API_URL = 'https://content.twilio.com/v1/Content';

async function main() {
  const { accountSid, username, password } = resolveTwilioClientCredentials();
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  console.log('Creating ask_registration_complete…');
  console.log(`Account SID: ${accountSid.slice(0, 6)}…`);

  const response = await fetch(CONTENT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registrationCompleteContentTemplate),
  });

  const data = await response.json() as { sid?: string; message?: string };

  if (!response.ok) {
    console.error(`Twilio API error ${response.status}:`, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`\nCreated: ${data.sid}`);
  console.log('\nAdd to functions/.env.yaml:');
  console.log(`TWILIO_CONTENT_SID_REGISTRATION_COMPLETE: "${data.sid}"`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
