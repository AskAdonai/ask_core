/**
 * Quest Content Seed Data
 *
 * 52 weeks of Bible-in-a-Year content.
 * Each week has:
 *  - weekNumber: 1-52
 *  - title: descriptive title for the week
 *  - books: primary book(s) covered
 *  - readingChapters: chapter numbers read this week
 *  - quizQuestions: 4 multiple-choice questions (A/B/C options)
 *  - videoUrl / videoTitle: HeyGen-hosted avatar video (populated during production)
 *
 * Collection path: questContent/{weekNumber}
 *
 * Run seed script:
 *   npx ts-node functions/src/seed/seedQuestContent.ts
 */

import type { QuestContent } from '../types/schemas';

export const questContentSeed: Omit<QuestContent, 'createdAt'>[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // OLD TESTAMENT
  // ─────────────────────────────────────────────────────────────────────────────

  {
    weekNumber: 1,
  weekTitle: 'In the Beginning — Creation & the Fall',
    books: 'Genesis',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'On which day did God create the sun, moon, and stars?',
        options: ['Day 3', 'Day 4', 'Day 5'],
        answerIndex: 1,
      },
      {
        question: 'What was the name of the garden where Adam and Eve lived?',
        options: ['Garden of Gethsemane', 'Garden of Eden', 'Garden of Shiloh'],
        answerIndex: 1,
      },
      {
        question: 'How many days and nights did it rain during the flood?',
        options: ['20', '40', '60'],
        answerIndex: 1,
      },
      {
        question: 'What sign did God give as a covenant after the flood?',
        options: ['A dove', 'A rainbow', 'A pillar of cloud'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 2,
  weekTitle: 'The Call of Abraham',
    books: 'Genesis',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Where did God call Abram to leave when He first called him?',
        options: ['Ur of the Chaldeans', 'Egypt', 'Canaan'],
        answerIndex: 0,
      },
      {
        question: 'What new name did God give Abram?',
        options: ['Israel', 'Abraham', 'Ishmael'],
        answerIndex: 1,
      },
      {
        question: 'Who was the mother of Ishmael?',
        options: ['Sarah', 'Rebekah', 'Hagar'],
        answerIndex: 2,
      },
      {
        question: 'On which mountain did Abraham almost sacrifice Isaac?',
        options: ['Mount Sinai', 'Mount Moriah', 'Mount Carmel'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 3,
  weekTitle: 'Jacob, Joseph & God\'s Faithfulness',
    books: 'Genesis',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What new name did God give Jacob after he wrestled with the angel?',
        options: ['Judah', 'Israel', 'Levi'],
        answerIndex: 1,
      },
      {
        question: 'How many pieces of silver was Joseph sold for by his brothers?',
        options: ['10', '20', '30'],
        answerIndex: 1,
      },
      {
        question: 'What was Joseph\'s role in Egypt after interpreting Pharaoh\'s dreams?',
        options: ['High Priest', 'Second-in-command', 'Chief soldier'],
        answerIndex: 1,
      },
      {
        question: 'What did Joseph\'s dreams in Genesis 37 symbolise?',
        options: ['Seven years of famine', 'His brothers bowing to him', 'Egypt\'s defeat'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 4,
  weekTitle: 'Moses & the Exodus from Egypt',
    books: 'Exodus',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What was the name of Moses\' father-in-law?',
        options: ['Aaron', 'Jethro', 'Pharaoh'],
        answerIndex: 1,
      },
      {
        question: 'How many plagues were sent upon Egypt?',
        options: ['7', '10', '12'],
        answerIndex: 1,
      },
      {
        question: 'What body of water did the Israelites cross on dry ground?',
        options: ['Jordan River', 'Red Sea', 'Nile River'],
        answerIndex: 1,
      },
      {
        question: 'On which mountain did God give Moses the Ten Commandments?',
        options: ['Mount Carmel', 'Mount Zion', 'Mount Sinai'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 5,
  weekTitle: 'The Law & the Tabernacle',
    books: 'Exodus',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What did the Israelites worship while Moses was on the mountain?',
        options: ['A golden calf', 'An idol of Pharaoh', 'A silver serpent'],
        answerIndex: 0,
      },
      {
        question: 'What was placed inside the Ark of the Covenant?',
        options: ['The scrolls of Moses', 'The tablets of the Law', 'The priestly garments'],
        answerIndex: 1,
      },
      {
        question: 'What covered the Tabernacle when it was completed?',
        options: ['A mighty wind', 'A cloud and the glory of the Lord', 'A pillar of fire only'],
        answerIndex: 1,
      },
      {
        question: 'Who was appointed as the first High Priest of Israel?',
        options: ['Moses', 'Aaron', 'Joshua'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 6,
  weekTitle: 'Holiness & Sacrifice — Leviticus',
    books: 'Leviticus',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What is the central command repeated in Leviticus about God\'s holiness?',
        options: ['"Love your neighbour"', '"Be holy, for I am holy"', '"Seek the Lord always"'],
        answerIndex: 1,
      },
      {
        question: 'What was the Day of Atonement called in Hebrew?',
        options: ['Shabbat', 'Yom Kippur', 'Passover'],
        answerIndex: 1,
      },
      {
        question: 'What happened to Nadab and Abihu when they offered unauthorised fire?',
        options: ['They were exiled', 'Fire came out and consumed them', 'They were forgiven'],
        answerIndex: 1,
      },
      {
        question: 'What is the Year of Jubilee in Leviticus 25?',
        options: ['A year of fasting', 'Every 50th year — freedom and land return', 'The year of first harvest'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 7,
  weekTitle: 'The Wilderness — Numbers 1–20',
    books: 'Numbers',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'How many spies were sent into Canaan?',
        options: ['7', '10', '12'],
        answerIndex: 2,
      },
      {
        question: 'Which two spies gave a faithful report and urged Israel to trust God?',
        options: ['Moses and Aaron', 'Caleb and Joshua', 'Gad and Reuben'],
        answerIndex: 1,
      },
      {
        question: 'What happened to Miriam when she spoke against Moses?',
        options: ['She was exiled', 'She became leprous', 'She was struck mute'],
        answerIndex: 1,
      },
      {
        question: 'Because of their unbelief, how many years did Israel wander in the wilderness?',
        options: ['20 years', '40 years', '50 years'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 8,
  weekTitle: 'Numbers 21–36 & The Final Charge',
    books: 'Numbers / Deuteronomy',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What did God tell Moses to make so the people bitten by snakes could be healed?',
        options: ['A bronze serpent on a pole', 'A lamb sacrifice', 'A jar of healing water'],
        answerIndex: 0,
      },
      {
        question: 'Who was the prophet hired by Balak to curse Israel?',
        options: ['Elijah', 'Balaam', 'Nathan'],
        answerIndex: 1,
      },
      {
        question: 'Who succeeded Moses as leader of Israel?',
        options: ['Caleb', 'Aaron', 'Joshua'],
        answerIndex: 2,
      },
      {
        question: 'What was the greatest commandment Moses repeated in Deuteronomy 6?',
        options: ['"Do not murder"', '"Love the Lord your God with all your heart"', '"Keep the Sabbath"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 9,
  weekTitle: 'Deuteronomy — Remember & Obey',
    books: 'Deuteronomy',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What does Moses say will happen if Israel fully obeys God\'s commands? (Deuteronomy 28)',
        options: ['They will be hidden from enemies', 'Blessings will overtake them', 'They will receive more land'],
        answerIndex: 1,
      },
      {
        question: 'Where did Moses die?',
        options: ['In Canaan', 'In Egypt', 'In the land of Moab'],
        answerIndex: 2,
      },
      {
        question: 'Who buried Moses according to Deuteronomy 34?',
        options: ['Joshua', 'The Lord Himself', 'The elders of Israel'],
        answerIndex: 1,
      },
      {
        question: 'At what age did Moses die?',
        options: ['100', '120', '150'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 10,
  weekTitle: 'Joshua — Taking the Promised Land',
    books: 'Joshua',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Who hid the Israelite spies in Jericho?',
        options: ['Deborah', 'Rahab', 'Ruth'],
        answerIndex: 1,
      },
      {
        question: 'How did the walls of Jericho fall?',
        options: ['The army attacked with battering rams', 'God caused an earthquake', 'The people marched and shouted'],
        answerIndex: 2,
      },
      {
        question: 'Which Israelite caused defeat at Ai by taking forbidden plunder from Jericho?',
        options: ['Zimri', 'Achan', 'Korah'],
        answerIndex: 1,
      },
      {
        question: 'What was Joshua\'s famous final charge to Israel?',
        options: ['"Fear not the nations"', '"Choose this day whom you will serve"', '"Keep the law of Moses"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 11,
  weekTitle: 'Judges & Ruth — Cycles & Faithfulness',
    books: 'Judges / Ruth',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What is the repeated pattern in the book of Judges?',
        options: ['War, peace, war', 'Sin, punishment, repentance, deliverance', 'Worship, sacrifice, blessing'],
        answerIndex: 1,
      },
      {
        question: 'Who was the only female judge in Israel?',
        options: ['Miriam', 'Deborah', 'Esther'],
        answerIndex: 1,
      },
      {
        question: 'Samson\'s strength was linked to what?',
        options: ['His sword', 'His uncut hair', 'His prayer life'],
        answerIndex: 1,
      },
      {
        question: 'Ruth\'s famous declaration of loyalty was made to whom?',
        options: ['Boaz', 'Naomi', 'Orpah'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 12,
  weekTitle: '1 Samuel — From Judges to Kings',
    books: '1 Samuel',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Who was Samuel\'s mother, who dedicated him to the Lord?',
        options: ['Deborah', 'Hannah', 'Miriam'],
        answerIndex: 1,
      },
      {
        question: 'Who was Israel\'s first king?',
        options: ['David', 'Solomon', 'Saul'],
        answerIndex: 2,
      },
      {
        question: 'How did the young David defeat Goliath?',
        options: ['With a sword', 'With a sling and a stone', 'With a spear'],
        answerIndex: 1,
      },
      {
        question: 'What was the name of Saul\'s son who became David\'s closest friend?',
        options: ['Absalom', 'Jonathan', 'Ishbosheth'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 13,
  weekTitle: '2 Samuel — The Reign of David',
    books: '2 Samuel',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Which city did David capture and make his capital?',
        options: ['Hebron', 'Jerusalem', 'Bethlehem'],
        answerIndex: 1,
      },
      {
        question: 'What was the name of Bathsheba\'s husband whom David had killed?',
        options: ['Joab', 'Uriah', 'Nathan'],
        answerIndex: 1,
      },
      {
        question: 'Which prophet confronted David about his sin with Bathsheba?',
        options: ['Elijah', 'Isaiah', 'Nathan'],
        answerIndex: 2,
      },
      {
        question: 'What is the Davidic Covenant in 2 Samuel 7?',
        options: ['God promises David will never sin again', 'God promises David\'s throne will be established forever', 'God promises to give David all of Canaan'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 14,
  weekTitle: '1 Kings — Solomon\'s Wisdom & the Kingdom Divides',
    books: '1 Kings',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What did Solomon ask God for when given the chance to ask for anything?',
        options: ['Long life and riches', 'An understanding heart and wisdom', 'Victory over his enemies'],
        answerIndex: 1,
      },
      {
        question: 'What great structure did Solomon build for God?',
        options: ['The Tabernacle', 'The Temple in Jerusalem', 'The Ark of the Covenant'],
        answerIndex: 1,
      },
      {
        question: 'What caused the kingdom to split after Solomon\'s death?',
        options: ['A foreign invasion', 'A dispute over taxes and heavy labour', 'Solomon\'s will was contested'],
        answerIndex: 1,
      },
      {
        question: 'Who was the prophet who challenged the prophets of Baal on Mount Carmel?',
        options: ['Elisha', 'Elijah', 'Isaiah'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 15,
  weekTitle: '2 Kings — The Fall of Israel & Judah',
    books: '2 Kings',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'How did Elijah leave earth at the end of his life?',
        options: ['He died peacefully in his sleep', 'He was taken up in a chariot of fire', 'He was buried by God like Moses'],
        answerIndex: 1,
      },
      {
        question: 'Naaman was healed of leprosy after washing how many times in the Jordan River?',
        options: ['3', '5', '7'],
        answerIndex: 2,
      },
      {
        question: 'Which empire conquered the Northern Kingdom of Israel?',
        options: ['Babylon', 'Assyria', 'Persia'],
        answerIndex: 1,
      },
      {
        question: 'Which empire destroyed Jerusalem and took Judah into exile?',
        options: ['Assyria', 'Egypt', 'Babylon'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 16,
  weekTitle: '1 & 2 Chronicles — God\'s Perspective on History',
    books: '1 Chronicles / 2 Chronicles',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What does Chronicles emphasise more than the books of Samuel and Kings?',
        options: ['Military victories', 'Worship and the Temple', 'The role of women'],
        answerIndex: 1,
      },
      {
        question: 'Who was forbidden to build the Temple because he was a "man of war"?',
        options: ['Solomon', 'David', 'Joab'],
        answerIndex: 1,
      },
      {
        question: 'Which king of Judah had the longest reign of 55 years?',
        options: ['Hezekiah', 'Josiah', 'Manasseh'],
        answerIndex: 2,
      },
      {
        question: 'What did King Josiah find in the Temple that led to a great revival?',
        options: ['The Ark of the Covenant', 'The Book of the Law', 'Elijah\'s mantle'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 17,
  weekTitle: 'Ezra, Nehemiah & Esther — Return & Restoration',
    books: 'Ezra / Nehemiah / Esther',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Which Persian king allowed the Jews to return to Jerusalem and rebuild the Temple?',
        options: ['Darius', 'Cyrus', 'Artaxerxes'],
        answerIndex: 1,
      },
      {
        question: 'Nehemiah was cupbearer to which king before leading the rebuilding of Jerusalem\'s walls?',
        options: ['Cyrus', 'Artaxerxes', 'Xerxes'],
        answerIndex: 1,
      },
      {
        question: 'How long did it take Nehemiah and the people to rebuild the walls of Jerusalem?',
        options: ['52 days', '120 days', '1 year'],
        answerIndex: 0,
      },
      {
        question: 'Queen Esther\'s bravery saved the Jewish people from which villain\'s plan?',
        options: ['Sanballat', 'Haman', 'Tobiah'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 18,
  weekTitle: 'Job — Suffering & the Sovereignty of God',
    books: 'Job',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'How does God describe Job at the start of the book?',
        options: ['"A man of great wealth"', '"Blameless and upright, fearing God and shunning evil"', '"The wisest man in the East"'],
        answerIndex: 1,
      },
      {
        question: 'How many friends came to "comfort" Job in his suffering?',
        options: ['2', '3', '4'],
        answerIndex: 1,
      },
      {
        question: 'What was the central accusation Job\'s friends made against him?',
        options: ['That he had not prayed enough', 'That he must have sinned to deserve such suffering', 'That he was lying about his suffering'],
        answerIndex: 1,
      },
      {
        question: 'Job\'s famous declaration of faith is found in Job 19. What does he declare?',
        options: ['"Though He slay me, I will trust Him"', '"I know that my Redeemer lives"', '"God is good even in the storm"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 19,
  weekTitle: 'Job — God Speaks from the Whirlwind',
    books: 'Job',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'From where does God answer Job?',
        options: ['A burning bush', 'A still small voice', 'A whirlwind'],
        answerIndex: 2,
      },
      {
        question: 'What does God\'s speech to Job focus on?',
        options: ['Job\'s specific sins', 'The vastness of creation and God\'s wisdom', 'The future of Israel'],
        answerIndex: 1,
      },
      {
        question: 'At the end of the book, God was angry with which of Job\'s friends?',
        options: ['Elihu', 'All three of them — Eliphaz, Bildad, and Zophar', 'Only Bildad'],
        answerIndex: 1,
      },
      {
        question: 'How did God restore Job at the end?',
        options: ['God gave him back exactly what he lost', 'God gave him twice as much as he had before', 'God gave him a long life but no wealth'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 20,
  weekTitle: 'Psalms 1–50 — Songs of the Heart',
    books: 'Psalms',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Psalm 23 begins with which famous declaration?',
        options: ['"God is our refuge and strength"', '"The Lord is my shepherd"', '"Blessed is the man who trusts in God"'],
        answerIndex: 1,
      },
      {
        question: 'Which Psalm opens with the words Jesus quoted on the cross: "My God, My God, why have You forsaken Me?"',
        options: ['Psalm 22', 'Psalm 31', 'Psalm 46'],
        answerIndex: 0,
      },
      {
        question: 'Psalm 1 compares the righteous man to what?',
        options: ['A mountain that cannot be moved', 'A tree planted by rivers of water', 'A lion that fears nothing'],
        answerIndex: 1,
      },
      {
        question: 'Who wrote the majority of the Psalms?',
        options: ['Solomon', 'Moses', 'David'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 21,
  weekTitle: 'Psalms 51–100 — Confession, Praise & Trust',
    books: 'Psalms',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Psalm 51 was written by David after which sin was exposed?',
        options: ['He murdered Nabal', 'His sin with Bathsheba', 'He disobeyed God at Gilgal'],
        answerIndex: 1,
      },
      {
        question: 'Which Psalm declares "He who dwells in the shelter of the Most High will rest in the shadow of the Almighty"?',
        options: ['Psalm 84', 'Psalm 91', 'Psalm 100'],
        answerIndex: 1,
      },
      {
        question: 'Psalm 90 was written by which figure?',
        options: ['David', 'Solomon', 'Moses'],
        answerIndex: 2,
      },
      {
        question: 'What does Psalm 100 call all the earth to do?',
        options: ['Fear the Lord', 'Shout joyfully to the Lord', 'Seek His face always'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 22,
  weekTitle: 'Psalms 101–150 — From Lament to Praise',
    books: 'Psalms',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Psalm 119 is the longest chapter in the Bible. What is its central theme?',
        options: ['The greatness of God\'s creation', 'The love of God\'s Word and Law', 'God\'s faithfulness through history'],
        answerIndex: 1,
      },
      {
        question: 'Which Psalm says "I lift up my eyes to the hills — where does my help come from? My help comes from the Lord"?',
        options: ['Psalm 118', 'Psalm 121', 'Psalm 139'],
        answerIndex: 1,
      },
      {
        question: 'Psalm 139 celebrates what truth about God?',
        options: ['God\'s power over nations', 'God\'s complete knowledge of and presence with each person', 'God\'s anger against the wicked'],
        answerIndex: 1,
      },
      {
        question: 'How does the Psalter (book of Psalms) end?',
        options: ['With a lament', 'With Psalm 150 — a call for everything with breath to praise the Lord', 'With a Messianic prophecy'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 23,
  weekTitle: 'Proverbs — The Way of Wisdom',
    books: 'Proverbs',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What is the "beginning of wisdom" according to Proverbs?',
        options: ['Love for others', 'The fear of the Lord', 'Study of the scriptures'],
        answerIndex: 1,
      },
      {
        question: 'Proverbs 3:5-6 says to trust in the Lord with all your heart, and not lean on your own understanding. What will He do?',
        options: ['Give you wealth', 'Make your paths straight', 'Grant you long life'],
        answerIndex: 1,
      },
      {
        question: 'Proverbs 31 describes what?',
        options: ['The qualities of a king', 'The virtuous wife', 'The wise student'],
        answerIndex: 1,
      },
      {
        question: 'Who is credited with writing most of the Proverbs?',
        options: ['David', 'Agur', 'Solomon'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 24,
  weekTitle: 'Ecclesiastes & Song of Solomon',
    books: 'Ecclesiastes / Song of Solomon',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What word does Ecclesiastes use to describe life "under the sun" without God?',
        options: ['"Darkness"', '"Vanity"', '"Foolishness"'],
        answerIndex: 1,
      },
      {
        question: 'What is the conclusion of Ecclesiastes? (Chapter 12)',
        options: ['"Seek riches and live well"', '"Fear God and keep His commandments"', '"Rest and do not strive"'],
        answerIndex: 1,
      },
      {
        question: 'What is the Song of Solomon primarily about?',
        options: ['Wisdom for daily life', 'The love between a bride and bridegroom', 'Israel\'s history of faithfulness'],
        answerIndex: 1,
      },
      {
        question: 'Which famous verse in Ecclesiastes says there is "a time for every purpose under heaven"?',
        options: ['Ecclesiastes 1:2', 'Ecclesiastes 3:1', 'Ecclesiastes 12:13'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 25,
  weekTitle: 'Isaiah 1–35 — Judgment & Hope',
    books: 'Isaiah',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'In Isaiah 6, what did Isaiah see in his vision of God?',
        options: ['The Lord on a throne, high and lifted up, surrounded by seraphim', 'A consuming fire on a mountain', 'The Lord walking in a garden'],
        answerIndex: 0,
      },
      {
        question: 'Isaiah 9:6 prophesies the birth of a child called by four names. Which is NOT one of them?',
        options: ['Wonderful Counsellor', 'Mighty God', 'The Righteous Branch'],
        answerIndex: 2,
      },
      {
        question: 'Isaiah 11 describes the coming Messiah\'s reign. What will characterise it?',
        options: ['Military conquest', 'Justice, righteousness and peace', 'Restoration of the Temple'],
        answerIndex: 1,
      },
      {
        question: 'Which Assyrian king threatened Jerusalem during Isaiah\'s time?',
        options: ['Nebuchadnezzar', 'Sennacherib', 'Cyrus'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 26,
  weekTitle: 'Isaiah 36–66 — The Suffering Servant',
    books: 'Isaiah',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Isaiah 40:31 promises that those who wait on the Lord will do what?',
        options: ['Receive great wealth', 'Mount up with wings like eagles', 'Be victorious in battle'],
        answerIndex: 1,
      },
      {
        question: 'Isaiah 53 describes the Suffering Servant. What does verse 5 say about His wounds?',
        options: ['"By His wounds justice was done"', '"By His wounds we are healed"', '"By His wounds the enemy was defeated"'],
        answerIndex: 1,
      },
      {
        question: 'Isaiah 55:8 records God saying what about His thoughts and ways compared to ours?',
        options: ['"My ways are just, yours are not"', '"My thoughts are not your thoughts, nor My ways your ways"', '"My word will accomplish what I intend"'],
        answerIndex: 1,
      },
      {
        question: 'Isaiah 61:1 — later quoted by Jesus in Luke 4 — begins with what declaration?',
        options: ['"The Spirit of the Lord God is upon Me"', '"The Lord has anointed Me to reign"', '"I am the Lord, there is no other"'],
        answerIndex: 0,
      },
    ],
  },

  {
    weekNumber: 27,
  weekTitle: 'Jeremiah — The Weeping Prophet',
    books: 'Jeremiah',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Why is Jeremiah called "The Weeping Prophet"?',
        options: ['He was constantly afraid', 'He wept over the sin and coming judgment of Judah', 'He was rejected by his family'],
        answerIndex: 1,
      },
      {
        question: 'Jeremiah 17:9 says the heart is what?',
        options: ['"Good when trained"', '"Deceitful above all things"', '"A gift from God"'],
        answerIndex: 1,
      },
      {
        question: 'Jeremiah 29:11 contains a famous promise. What does God promise?',
        options: ['To give Israel victory over Babylon', '"Plans to prosper you, not to harm you — plans for a future and a hope"', 'To restore the Temple within 70 days'],
        answerIndex: 1,
      },
      {
        question: 'How long did God say the exile in Babylon would last? (Jeremiah 25)',
        options: ['40 years', '70 years', '100 years'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 28,
  weekTitle: 'Jeremiah 30–52 & Lamentations',
    books: 'Jeremiah / Lamentations',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Jeremiah 31:31 promises a New Covenant. Where will God write this covenant?',
        options: ['On stone tablets', 'On their hearts', 'In the Temple'],
        answerIndex: 1,
      },
      {
        question: 'What did Jeremiah do as an act of faith while Jerusalem was about to fall?',
        options: ['He fled to Egypt', 'He bought a field as a sign that life would return to the land', 'He burned the Temple scrolls'],
        answerIndex: 1,
      },
      {
        question: 'What is the book of Lamentations about?',
        options: ['The fall of Babylon', 'Jeremiah mourning the destruction of Jerusalem', 'The suffering of the exiles in Babylon'],
        answerIndex: 1,
      },
      {
        question: 'Lamentations 3:22-23 contains a famous expression of hope. What does it say?',
        options: ['"God will avenge us of our enemies"', '"His compassions never fail; they are new every morning"', '"Wait on the Lord and He will act"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 29,
  weekTitle: 'Ezekiel — Visions & the Glory of God',
    books: 'Ezekiel',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Ezekiel\'s vision in chapter 37 is known as the Valley of what?',
        options: ['Living Water', 'Dry Bones', 'Fire and Glory'],
        answerIndex: 1,
      },
      {
        question: 'What did the valley of dry bones represent in Ezekiel\'s vision?',
        options: ['The armies of Babylon', 'The whole house of Israel in exile', 'The dead who would be resurrected at the end'],
        answerIndex: 1,
      },
      {
        question: 'In Ezekiel 36:26, God promises to give Israel what instead of a heart of stone?',
        options: ['A spirit of boldness', 'A heart of flesh', 'A new law'],
        answerIndex: 1,
      },
      {
        question: 'Ezekiel 47 describes a river flowing from the Temple. What does it represent?',
        options: ['The River Jordan', 'Life-giving water bringing renewal everywhere it flows', 'The sea of judgment'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 30,
  weekTitle: 'Daniel — Faith Under Fire',
    books: 'Daniel',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What did Daniel and his friends refuse to eat in Babylon?',
        options: ['Food sacrificed to idols', 'The king\'s rich food and wine', 'Meat not slaughtered according to the Law'],
        answerIndex: 1,
      },
      {
        question: 'Shadrach, Meshach, and Abednego were thrown into the fiery furnace for refusing to do what?',
        options: ['Stop praying', 'Bow to a golden statue', 'Eat the king\'s food'],
        answerIndex: 1,
      },
      {
        question: 'Daniel 6 — why was Daniel thrown into the lions\' den?',
        options: ['He refused to eat the king\'s food', 'He continued to pray to God three times a day despite a royal decree', 'He interpreted a dream unfavourably'],
        answerIndex: 1,
      },
      {
        question: 'Daniel 9 contains Daniel\'s great prayer. What is its main theme?',
        options: ['A request for personal protection', 'Confession of sin on behalf of Israel and a plea for restoration', 'A vision of the end times'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 31,
  weekTitle: 'The Minor Prophets I — Hosea to Amos',
    books: 'Hosea / Joel / Amos',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What did God ask Hosea to do that became a picture of God\'s love for Israel?',
        options: ['Build an altar', 'Marry an unfaithful woman and love her still', 'Preach to the nations'],
        answerIndex: 1,
      },
      {
        question: 'Joel 2:28 prophesies that God will pour out His Spirit on whom?',
        options: ['The priests of Israel only', 'All flesh — sons, daughters, old and young', 'The faithful remnant of Judah'],
        answerIndex: 1,
      },
      {
        question: 'Amos was a prophet who came from which occupation?',
        options: ['A priest', 'A shepherd and a farmer of fig trees', 'A scribe'],
        answerIndex: 1,
      },
      {
        question: 'What does Amos 5:24 famously say should "roll down like waters"?',
        options: ['Peace and prosperity', 'Justice and righteousness', 'Praise and worship'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 32,
  weekTitle: 'The Minor Prophets II — Obadiah to Zephaniah',
    books: 'Obadiah / Jonah / Micah / Nahum / Habakkuk / Zephaniah',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Why did Jonah initially refuse to go to Nineveh?',
        options: ['He was afraid of the journey', 'He did not want the Ninevites to repent and be forgiven', 'He could not speak their language'],
        answerIndex: 1,
      },
      {
        question: 'Micah 6:8 says what the Lord requires of us. Which is NOT in the list?',
        options: ['To act justly', 'To sacrifice regularly', 'To walk humbly with God'],
        answerIndex: 1,
      },
      {
        question: 'Habakkuk 2:4 declares that "the righteous shall live by" what?',
        options: ['Works of the Law', 'Faith', 'The wisdom of God'],
        answerIndex: 1,
      },
      {
        question: 'Micah 5:2 prophecies the birthplace of the coming ruler of Israel. Which city?',
        options: ['Jerusalem', 'Nazareth', 'Bethlehem'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 33,
  weekTitle: 'The Minor Prophets III — Haggai, Zechariah & Malachi',
    books: 'Haggai / Zechariah / Malachi',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'What was Haggai\'s main message to the returned exiles?',
        options: ['Return to God and stop sinning', 'Rebuild the Temple — stop neglecting the house of God', 'Trust God through the famine'],
        answerIndex: 1,
      },
      {
        question: 'Zechariah 9:9 prophesies that the coming king will enter Jerusalem riding on what?',
        options: ['A white horse', 'A donkey', 'A chariot of fire'],
        answerIndex: 1,
      },
      {
        question: 'Malachi 3:10 contains a famous challenge regarding what?',
        options: ['Prayer and fasting', 'Tithes — "Bring the whole tithe into the storehouse"', 'Sabbath observance'],
        answerIndex: 1,
      },
      {
        question: 'Malachi is the last book of the Old Testament. How many years of prophetic silence followed before the New Testament?',
        options: ['200 years', '400 years', '600 years'],
        answerIndex: 1,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEW TESTAMENT
  // ─────────────────────────────────────────────────────────────────────────────

  {
    weekNumber: 34,
  weekTitle: 'Matthew 1–14 — The King Has Come',
    books: 'Matthew',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'The Sermon on the Mount begins with the Beatitudes. Which group does Jesus say will "inherit the earth"?',
        options: ['The pure in heart', 'The meek', 'The merciful'],
        answerIndex: 1,
      },
      {
        question: 'What prayer did Jesus teach His disciples in Matthew 6?',
        options: ['The Aaronic Blessing', 'The Lord\'s Prayer', 'The High Priestly Prayer'],
        answerIndex: 1,
      },
      {
        question: 'What happened to John the Baptist in Matthew 14?',
        options: ['He was imprisoned and released', 'He was beheaded at Herod\'s command', 'He ascended to heaven'],
        answerIndex: 1,
      },
      {
        question: 'In Matthew 14, Jesus walked on water. Which disciple also attempted to walk on water?',
        options: ['John', 'Peter', 'Andrew'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 35,
  weekTitle: 'Matthew 15–28 — The Passion of the King',
    books: 'Matthew',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Who did Jesus say He was when He asked "Who do you say I am?" (Matthew 16)?',
        options: ['The Son of David', 'The Christ, the Son of the living God — Peter\'s answer', 'The Prophet promised by Moses'],
        answerIndex: 1,
      },
      {
        question: 'What happened to Jesus on the Mount of Transfiguration?',
        options: ['He was baptised by John', 'His face shone like the sun and His clothes became white as light', 'He prayed in agony in the garden'],
        answerIndex: 1,
      },
      {
        question: 'Who betrayed Jesus for thirty pieces of silver?',
        options: ['Pontius Pilate', 'Judas Iscariot', 'Caiaphas'],
        answerIndex: 1,
      },
      {
        question: 'The Great Commission in Matthew 28:19 commands disciples to do what?',
        options: ['Go into all the world and preach', 'Go and make disciples of all nations, baptising them', 'Wait in Jerusalem for the Spirit'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 36,
  weekTitle: 'Mark — The Servant Who Acts',
    books: 'Mark',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Mark is the shortest Gospel. What is its most distinctive feature in narration?',
        options: ['Long teaching discourses', 'Immediate action — "immediately" appears over 40 times', 'Many Old Testament quotations'],
        answerIndex: 1,
      },
      {
        question: 'Who is Mark\'s primary audience believed to be?',
        options: ['Jewish believers', 'Roman readers', 'Greek philosophers'],
        answerIndex: 1,
      },
      {
        question: 'In Mark 10, Jesus says "the Son of Man did not come to be served but" to do what?',
        options: ['To teach and to preach', 'To serve and to give His life as a ransom for many', 'To heal and to restore'],
        answerIndex: 1,
      },
      {
        question: 'Mark 16:15 — what is the commission Jesus gives?',
        options: ['"Teach all nations"', '"Go into all the world and preach the gospel to all creation"', '"Wait for the Helper"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 37,
  weekTitle: 'Luke 1–13 — The Son of Man',
    books: 'Luke',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Luke was written by whom and addressed to whom?',
        options: ['Matthew, addressed to Jewish readers', 'Luke the physician, addressed to Theophilus', 'John, addressed to the seven churches'],
        answerIndex: 1,
      },
      {
        question: 'The Parable of the Good Samaritan is only found in which Gospel?',
        options: ['Matthew', 'John', 'Luke'],
        answerIndex: 2,
      },
      {
        question: 'In Luke 4, Jesus read from Isaiah in the synagogue and declared: "Today this scripture is" what?',
        options: ['"Revealed to you"', '"Fulfilled in your hearing"', '"Written for your generation"'],
        answerIndex: 1,
      },
      {
        question: 'The famous prayer of Mary (The Magnificat) is found in Luke 1. What prompted it?',
        options: ['Gabriel\'s visit', 'Her visit to Elizabeth after both had received miraculous news', 'The birth of Jesus'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 38,
  weekTitle: 'Luke 14–24 — The Cross & Resurrection',
    books: 'Luke',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Which three parables in Luke 15 all share the theme of something lost being found?',
        options: ['Lost sheep, lost coin, lost son', 'Lost sheep, lost coin, lost pearl', 'Prodigal son, lost coin, barren fig tree'],
        answerIndex: 0,
      },
      {
        question: 'Zacchaeus was a tax collector who climbed a tree to see Jesus. What did Jesus say to him?',
        options: ['"Your sins are forgiven — go in peace"', '"Come down; today I must stay at your house"', '"Give half to the poor and follow Me"'],
        answerIndex: 1,
      },
      {
        question: 'What did the two disciples on the road to Emmaus experience in Luke 24?',
        options: ['They saw Jesus ascend into heaven', 'The risen Jesus walked with them and revealed Himself in the breaking of bread', 'They received the Holy Spirit'],
        answerIndex: 1,
      },
      {
        question: 'Luke 24:49 ends with Jesus telling His disciples to wait in Jerusalem for what?',
        options: ['The return of the Messiah', 'The promise of the Father — power from on high', 'The rebuilding of the Temple'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 39,
  weekTitle: 'John 1–11 — The Word Made Flesh',
    books: 'John',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'John 3:16 — what does God give so that "whoever believes shall not perish but have eternal life"?',
        options: ['The Law and the Prophets', 'His only begotten Son', 'The gift of the Holy Spirit'],
        answerIndex: 1,
      },
      {
        question: 'At the wedding at Cana, what was Jesus\' first recorded miracle?',
        options: ['Healing a blind man', 'Turning water into wine', 'Feeding five thousand'],
        answerIndex: 1,
      },
      {
        question: 'In John 11, Jesus raised which friend from the dead after four days in the tomb?',
        options: ['Jairus', 'Lazarus', 'Nicodemus'],
        answerIndex: 1,
      },
      {
        question: 'Which of the seven "I AM" statements does Jesus make in John 10?',
        options: ['"I am the Bread of Life"', '"I am the Good Shepherd"', '"I am the True Vine"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 40,
  weekTitle: 'John 12–21 & Acts 1–7 — The Upper Room & the Early Church',
    books: 'John / Acts',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'In John 14:6, Jesus makes which "I AM" statement?',
        options: ['"I am the Resurrection and the Life"', '"I am the Way, the Truth, and the Life"', '"I am the Light of the World"'],
        answerIndex: 1,
      },
      {
        question: 'John 15 contains which "I AM" statement about our relationship with Jesus?',
        options: ['"I am the Gate"', '"I am the True Vine"', '"I am the Bread of Life"'],
        answerIndex: 1,
      },
      {
        question: 'The Holy Spirit fell on the disciples at Pentecost in Acts 2. What was the external sign?',
        options: ['A great earthquake', 'A sound like rushing wind and tongues of fire', 'A pillar of cloud'],
        answerIndex: 1,
      },
      {
        question: 'Stephen, the first Christian martyr, was killed by what method in Acts 7?',
        options: ['Beheading', 'Stoning', 'Crucifixion'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 41,
  weekTitle: 'Acts 8–28 — The Gospel Goes to the Ends of the Earth',
    books: 'Acts',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Saul\'s dramatic conversion happened on the road to which city?',
        options: ['Jerusalem', 'Damascus', 'Antioch'],
        answerIndex: 1,
      },
      {
        question: 'Who was the Gentile centurion who was the first non-Jew to receive the Holy Spirit in Acts 10?',
        options: ['Cornelius', 'Lydia', 'Sergius Paulus'],
        answerIndex: 0,
      },
      {
        question: 'Paul and Silas were imprisoned in Philippi. How were they freed?',
        options: ['The guards released them in the morning', 'A midnight earthquake broke their chains and opened the prison doors', 'An angel led them out invisibly'],
        answerIndex: 1,
      },
      {
        question: 'Acts ends with Paul in which city, preaching the gospel boldly?',
        options: ['Jerusalem', 'Athens', 'Rome'],
        answerIndex: 2,
      },
    ],
  },

  {
    weekNumber: 42,
  weekTitle: 'Romans — The Gospel Explained',
    books: 'Romans',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Romans 1:16 — Paul says he is not ashamed of the gospel because it is what?',
        options: ['"The hope of salvation"', '"The power of God for salvation to everyone who believes"', '"The righteousness of God revealed"'],
        answerIndex: 1,
      },
      {
        question: 'Romans 3:23 declares that "all have sinned and fall short of" what?',
        options: ['The Law of Moses', 'God\'s standard', 'The glory of God'],
        answerIndex: 2,
      },
      {
        question: 'Romans 8:28 promises that for those who love God, all things work together for what?',
        options: ['Prosperity', 'Good', 'Their rescue'],
        answerIndex: 1,
      },
      {
        question: 'Romans 12:1 calls believers to present themselves as what kind of sacrifice?',
        options: ['A daily fast', 'A living sacrifice, holy and pleasing to God', 'A sacrifice of praise and thanksgiving'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 43,
  weekTitle: '1 & 2 Corinthians — Love & the Church',
    books: '1 Corinthians / 2 Corinthians',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'The "Love Chapter" is 1 Corinthians 13. What does Paul say love NEVER does?',
        options: ['Give up, trust or hope', 'Fail', 'Both A and B'],
        answerIndex: 1,
      },
      {
        question: '1 Corinthians 15 is about the resurrection. What does Paul say is "swallowed up in victory"?',
        options: ['Sin', 'Death', 'The Law'],
        answerIndex: 1,
      },
      {
        question: 'Paul\'s "thorn in the flesh" is mentioned in which letter?',
        options: ['Romans', '2 Corinthians', '1 Corinthians'],
        answerIndex: 1,
      },
      {
        question: '2 Corinthians 5:17 declares that if anyone is in Christ they are what?',
        options: ['Justified and holy', 'A new creation', 'Sealed with the Spirit'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 44,
  weekTitle: 'Galatians, Ephesians, Philippians & Colossians',
    books: 'Galatians / Ephesians / Philippians / Colossians',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Galatians 2:20 — Paul declares "I have been crucified with Christ." Who now lives in him?',
        options: ['The Spirit of the Law', 'Christ', 'The new man'],
        answerIndex: 1,
      },
      {
        question: 'The Armour of God passage is found in which letter?',
        options: ['Colossians 3', 'Ephesians 6', 'Philippians 4'],
        answerIndex: 1,
      },
      {
        question: 'Philippians 4:13 — "I can do all things through" whom?',
        options: ['The Spirit who strengthens me', 'Christ who strengthens me', 'God who is with me'],
        answerIndex: 1,
      },
      {
        question: 'Colossians 3:2 instructs believers to set their minds on what?',
        options: ['The things of this world', 'Things above, not earthly things', 'Peace with all people'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 45,
  weekTitle: 'The Pastoral Letters — 1 & 2 Thessalonians, 1 & 2 Timothy, Titus, Philemon',
    books: '1 Thess / 2 Thess / 1 Tim / 2 Tim / Titus / Philemon',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: '1 Thessalonians 5:17 gives one of the shortest commands in the Bible. What is it?',
        options: ['"Rejoice always"', '"Pray without ceasing"', '"Give thanks in all things"'],
        answerIndex: 1,
      },
      {
        question: '2 Timothy 3:16 says all Scripture is what?',
        options: ['"True and eternal"', '"God-breathed and useful for teaching, rebuking, correcting and training in righteousness"', '"Holy and set apart by God"'],
        answerIndex: 1,
      },
      {
        question: 'What is the main theme of Paul\'s letter to Philemon?',
        options: ['Instructions for church leadership', 'A plea to receive back a runaway slave, Onesimus, as a brother', 'Warning against false teachers'],
        answerIndex: 1,
      },
      {
        question: 'Titus 2:11 says the grace of God has appeared doing what?',
        options: ['Judging the nations', 'Offering salvation to all people', 'Establishing the church'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 46,
  weekTitle: 'Hebrews — Jesus Is Greater',
    books: 'Hebrews',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Hebrews 11 is the great "Faith Chapter." How does it define faith?',
        options: ['"Confidence in God\'s promises"', '"The substance of things hoped for, the evidence of things not seen"', '"Trust that God will act"'],
        answerIndex: 1,
      },
      {
        question: 'Hebrews 4:12 describes the Word of God as what?',
        options: ['"Like a lamp unto our feet"', '"Living and active, sharper than any double-edged sword"', '"A consuming fire in the mouth of the prophet"'],
        answerIndex: 1,
      },
      {
        question: 'Hebrews 12:1 tells us to "throw off everything that hinders" and to do what?',
        options: ['Stand firm in battle', 'Run with endurance the race set before us', 'Resist the devil'],
        answerIndex: 1,
      },
      {
        question: 'Jesus is described as our High Priest in Hebrews. What makes His priesthood different from Aaron\'s?',
        options: ['He served in a physical Temple', 'His priesthood is eternal — after the order of Melchizedek', 'He offered a greater animal sacrifice'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 47,
  weekTitle: 'James & 1 Peter — Faith That Works & Hope Under Trial',
    books: 'James / 1 Peter',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'James 2:17 says that "faith without" what "is dead"?',
        options: ['Prayer', 'Works', 'Love'],
        answerIndex: 1,
      },
      {
        question: 'James 1:2-3 tells believers to "consider it pure joy" when they face what?',
        options: ['Times of prosperity', 'Trials of many kinds', 'Moments of doubt'],
        answerIndex: 1,
      },
      {
        question: '1 Peter 5:7 says to do what with all your anxiety?',
        options: ['Fight it with the Word', 'Cast it on God because He cares for you', 'Give it to your spiritual leaders'],
        answerIndex: 1,
      },
      {
        question: '1 Peter 2:9 calls believers a "royal" what?',
        options: ['Army', 'Priesthood', 'Kingdom'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 48,
  weekTitle: '2 Peter, 1-3 John & Jude — Truth, Love & Contending for the Faith',
    books: '2 Peter / 1 John / 2 John / 3 John / Jude',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: '1 John 1:9 — if we confess our sins, God is faithful and just to do what?',
        options: ['Remember them no more', 'Forgive us our sins and cleanse us from all unrighteousness', 'Remove them as far as the East is from the West'],
        answerIndex: 1,
      },
      {
        question: '1 John 4:8 declares that "God is" what?',
        options: ['Light', 'Love', 'Holy'],
        answerIndex: 1,
      },
      {
        question: 'Jude exhorts believers to "contend earnestly for" what?',
        options: ['Their inheritance', 'The faith once delivered to the saints', 'The return of Christ'],
        answerIndex: 1,
      },
      {
        question: '2 Peter 1:21 says prophecy never came by the will of man but by what?',
        options: ['The wisdom of the prophets', 'Holy men of God moved by the Holy Spirit', 'Visions and dreams of the night'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 49,
  weekTitle: 'Revelation 1–11 — The Risen Christ & the Seven Seals',
    books: 'Revelation',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Revelation 1:8 — Jesus declares He is the "Alpha and Omega," meaning what?',
        options: ['The first and the greatest', 'The beginning and the end', 'The King of kings'],
        answerIndex: 1,
      },
      {
        question: 'The seven letters in Revelation 2-3 are written to churches in which region?',
        options: ['Judea', 'Asia Minor', 'Greece'],
        answerIndex: 1,
      },
      {
        question: 'In Revelation 4-5, who alone is found worthy to open the scroll?',
        options: ['The angel Michael', 'The Lamb who was slain', 'One of the 24 elders'],
        answerIndex: 1,
      },
      {
        question: 'What is the seal for God\'s servants in Revelation 7?',
        options: ['They are given white robes', 'They are sealed on their foreheads', 'They receive a new name'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 50,
  weekTitle: 'Revelation 12–22 — Victory, New Creation & the Reign of God',
    books: 'Revelation',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Revelation 19 describes the Marriage Supper of the Lamb. Who is the Bride?',
        options: ['Israel', 'The Church', 'The Holy City'],
        answerIndex: 1,
      },
      {
        question: 'Revelation 21:4 says God will wipe away every what?',
        options: ['Sin and transgression', 'Tear from every eye', 'Memory of the old earth'],
        answerIndex: 1,
      },
      {
        question: 'In the new Jerusalem (Revelation 21-22), what is notably absent?',
        options: ['Angels', 'A Temple — because God and the Lamb are its Temple', 'The Holy Spirit'],
        answerIndex: 1,
      },
      {
        question: 'Revelation 22:20 — the last promise of the Bible. What does Jesus say?',
        options: ['"Behold, I am making all things new"', '"Surely I am coming quickly"', '"I am the Alpha and Omega"'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 51,
  weekTitle: 'Old Testament Recap — From Creation to Exile',
    books: 'Old Testament Review',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'Which Old Testament figure is described as "a man after God\'s own heart"?',
        options: ['Abraham', 'Moses', 'David'],
        answerIndex: 2,
      },
      {
        question: 'The three major divisions of the Old Testament are:',
        options: ['Law, Poetry, Prophecy', 'Law, History, Poetry and Prophecy', 'Torah, Talmud, Prophets'],
        answerIndex: 1,
      },
      {
        question: 'Which prophet predicted the exact city of Jesus\' birth centuries in advance?',
        options: ['Isaiah', 'Micah', 'Zechariah'],
        answerIndex: 1,
      },
      {
        question: 'The covenant God made with Abraham in Genesis 15 is often called what?',
        options: ['The Mosaic Covenant', 'The Abrahamic Covenant', 'The Davidic Covenant'],
        answerIndex: 1,
      },
    ],
  },

  {
    weekNumber: 52,
  weekTitle: 'New Testament Recap — The Gospel & the Life of Faith',
    books: 'New Testament Review',
    videoLinks: ['https://youtu.be/evbHWPSjeeo'],
    quizQuestions: [
      {
        question: 'The four Gospels are written by whom?',
        options: ['Peter, Paul, James and John', 'Matthew, Mark, Luke and John', 'Matthew, Mark, Luke and Acts'],
        answerIndex: 1,
      },
      {
        question: 'How many letters (epistles) are in the New Testament?',
        options: ['17', '21', '27'],
        answerIndex: 1,
      },
      {
        question: 'John 3:16 — the most quoted verse in the Bible. What does God give out of His love for the world?',
        options: ['The law and the prophets', 'His only begotten Son', 'Eternal life freely'],
        answerIndex: 1,
      },
      {
        question: 'The Bible opens with "In the beginning, God created" and ends with what promise?',
        options: ['"I am with you always"', '"Surely I am coming quickly"', '"Nothing can separate us from the love of God"'],
        answerIndex: 1,
      },
    ],
  },
];
