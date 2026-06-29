#!/usr/bin/env npx ts-node
/**
 * Send a test WhatsApp message for each configured Twilio Content Template.
 *
 * Usage (from functions/):
 *   npx ts-node scripts/testAllTemplates.ts
 *   npx ts-node scripts/testAllTemplates.ts +2348128991543
 */
import { loadLocalEnv } from '../src/config/loadLocalEnv';
import { morningDevotionSampleVariables } from '../src/templates/morningDevotionTemplate';
import { questMondaySampleVariables } from '../src/templates/questMondayTemplate';
import { questWednesdaySampleVariables } from '../src/templates/questWednesdayTemplate';
import { questSaturdaySampleVariables } from '../src/templates/questSaturdayTemplate';
import { resolveTwilioClientCredentials } from '../src/services/twilioCredentials';
import twilio from 'twilio';

loadLocalEnv();

const to = (process.argv[2] || '+2348128991543').replace(/^whatsapp:/, '');
const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

type TemplateCase = {
  label: string;
  envKey: string;
  contentSid?: string;
  contentVariables: Record<string, string>;
};

const templates: TemplateCase[] = [
  {
    label: 'Morning devotion (quick-reply)',
    envKey: 'TWILIO_CONTENT_SID_MORNING_DEVOTION',
    contentSid: process.env.TWILIO_CONTENT_SID_MORNING_DEVOTION,
    contentVariables: morningDevotionSampleVariables,
  },
  {
    label: 'Knock / SEEK declaration',
    envKey: 'TWILIO_CONTENT_SID_KNOCK_RESPONSE',
    contentSid: process.env.TWILIO_CONTENT_SID_KNOCK_RESPONSE,
    contentVariables: {
      '1': '[TEST] I am strong and courageous. The Lord goes with me wherever I go.',
    },
  },
  {
    label: 'Quiz question (quick-reply)',
    envKey: 'TWILIO_CONTENT_SID_QUIZ',
    contentSid: process.env.TWILIO_CONTENT_SID_QUIZ,
    contentVariables: {
      '1': '[TEST] Exodus — Q1 of 4',
      '2': 'Who led Israel out of Egypt?\nA) Moses\nB) Aaron\nC) Joshua',
      '3': 'A) Moses',
      '4': 'B) Aaron',
      '5': 'C) Joshua',
    },
  },
  {
    label: 'Quiz response',
    envKey: 'TWILIO_CONTENT_SID_QUIZ_RESPONSE',
    contentSid: process.env.TWILIO_CONTENT_SID_QUIZ_RESPONSE,
    contentVariables: {
      '1': '[TEST] Correct! Moses led Israel out of Egypt. Well done.',
    },
  },
  {
    label: 'Quest Monday',
    envKey: 'TWILIO_CONTENT_SID_QUEST_MONDAY',
    contentSid: process.env.TWILIO_CONTENT_SID_QUEST_MONDAY,
    contentVariables: questMondaySampleVariables,
  },
  {
    label: 'Quest Tuesday',
    envKey: 'TWILIO_CONTENT_SID_QUEST_TUESDAY',
    contentSid: process.env.TWILIO_CONTENT_SID_QUEST_TUESDAY,
    contentVariables: {
      Name: 'Friend',
      TuesdaySummary: '[TEST] Mid-week reflection on creation.',
      ReflectionQuote: 'In the beginning God created the heavens and the earth.',
    },
  },
  {
    label: 'Quest Wednesday',
    envKey: 'TWILIO_CONTENT_SID_QUEST_WEDNESDAY',
    contentSid: process.env.TWILIO_CONTENT_SID_QUEST_WEDNESDAY,
    contentVariables: questWednesdaySampleVariables,
  },
  {
    label: 'Quest Friday',
    envKey: 'TWILIO_CONTENT_SID_QUEST_FRIDAY',
    contentSid: process.env.TWILIO_CONTENT_SID_QUEST_FRIDAY,
    contentVariables: {
      Name: 'Friend',
      FridayEncouragement: '[TEST] Finish strong this week!',
      WeekNumber: '26',
      ReadingPortion: 'Genesis 8-11',
      VideoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      WeeklySummary: 'We covered Genesis 1-11 this week.',
    },
  },
  {
    label: 'Quest Saturday',
    envKey: 'TWILIO_CONTENT_SID_QUEST_SATURDAY',
    contentSid: process.env.TWILIO_CONTENT_SID_QUEST_SATURDAY,
    contentVariables: questSaturdaySampleVariables,
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { accountSid, username, password } = resolveTwilioClientCredentials();
  const client = twilio(username, password, { accountSid });

  console.log(`Testing ${templates.length} templates → ${to}`);
  console.log(`From: ${from}\n`);

  const results: { label: string; status: string; sid?: string; error?: string }[] = [];

  for (const tpl of templates) {
    if (!tpl.contentSid?.startsWith('HX')) {
      results.push({ label: tpl.label, status: 'SKIP', error: `${tpl.envKey} not set` });
      console.log(`⏭  ${tpl.label} — skipped (${tpl.envKey} missing)`);
      continue;
    }

    try {
      const message = await client.messages.create({
        from,
        to: `whatsapp:${to}`,
        contentSid: tpl.contentSid,
        contentVariables: JSON.stringify(tpl.contentVariables),
      });
      results.push({ label: tpl.label, status: 'OK', sid: message.sid });
      console.log(`✅ ${tpl.label} — ${message.sid}`);
    } catch (error: unknown) {
      const err = error as { message?: string; code?: number };
      const msg = err.message ?? String(error);
      results.push({ label: tpl.label, status: 'FAIL', error: msg });
      console.log(`❌ ${tpl.label} — ${msg}`);
    }

    // Avoid Twilio rate limits between sends
    await sleep(1500);
  }

  console.log('\n── Summary ──');
  const ok = results.filter((r) => r.status === 'OK').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  console.log(`OK: ${ok}  FAIL: ${fail}  SKIP: ${skip}`);

  if (fail > 0) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => x.status === 'FAIL')) {
      console.log(`  • ${r.label}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
