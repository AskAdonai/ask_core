/**
 * Removes demo/placeholder content from Firestore before go-live.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=askwhatsappbot npx ts-node scripts/stripDemoContent.ts
 *   GOOGLE_CLOUD_PROJECT=askwhatsappbot npx ts-node scripts/stripDemoContent.ts --apply
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

const PLACEHOLDER_URL_PATTERNS = [
  /soundhelix\.com/i,
  /example\.com/i,
  /via\.placeholder\.com/i,
  /placeholder/i,
];

const PLACEHOLDER_TEXT_PATTERNS = [
  /this is a placeholder prayer/i,
  /^placeholder verse for this theme\.?$/i,
];

function isPlaceholderUrl(url?: string): boolean {
  if (!url?.trim()) return false;
  return PLACEHOLDER_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function isPlaceholderText(text?: string): boolean {
  if (!text?.trim()) return false;
  return PLACEHOLDER_TEXT_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

type ChangeRecord = {
  path: string;
  field: string;
  before: string;
  after: string;
};

const changes: ChangeRecord[] = [];

function recordChange(path: string, field: string, before: string, after: string): void {
  if (before === after) return;
  changes.push({ path, field, before, after });
}

async function main(): Promise<void> {
  initializeApp();
  const db = getFirestore();

  const themes = await db.collection('prayerThemes').get();
  for (const theme of themes.docs) {
    const prayers = await theme.ref.collection('prayers').get();
    for (const prayer of prayers.docs) {
      const data = prayer.data();
      const updates: Record<string, unknown> = {};
      const path = prayer.ref.path;

      for (const field of ['audioUrl', 'declarationAudioUrl'] as const) {
        const value = data[field] as string | undefined;
        if (isPlaceholderUrl(value)) {
          updates[field] = FieldValue.delete();
          recordChange(path, field, value || '', '(removed)');
        }
      }

      if (isPlaceholderText(data.prayerText as string | undefined)) {
        updates.prayerText = '';
        recordChange(path, 'prayerText', String(data.prayerText), '(cleared)');
      }

      if (isPlaceholderText(data.verse as string | undefined)) {
        updates.verse = '';
        recordChange(path, 'verse', String(data.verse), '(cleared)');
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        if (APPLY) {
          await prayer.ref.set(updates, { merge: true });
        }
      }
    }
  }

  const cards = await db.collection('prayerCards').get();
  for (const card of cards.docs) {
    const data = card.data();
    const updates: Record<string, unknown> = {};
    const path = card.ref.path;

    for (const field of ['audioUrl', 'morningVoiceNoteUrl', 'imageUrl', 'devotionLink'] as const) {
      const value = data[field] as string | undefined;
      if (isPlaceholderUrl(value)) {
        updates[field] = field === 'imageUrl' || field === 'devotionLink' ? '' : FieldValue.delete();
        recordChange(path, field, value || '', field === 'imageUrl' || field === 'devotionLink' ? '(cleared)' : '(removed)');
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      if (APPLY) {
        await card.ref.set(updates, { merge: true });
      }
    }
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Changes: ${changes.length}`);
  for (const change of changes) {
    console.log(`- ${change.path}.${change.field}`);
    console.log(`    before: ${change.before}`);
    console.log(`    after:  ${change.after}`);
  }

  if (!APPLY && changes.length > 0) {
    console.log('\nRe-run with --apply to write these changes.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
