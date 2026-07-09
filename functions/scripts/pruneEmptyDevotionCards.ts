/**
 * Final devotion cleanup — delete empty placeholder shells, keep only pilot cards.
 *
 * Usage:
 *   npx ts-node scripts/pruneEmptyDevotionCards.ts           # dry run
 *   npx ts-node scripts/pruneEmptyDevotionCards.ts --apply   # delete shells
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const APPLY = process.argv.includes('--apply');

/** Pilot-migrated cards with real admin-authored content — keep unchanged. */
const KEEP_CARD_IDS = new Set([
  'stage1-day4',
  'stage1-day5',
  'stage1-day6',
  'stage1-day7',
  'stage1-day8',
  'stage1-day12',
  'stage1-day13',
  'stage1-day14',
  'stage1-day15',
  'stage1-day16',
]);

async function main(): Promise<void> {
  const db = getFirestore();
  const snapshot = await db.collection('prayerCards').get();

  const toDelete: string[] = [];
  const kept: string[] = [];

  for (const doc of snapshot.docs) {
    if (KEEP_CARD_IDS.has(doc.id)) {
      kept.push(doc.id);
    } else {
      toDelete.push(doc.id);
    }
  }

  const missingKeep = [...KEEP_CARD_IDS].filter((id) => !kept.includes(id));

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Total cards in Firestore: ${snapshot.size}`);
  console.log(`Keeping: ${kept.length}`);
  console.log(`Deleting: ${toDelete.length}`);

  if (missingKeep.length > 0) {
    console.warn(`⚠️  Expected keep-list cards not found: ${missingKeep.join(', ')}`);
  }

  console.log('\nKept cards:');
  for (const id of [...KEEP_CARD_IDS].sort()) {
    const data = snapshot.docs.find((doc) => doc.id === id)?.data();
    console.log(`  ${id} — title: ${data?.title?.trim() || '(missing)'}`);
  }

  if (toDelete.length > 0) {
    console.log('\nSample deletions (first 10):');
    toDelete.slice(0, 10).forEach((id) => console.log(`  ${id}`));
    if (toDelete.length > 10) {
      console.log(`  ... and ${toDelete.length - 10} more`);
    }
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to delete.');
    return;
  }

  const batchSize = 400;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toDelete.slice(i, i + batchSize);
    for (const cardId of chunk) {
      batch.delete(db.collection('prayerCards').doc(cardId));
    }
    await batch.commit();
    console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} (${chunk.length} cards)`);
  }

  const after = await db.collection('prayerCards').get();
  console.log(`\n✅ Done. Remaining prayerCards: ${after.size}`);
  after.docs.forEach((doc) => console.log(`  ${doc.id}`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
