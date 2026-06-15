import * as admin from 'firebase-admin';
import * as yaml from 'yaml';
import { readFileSync } from 'fs';
import * as path from 'path';

const envRaw = readFileSync(path.resolve(__dirname, '.env.yaml'), 'utf8');
const env = yaml.parse(envRaw);
const PROJECT_ID = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT || 'whatapp-497611';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();
const sv = admin.firestore.FieldValue.serverTimestamp;

const quests = [
  // ─── WEEK 1 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 1,
    status: 'published',
    levelTracker: 'LEVEL 1.1',
    weeklyChapterSpan: 'Genesis 1–23',
    weekIntro: 'Welcome to Week 1 of the Bible in a Year Quest! With just 3 videos each week, you\'ll read through the entire Bible in one year. What a journey this will be!',
    days: {
      monday: {
        readingPortion: 'Genesis Chapters 1–8',
        videoLink: 'https://youtu.be/1gK4y693qwY?si=8UbBhoLitQNBfnrw',
        mondayEncouragement: 'Welcome to Week 1 of the Bible in a Year Quest!\nWith just 3 videos each week, you\'ll read through the entire Bible in one year. What a journey this will be!\n\nToday\'s video covers Genesis Chapters 1–8.\nTake some time today to watch and follow along with the reading.\nI\'ll be back tomorrow to check in before your next video on Wednesday.',
      },
      tuesday: {
        tuesdaySummary: 'Genesis 1–8 lays the foundation for everything that follows in Scripture. One thing that stands out is Noah\'s obedience. While the world around him ignored God, Noah chose to walk with Him and do exactly as He commanded.',
        reflectionQuote: 'Am I willing to obey God even when everyone else chooses a different path?',
      },
      wednesday: {
        readingPortion: 'Genesis Chapters 9–16',
        wednesdaySummary: 'You\'ll read about God\'s covenant with Noah, the Tower of Babel, and the beginning of Abraham\'s journey of faith.',
        videoLink: 'https://youtu.be/ltOTOLTLP_0?si=NSDZ7VeTlxdrZc_l',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video of the week!',
      },
      friday: {
        fridayEncouragement: 'Congratulations! You\'re going strong.',
        readingPortion: 'Genesis Chapters 17–23',
        videoLink: 'https://youtu.be/rEfB65QjIWE?si=BsifSM8C0_ZJptWQ',
        weeklySummary: 'This week you\'ve journeyed through Genesis Chapters 1–23 and witnessed God\'s power in creation, His judgment and mercy in the flood, and His covenant promises to Abraham. If you\'ve missed any part of the week\'s reading, now is a great time to catch up. See you tomorrow for a quick quiz!',
      },
      saturday: {
        quizGreeting: 'How about a quick quiz? You\'ve completed your first week of the Bible in a Year Quest, covering Genesis Chapters 1–23.\nTake a few minutes to test your understanding and reinforce what you\'ve learned this week.',
        quizLinks: 'Genesis Part 1 Quiz: https://forms.gle/Cy6Uj7XN91JdvVrN7\nGenesis Part 2 Quiz: https://forms.gle/HSFNaggFrcEJ6s567\nGenesis Part 3 Quiz: https://forms.gle/ZyM6Pt8Pev8NFaSc9',
        saturdayEncouragement: 'Keep going—you\'ve started well, and we\'re excited to continue this journey with you.',
      },
    },
  },

  // ─── WEEK 2 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 2,
    status: 'published',
    levelTracker: 'LEVEL 1.2',
    weeklyChapterSpan: 'Genesis 24–38',
    weekIntro: 'You\'re doing well staying consistent. This week covers Genesis 24–38.',
    days: {
      monday: {
        readingPortion: 'Genesis 24–27',
        videoLink: 'https://youtu.be/pWVTmUbS3pQ?si=klA8i0AGuglwvSSt',
        mondayEncouragement: 'You\'re doing well staying consistent.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Genesis 24–27) shows us how God guides decisions, even in everyday life like marriage, blessings, and family relationships. One thing to notice is how human choices often clash with God\'s promises but His plan still stands.',
        reflectionQuote: 'Do I trust God enough to wait for His direction, even when I feel pressure to act quickly?',
      },
      wednesday: {
        readingPortion: 'Genesis 28–32',
        wednesdaySummary: 'You\'ll see Jacob\'s journey, his encounter with God, and how his life begins to transform through struggle and divine encounters.',
        videoLink: 'https://youtu.be/sIvXrkzTYs8?si=0DEArHw5KZ9cCnOO',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re keeping up steadily!',
        readingPortion: 'Genesis 33–38',
        videoLink: 'https://youtu.be/OxqF8jW20eE?si=3P4RruAeSzmWmqzw',
        weeklySummary: 'This week you\'ve followed Jacob\'s journey from fear and conflict into reconciliation and growth. If you missed anything, feel free to catch up before the quiz tomorrow.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Genesis Part 4 Quiz: https://forms.gle/VrqGgNCewWCbzgNn6\nGenesis Part 5 Quiz: https://forms.gle/MXov7efVkmCHuuiv8\nGenesis Part 6 Quiz: https://forms.gle/Rc8i9f6pmbfdhaYcA',
        saturdayEncouragement: 'Keep going—you\'re building strong consistency in the Word.',
      },
    },
  },

  // ─── WEEK 3 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 3,
    status: 'published',
    levelTracker: 'LEVEL 1.3',
    weeklyChapterSpan: 'Genesis 39–50 and Exodus 1–7',
    weekIntro: 'You\'re doing great staying consistent. This week covers Genesis 39–50 and moves into Exodus.',
    days: {
      monday: {
        readingPortion: 'Genesis 39–43',
        videoLink: 'https://youtu.be/Ts-nF7L_sEk?si=F3LjFXazeJhoH00-',
        mondayEncouragement: 'You\'re doing great staying consistent.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Genesis 39–43) shows Joseph in a season of delay, betrayal, and uncertainty—but God\'s hand is still evident in every step. Even when things looked unfair, God was quietly positioning him for something greater.',
        reflectionQuote: 'Can I trust God even when my current season doesn\'t look like His promise?',
      },
      wednesday: {
        readingPortion: 'Genesis 44–50',
        wednesdaySummary: 'You\'ll see forgiveness, restoration, and how God turns a painful story into purpose through Joseph\'s life.',
        videoLink: 'https://youtu.be/YPWv87ru6eU?si=ayZrq7bvsyj5dBMb',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'ve stayed consistent again this week!',
        readingPortion: 'Exodus 1–7',
        videoLink: 'https://youtu.be/3g0s_EpsyZY?si=HfKY_ubOtSPFcA6_',
        weeklySummary: 'This week you\'ve moved from Joseph\'s story into the beginning of Israel\'s deliverance story in Egypt. If you missed any part, take time to catch up before the quiz tomorrow.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Genesis Part 7 Quiz: https://forms.gle/y2YwUoZ56yRYSWVC9\nGenesis Part 8 Quiz: https://forms.gle/AfJL9rkYL24QcaoV9\nExodus Part 1 Quiz: https://forms.gle/CjT7ETHvJagKbWbx7',
        saturdayEncouragement: 'Keep going—every chapter brings you closer to the full picture.',
      },
    },
  },

  // ─── WEEK 4 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 4,
    status: 'published',
    levelTracker: 'LEVEL 3.2',
    weeklyChapterSpan: 'Exodus 8–24',
    weekIntro: 'You\'re moving steadily through Scripture—well done. This week covers Exodus 8–24.',
    days: {
      monday: {
        readingPortion: 'Exodus 8–12',
        videoLink: 'https://youtu.be/y0I-7JlrWbc?si=8Pxh0wflvUuFl0U6',
        mondayEncouragement: 'You\'re moving steadily through Scripture—well done.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Exodus 8–12) shows God\'s power displayed through the plagues in Egypt and the seriousness of His command to Pharaoh.',
        reflectionQuote: 'Do I trust God\'s timing even when the situation seems unyielding?',
      },
      wednesday: {
        readingPortion: 'Exodus 13–18',
        wednesdaySummary: 'You\'ll follow Israel\'s deliverance from Egypt, the crossing of the Red Sea, and God\'s provision in the wilderness.',
        videoLink: 'https://youtu.be/NmJG45uMKpE?si=9CHe5P7TDzlUNZ71',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re keeping up consistently!',
        readingPortion: 'Exodus 19–24',
        videoLink: 'https://youtu.be/vljK15v8e3s?si=RuY2oIatFaGDjByQ',
        weeklySummary: 'This week you\'ve witnessed God\'s deliverance, His guidance, and the giving of the Law at Mount Sinai. If you missed any part, take time to catch up before the quiz tomorrow.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Exodus Part 2 Quiz: https://forms.gle/rrfammAWk1WCLEtF8\nExodus Part 3 Quiz: https://forms.gle/QCW2jBtBaH91QLPMA\nExodus Part 4 Quiz: https://forms.gle/yGQhb32g13D5hCZUA',
        saturdayEncouragement: 'Keep going—you\'re building strong consistency in the Word.',
      },
    },
  },

  // ─── WEEK 5 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 5,
    status: 'published',
    levelTracker: 'LEVEL 1.5',
    weeklyChapterSpan: 'Exodus 25–40',
    weekIntro: 'You\'re now deep into Exodus—well done for staying consistent. This week covers Exodus 25–40.',
    days: {
      monday: {
        readingPortion: 'Exodus 25–29',
        videoLink: 'https://youtu.be/DyhTREO7cDc?si=yZGkvNAa_UNpdZQ7',
        mondayEncouragement: 'You\'re now deep into Exodus—well done for staying consistent.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Exodus 25–29) focuses on God\'s detailed instructions for the Tabernacle and priesthood. It shows us that God is not distant—He is intentional about how He dwells among His people.',
        reflectionQuote: 'Do I value God\'s presence with the same seriousness He shows in His instructions?',
      },
      wednesday: {
        readingPortion: 'Exodus 30–34',
        wednesdaySummary: 'You\'ll see moments of failure, mercy, and restoration as Israel struggles with obedience while God reveals His character.',
        videoLink: 'https://youtu.be/xk64dYVSLl8?si=OZ-M0htmKIU5CCsS',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'ve stayed steady through another week!',
        readingPortion: 'Exodus 35–40',
        videoLink: 'https://youtu.be/tEgtdYWrCVA?si=UFknvEKEQ29MHIE-',
        weeklySummary: 'This week you\'ve completed the building of the Tabernacle and seen God\'s presence fill it. If you missed any part, take time to catch up before the quiz tomorrow.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Exodus Part 5 Quiz: https://forms.gle/Cp8aoF14Y5MTxnrk8\nExodus Part 6 Quiz: https://forms.gle/8eSjL4yCC3BHAohd9\nExodus Part 7 Quiz: https://forms.gle/q712jA1mxcTVeCBw7',
        saturdayEncouragement: 'Keep going—you\'re building endurance in the Word.',
      },
    },
  },

  // ─── WEEK 6 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 6,
    status: 'published',
    levelTracker: 'LEVEL 1.6',
    weeklyChapterSpan: 'Leviticus 1–21',
    weekIntro: 'You\'ve moved into Leviticus—stay steady, this part builds deep understanding. This week covers Leviticus 1–21.',
    days: {
      monday: {
        readingPortion: 'Leviticus 1–8',
        videoLink: 'https://youtu.be/O6lZIjMjwVc?si=o1tlThPLDxifTC2l',
        mondayEncouragement: 'You\'ve moved into Leviticus—stay steady, this part builds deep understanding.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Leviticus 1–8) introduces offerings and the priestly system. It shows us that approaching God is not casual—it involves reverence, order, and sacrifice.',
        reflectionQuote: 'Do I approach God with intentionality, or only when it is convenient?',
      },
      wednesday: {
        readingPortion: 'Leviticus 9–14',
        wednesdaySummary: 'You\'ll see the start of priestly ministry, laws about cleanliness, and how God teaches His people to live set apart.',
        videoLink: 'https://youtu.be/1JK7Fyq1bII?si=QEBlT0yHZMgfh34a',
        estimatedTime: '30 minutes',
        signOff: 'See you on Friday for the final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re staying consistent through another week!',
        readingPortion: 'Leviticus 16–21',
        videoLink: 'https://youtu.be/4snSFw3T5f4?si=zKiUTSaL92mx49EI',
        weeklySummary: 'This week highlights atonement, holiness, and God\'s call for His people to live differently. If you missed anything, take time to catch up before the quiz tomorrow.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Leviticus Part 1 Quiz: https://forms.gle/G9bdS7DmgoU6Szuu7\nLeviticus Part 2 Quiz: https://forms.gle/BtzLqoVRcfjCaRin9\nLeviticus Part 3 Quiz: https://forms.gle/pyBCjtx8storcskg9',
        saturdayEncouragement: 'Keep going—you\'re growing in understanding.',
      },
    },
  },

  // ─── WEEK 7 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 7,
    status: 'published',
    levelTracker: 'LEVEL 1.7',
    weeklyChapterSpan: 'Leviticus 22–27 and Matthew 1–9',
    weekIntro: 'You\'re doing well staying consistent through Leviticus and into Matthew. This week covers Leviticus 22–27 and Matthew 1–9.',
    days: {
      monday: {
        readingPortion: 'Leviticus 22–27',
        videoLink: 'https://youtu.be/VPFixdUTBqo?si=xsiXdrXqjP4QOhfx',
        mondayEncouragement: 'You\'re doing well staying consistent through Leviticus and into Matthew.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Leviticus 22–27) continues God\'s instructions on holiness, vows, and consecration. It reminds us that God calls His people to live with intentional separation—not just in worship, but in daily life.',
        reflectionQuote: 'What areas of my life still need to be fully set apart for God?',
      },
      wednesday: {
        readingPortion: 'Matthew 1–9',
        wednesdaySummary: 'You\'ll see the arrival of Jesus, the beginning of His ministry, miracles, teachings, and the call to live differently under the Kingdom of God.',
        videoLink: 'https://youtu.be/D9kja76k13U?si=Jy5wqTmyew3d4YDj',
        estimatedTime: '30–40 minutes',
        signOff: 'I\'ll check in again before your quiz.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'ve completed this week\'s videos!',
        readingPortion: 'Leviticus 22–27 and Matthew 1–9',
        weeklySummary: 'You\'ve now moved from Leviticus into the beginning of the Gospel of Matthew, seeing the birth and ministry of Jesus. Take a moment to reflect on everything you\'ve read so far. If you missed anything, today is a good day to catch up. I\'ll see you tomorrow for a quick quiz.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Leviticus Part 4 Quiz: https://forms.gle/P28ohw3hb33BRu2E8\nMatthew Part 1 Quiz: https://forms.gle/Fg7uphzmenxCgcBk9',
        saturdayEncouragement: 'You\'re doing well—keep going, consistency is building your strength in the Word.',
      },
    },
  },

  // ─── WEEK 8 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 8,
    status: 'published',
    levelTracker: 'LEVEL 1.8',
    weeklyChapterSpan: 'Matthew 10–28',
    weekIntro: 'You\'re progressing well through the Gospel of Matthew. This week covers Matthew 10–28.',
    days: {
      monday: {
        readingPortion: 'Matthew 10–15',
        videoLink: 'https://youtu.be/smsTZxIQog8?si=e-86MbPWFeLAB8Sb',
        mondayEncouragement: 'You\'re progressing well through the Gospel of Matthew.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Matthew 10–15) shows Jesus sending out His disciples, teaching on faith, and revealing what it means to truly follow Him. One key theme is that following Jesus comes with both purpose and opposition.',
        reflectionQuote: 'Am I willing to follow Jesus even when it becomes uncomfortable or unpopular?',
      },
      wednesday: {
        readingPortion: 'Matthew 16–22',
        wednesdaySummary: 'You\'ll see deeper teachings of Jesus, His identity revealed, and His confrontation with religious systems.',
        videoLink: 'https://youtu.be/smsTZxIQog8?si=e-86MbPWFeLAB8Sb',
        estimatedTime: '30–40 minutes',
        signOff: 'I\'ll check in again before your final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re staying consistent!',
        readingPortion: 'Matthew 23–28',
        videoLink: 'https://youtu.be/4kg31UuovB0?si=XMs-0OaD7dcwaDxv',
        weeklySummary: 'This week you\'ve journeyed through the final teachings of Jesus, His crucifixion, and His resurrection. Take time to reflect deeply on all you\'ve read. I\'ll see you tomorrow for your quiz.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Matthew Part 4 Quiz: https://forms.gle/56SqCeFGnuKhPoYh8',
        saturdayEncouragement: 'Keep going—you\'re more than halfway through the New Testament Gospels.',
      },
    },
  },

  // ─── WEEK 9 ───────────────────────────────────────────────────────────────
  {
    weekNumber: 9,
    status: 'published',
    levelTracker: 'LEVEL 1.9',
    weeklyChapterSpan: 'Mark 1–16',
    weekIntro: 'You\'re now moving into the Gospel of Mark. This week covers Mark 1–16.',
    days: {
      monday: {
        readingPortion: 'Mark 1–5',
        videoLink: 'https://youtu.be/dHB0AyjoHdw?si=UvY11QI7p6Pa6z8V',
        mondayEncouragement: 'You\'re now moving into the Gospel of Mark.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Mark 1–5) introduces Jesus\' ministry with power—teachings, miracles, deliverance, and authority over sickness and storms. One key theme is that the presence of Jesus brings immediate transformation.',
        reflectionQuote: 'Do I believe Jesus still has authority over every situation in my life?',
      },
      wednesday: {
        readingPortion: 'Mark 6–9',
        wednesdaySummary: 'You\'ll see Jesus teaching, feeding multitudes, walking in authority, and revealing more of His identity to the disciples.',
        videoLink: 'https://youtu.be/sX3D1z1B4Kw?si=APcThAN3SW8azbBM',
        estimatedTime: '30–40 minutes',
        signOff: 'I\'ll check in again before your final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re staying consistent!',
        readingPortion: 'Mark 10–16',
        videoLink: 'https://youtu.be/sDxSntBMPF4?si=5cldV2CiAq8OnhDs',
        weeklySummary: 'This week you\'ve followed Jesus\' journey through teaching, suffering, and His path toward the cross. Take time to reflect deeply on His sacrifice and obedience. I\'ll see you tomorrow for your quiz.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Mark Quiz: https://forms.gle/yq66mn1M3CEGMPUZ6',
        saturdayEncouragement: 'Keep going—you\'re steadily working through the Gospels.',
      },
    },
  },

  // ─── WEEK 10 ──────────────────────────────────────────────────────────────
  {
    weekNumber: 10,
    status: 'published',
    levelTracker: 'LEVEL 2.0',
    weeklyChapterSpan: 'Numbers 1–16',
    weekIntro: 'You\'re now in the book of Numbers. This week covers Numbers 1–16.',
    days: {
      monday: {
        readingPortion: 'Numbers 1–5',
        videoLink: 'https://youtu.be/t3aIVybFqrw?si=fTSvYmtlw52qky-s',
        mondayEncouragement: 'You\'re now in the book of Numbers.',
      },
      tuesday: {
        tuesdaySummary: 'Yesterday\'s reading (Numbers 1–5) shows God organizing His people with structure, order, and purpose in the wilderness. Even in the desert season, nothing is random with God.',
        reflectionQuote: 'Can I trust God\'s order in my life even when I don\'t understand the process?',
      },
      wednesday: {
        readingPortion: 'Numbers 6–10',
        wednesdaySummary: 'You\'ll see instructions for consecration, blessings, and how God leads His people step by step in the wilderness journey.',
        videoLink: 'https://youtu.be/AzAP2kx1ON0?si=XHU3JXYjBuPIOGfj',
        estimatedTime: '30–40 minutes',
        signOff: 'I\'ll check in again before your final video.',
      },
      friday: {
        fridayEncouragement: 'Well done—you\'re staying consistent!',
        readingPortion: 'Numbers 11–16',
        videoLink: 'https://youtu.be/YajYiJ_rh3M?si=BIAnMbnoiC_gjSaf',
        weeklySummary: 'This week you\'ve seen both God\'s provision and the people\'s complaints, showing the tension between faith and doubt in the wilderness. Take time to reflect deeply. I\'ll see you tomorrow for your quiz.',
      },
      saturday: {
        quizGreeting: 'Quick quiz time!',
        quizLinks: 'Numbers Part 1 Quiz: https://forms.gle/StxhLU6MBibyssnx7',
        saturdayEncouragement: 'Keep going—you\'re building endurance in the Word.',
      },
    },
  },
];

async function seed() {
  console.log(`\n🌱 Seeding quest content into project: ${PROJECT_ID}\n`);

  const existing = await db.collection('questContent').get();
  for (const doc of existing.docs) {
    console.log(`  🗑️  Deleting old doc: ${doc.id}`);
    await doc.ref.delete();
  }
  if (existing.docs.length) console.log(`\n  Cleared ${existing.docs.length} old document(s).\n`);
  else console.log('  Collection was empty. Starting fresh.\n');

  for (const quest of quests) {
    const docId = String(quest.weekNumber);
    console.log(`  📖 Week ${quest.weekNumber}: ${quest.weeklyChapterSpan} [${quest.status}]`);
    await db.collection('questContent').doc(docId).set({
      ...quest,
      createdAt: sv(),
      updatedAt: sv(),
    });
  }

  console.log(`\n✅ Successfully seeded ${quests.length} quest weeks!\n`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
