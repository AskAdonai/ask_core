/**
 * Seeds Stage 1 (Believe) devotion cards for days 1–10 with real devotional content.
 *
 * Usage: npx ts-node scripts/seedStage1Days1to10.ts
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadLocalEnv } from '../src/config/loadLocalEnv';

loadLocalEnv();

if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'askwhatsappbot',
  });
}

const STAGE = 1;

const CARDS = [
  {
    dayIndex: 1,
    title: 'A New Beginning in Christ',
    scriptureReference: '2 Corinthians 5:17',
    scriptureText:
      'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
    prayerText:
      'Father, thank You for making me new in Christ. Wash away what is behind me and anchor my heart in Your promises today.',
    declarationText:
      'I am a new creation. My past does not define me — Christ defines my future.',
    reflectionPrompt: 'What old pattern is God inviting you to leave behind today?',
  },
  {
    dayIndex: 2,
    title: 'Faith Over Fear',
    scriptureReference: 'Isaiah 41:10',
    scriptureText:
      'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.',
    prayerText:
      'Lord, when fear rises, remind me that You are with me. Strengthen my heart to trust You more than I trust what I see.',
    declarationText: 'God is with me. I will not be afraid — His strength is my strength.',
    reflectionPrompt: 'Where is fear trying to speak louder than faith in your life right now?',
  },
  {
    dayIndex: 3,
    title: 'Rebuilding on the Rock',
    scriptureReference: 'Matthew 7:24',
    scriptureText:
      'Everyone who hears these words of mine and puts them into practice is like a wise man who built his house on the rock.',
    prayerText:
      'Jesus, I choose to build my life on Your Word. When storms come, let my foundation remain unshaken in You.',
    declarationText: 'My life is built on Christ. I will not be moved.',
    reflectionPrompt: 'What practical step can you take today to obey what God has already spoken?',
  },
  {
    dayIndex: 4,
    title: 'Hope That Does Not Disappoint',
    scriptureReference: 'Romans 5:5',
    scriptureText:
      'And hope does not put us to shame, because God\'s love has been poured out into our hearts through the Holy Spirit.',
    prayerText:
      'Holy Spirit, fill me with hope that comes from Your love. Restore what disappointment has tried to steal.',
    declarationText: 'My hope is anchored in God\'s love — it will not disappoint me.',
    reflectionPrompt: 'Where do you need God to renew your hope this week?',
  },
  {
    dayIndex: 5,
    title: 'Standing In Freedom',
    scriptureReference: 'Ephesians 6:12',
    scriptureText:
      'For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world.',
    prayerText:
      'Lord, I put on the full armor of God. I declare freedom from every cycle and bondage in my bloodline. Your blood speaks a better word over my life.',
    declarationText: 'I am completely free in Christ. No weapon formed against me shall prosper.',
    reflectionPrompt: 'What cycle are you asking God to break with you?',
  },
  {
    dayIndex: 6,
    title: 'Believing Before Seeing',
    scriptureReference: 'Hebrews 11:1',
    scriptureText:
      'Now faith is confidence in what we hope for and assurance about what we do not see.',
    prayerText:
      'Father, grow my faith beyond what my eyes can see. Help me trust Your timing and Your goodness in the waiting.',
    declarationText: 'I walk by faith, not by sight. What God promised, He will perform.',
    reflectionPrompt: 'What promise are you holding onto even when you cannot yet see the outcome?',
  },
  {
    dayIndex: 7,
    title: 'Strength for the Weary',
    scriptureReference: 'Isaiah 40:31',
    scriptureText:
      'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
    prayerText:
      'Lord, I bring You my weariness. Exchange it for Your strength. Lift me above what has drained me.',
    declarationText: 'My strength is renewed in the Lord. I will rise again in His power.',
    reflectionPrompt: 'What has been draining you — and how can you invite God into that place today?',
  },
  {
    dayIndex: 8,
    title: 'Trusting His Heart',
    scriptureReference: 'Proverbs 3:5-6',
    scriptureText:
      'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    prayerText:
      'God, I surrender my need to understand everything. I trust Your heart even when the path is unclear.',
    declarationText: 'I trust the Lord with all my heart. He is directing my steps.',
    reflectionPrompt: 'What area of your life are you still trying to control instead of surrendering?',
  },
  {
    dayIndex: 9,
    title: 'Called and Chosen',
    scriptureReference: '1 Peter 2:9',
    scriptureText:
      'But you are a chosen people, a royal priesthood, a holy nation, God\'s special possession.',
    prayerText:
      'Father, thank You that I belong to You. Remind me today that I am chosen, called, and set apart for Your purpose.',
    declarationText: 'I am chosen by God. My life has purpose and meaning in Christ.',
    reflectionPrompt: 'How does knowing you are chosen by God change the way you see yourself today?',
  },
  {
    dayIndex: 10,
    title: 'Faith That Moves Mountains',
    scriptureReference: 'Mark 11:23',
    scriptureText:
      'Truly I tell you, if anyone says to this mountain, "Go, throw yourself into the sea," and does not doubt in their heart but believes, it will be done.',
    prayerText:
      'Jesus, increase my faith. I bring You the mountains in my life and choose to believe You are greater than them all.',
    declarationText: 'I believe God can move every mountain before me. Nothing is impossible for Him.',
    reflectionPrompt: 'What "mountain" are you asking God to move — and are you willing to believe He can?',
  },
] as const;

async function main(): Promise<void> {
  const db = getFirestore();
  const now = new Date();
  const batch = db.batch();

  for (const card of CARDS) {
    const cardId = `stage${STAGE}-day${card.dayIndex}`;
    const ref = db.collection('prayerCards').doc(cardId);
    batch.set(
      ref,
      {
        journeyStage: STAGE,
        dayIndex: card.dayIndex,
        deliveryOrder: card.dayIndex,
        title: card.title,
        scriptureReference: card.scriptureReference,
        scriptureText: card.scriptureText,
        prayerText: card.prayerText,
        declarationText: card.declarationText,
        reflectionPrompt: card.reflectionPrompt,
        imageUrl: '',
        audioUrl: '',
        morningVoiceNoteUrl: '',
        declarationAudioUrl: '',
        devotionLink: '',
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    console.log(`seeded ${cardId} — ${card.title}`);
  }

  await batch.commit();
  console.log(`✅ Seeded ${CARDS.length} Stage 1 devotion cards (days 1–10)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
