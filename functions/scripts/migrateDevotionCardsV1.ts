/**
 * Round 5 Step 5 — prune out-of-range devotion cards and migrate pilot content.
 *
 * Usage:
 *   npx ts-node scripts/migrateDevotionCardsV1.ts           # dry run
 *   npx ts-node scripts/migrateDevotionCardsV1.ts --apply    # write changes
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { Prayer } from '../src/types/schemas';

initializeApp();

const APPLY = process.argv.includes('--apply');
const PILOT_MIGRATE_COUNT = 10;

interface LegacyCard {
  journeyStage?: number;
  dayIndex?: number;
  themeId?: string;
  prayerId?: string;
  title?: string;
  prayerText?: string;
  imageUrl?: string;
  audioUrl?: string;
  devotionLink?: string;
  morningVoiceNoteUrl?: string;
}

interface MigrationReportRow {
  cardId: string;
  dayIndex: number;
  action: 'deleted' | 'migrated' | 'cleared';
  title?: string;
  prayerPreview?: string;
  note?: string;
}

const stripLegacyPrayerFields = {
  themeId: FieldValue.delete(),
  prayerId: FieldValue.delete(),
  verse: FieldValue.delete(),
  reference: FieldValue.delete(),
  reflectionQuestion: FieldValue.delete(),
  journalPrompt: FieldValue.delete(),
};

async function fetchLinkedPrayer(themeId: string, prayerId: string): Promise<Prayer | null> {
  const db = getFirestore();
  const doc = await db
    .collection('prayerThemes')
    .doc(themeId)
    .collection('prayers')
    .doc(prayerId)
    .get();

  return doc.exists ? (doc.data() as Prayer) : null;
}

async function main(): Promise<void> {
  const db = getFirestore();
  const snapshot = await db.collection('prayerCards').get();
  const report: MigrationReportRow[] = [];
  let deleted = 0;
  let migrated = 0;
  let cleared = 0;

  const stage1Cards = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as LegacyCard }))
    .filter((entry) => (entry.data.journeyStage ?? 1) === 1)
    .sort((a, b) => (a.data.dayIndex ?? 0) - (b.data.dayIndex ?? 0));

  for (const entry of stage1Cards) {
    const dayIndex = entry.data.dayIndex ?? 0;

    if (dayIndex > 130) {
      report.push({
        cardId: entry.id,
        dayIndex,
        action: 'deleted',
        note: 'Out of V1 range (day > 130)',
      });
      if (APPLY) {
        await db.collection('prayerCards').doc(entry.id).delete();
      }
      deleted++;
      continue;
    }
  }

  const inRange = stage1Cards.filter((entry) => (entry.data.dayIndex ?? 0) <= 130);
  let migratedCount = 0;

  for (const entry of inRange) {
    const dayIndex = entry.data.dayIndex ?? 0;
    const themeId = entry.data.themeId?.trim();
    const prayerId = entry.data.prayerId?.trim();

    if (migratedCount < PILOT_MIGRATE_COUNT && themeId && prayerId) {
      const prayer = await fetchLinkedPrayer(themeId, prayerId);
      if (prayer) {
        report.push({
          cardId: entry.id,
          dayIndex,
          action: 'migrated',
          title: prayer.title,
          prayerPreview: prayer.prayerText.slice(0, 120),
          note: `Copied from ${themeId}/${prayerId}`,
        });

        if (APPLY) {
          await db.collection('prayerCards').doc(entry.id).set(
            {
              ...stripLegacyPrayerFields,
              title: prayer.title || '',
              prayerText: prayer.prayerText || '',
              scriptureText: prayer.verse || '',
              scriptureReference: prayer.reference || '',
              reflectionPrompt: prayer.reflectionQuestion || '',
              declarationText: prayer.declarationText || '',
              declarationAudioUrl: prayer.declarationAudioUrl || '',
              updatedAt: new Date(),
            },
            { merge: true },
          );
        }
        migrated++;
        migratedCount++;
        continue;
      }
    }

    report.push({
      cardId: entry.id,
      dayIndex,
      action: 'cleared',
      note:
        migratedCount < PILOT_MIGRATE_COUNT && themeId && prayerId
          ? `Broken link ${themeId}/${prayerId}`
          : 'Left empty for manual authoring',
    });

    if (APPLY) {
      await db.collection('prayerCards').doc(entry.id).set(
        {
          ...stripLegacyPrayerFields,
          title: '',
          prayerText: '',
          scriptureText: '',
          scriptureReference: '',
          reflectionPrompt: '',
          declarationText: '',
          declarationAudioUrl: '',
          updatedAt: new Date(),
        },
        { merge: true },
      );
    }
    cleared++;
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Deleted (day > 130): ${deleted}`);
  console.log(`Pilot migrated (first ${PILOT_MIGRATE_COUNT} valid links by day order): ${migrated}`);
  console.log(`Cleared for manual authoring: ${cleared}`);
  console.log('\nDetailed report:');
  for (const row of report) {
    console.log(
      `- ${row.cardId} (day ${row.dayIndex}) [${row.action}]` +
        (row.title ? ` title="${row.title}"` : '') +
        (row.note ? ` — ${row.note}` : ''),
    );
    if (row.prayerPreview) {
      console.log(`    body: ${row.prayerPreview}...`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
