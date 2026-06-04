#!/usr/bin/env npx ts-node
/**
 * One-time setup script — creates the Twilio Content Templates for quiz messages.
 *
 * Uses the Twilio Content REST API directly (not the SDK) to avoid version
 * compatibility issues with client.content.v1.contents.
 *
 * Run once:
 *   npx ts-node functions/src/seed/createQuizTemplate.ts
 *   npx ts-node functions/src/seed/createQuizTemplate.ts --response-only
 *
 * On success, copy the printed Content SIDs into functions/.env as:
 *   TWILIO_CONTENT_SID_QUIZ=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_CONTENT_SID_QUIZ_RESPONSE=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * WhatsApp quick-reply button label limit: 20 characters.
 * Template variable map:
 *   {{1}} — header   e.g. "Exodus — Q2 of 4"
 *   {{2}} — question body text
 *   {{3}} — A button label (max 20 chars)
 *   {{4}} — B button label (max 20 chars)
 *   {{5}} — C button label (max 20 chars)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const responseOnly = process.argv.includes('--response-only');

if (!accountSid || !authToken || accountSid === 'your_account_sid') {
  console.error('❌  Set real TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in functions/.env first.');
  process.exit(1);
}

const CONTENT_API_URL = 'https://content.twilio.com/v1/Content';

async function main() {
  console.log('Creating Twilio Content Templates for quiz messages…');
  console.log(`Account SID: ${accountSid!.slice(0, 6)}…`);

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const quizQuestionBody = {
    friendly_name: 'ask_quiz_question',
    language: 'en',
    types: {
      'twilio/quick-reply': {
        // {{1}} = header, {{2}} = question.
        // Buttons show {{3}}, {{4}}, {{5}} as tap labels (≤20 chars each).
        // Full option text is placed inside {{2}} for context.
        body: '{{1}}\n\n{{2}}',
        actions: [
          { title: '{{3}}', id: 'option_a' },
          { title: '{{4}}', id: 'option_b' },
          { title: '{{5}}', id: 'option_c' },
        ],
      },
    },
  };

  const quizQuestion = responseOnly
    ? null
    : await createContentTemplate(credentials, quizQuestionBody);
  const quizResponse = await createContentTemplate(credentials, {
    friendly_name: 'ask_quiz_response',
    language: 'en',
    types: {
      'twilio/text': {
        body: '{{1}}',
      },
    },
  });

  console.log('\n✅  Template(s) created successfully!');
  if (quizQuestion) {
    console.log(`   Quiz Question SID : ${quizQuestion.sid}`);
  }
  console.log(`   Quiz Response SID : ${quizResponse.sid}`);
  console.log('\nAdd this line to functions/.env and Secret Manager:');
  console.log(`   TWILIO_CONTENT_SID_QUIZ_RESPONSE=${quizResponse.sid}\n`);
  if (quizQuestion) {
    console.log('Also add this quiz question SID if you are replacing the question template:');
    console.log(`   TWILIO_CONTENT_SID_QUIZ=${quizQuestion.sid}\n`);
  }
}

const createContentTemplate = async (
  credentials: string,
  body: Record<string, unknown>
): Promise<any> => {
  const response = await fetch(CONTENT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    console.error(`\n❌  Twilio API error ${response.status}:`);
    console.error(JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.error('\n💡  Check that TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct.');
    } else if (response.status === 403) {
      console.error('\n💡  Your Twilio account may not have Content API access enabled.');
      console.error('    Visit: https://console.twilio.com → Messaging → Content Editor');
      console.error('    Or contact Twilio support to enable beta access.\n');
      console.error('    ⚠️  Without this, the quiz will fall back to plain A/B/C text.');
      console.error('    The bot works fine without buttons — users just type A, B or C.');
    }
    process.exit(1);
  }

  return data;
};

main().catch((err) => {
  console.error('❌  Unexpected error:', err.message ?? err);
  process.exit(1);
});
