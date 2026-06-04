import { getFirestore } from 'firebase-admin/firestore';
import {
  sendWhatsAppMessage,
  sendQuizQuestion,
  sendQuizResponse,
  type QuizButtonPayload,
} from '../services/twilioService';
import { getQuestProgress, recordQuizScore } from '../services/questProgressService';
import {
  getQuizSession,
  startQuizSession,
  recordAnswer,
  clearQuizSession,
} from '../services/quizSessionService';
import { updateUserFields } from '../services/userService';
import type { User, QuestQuestion, QuestContent } from '../types/schemas';
import pino from 'pino';

const logger = pino();

// Letter labels for options A, B, C …
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const encouragement = (score: number, total: number): string => {
  const ratio = score / total;
  if (ratio === 1)   return `Perfect score! The Word is taking root in you. 🌱`;
  if (ratio >= 0.75) return `Well done. You are growing in the Word. 💪`;
  if (ratio >= 0.5)  return `Good effort. Keep reading and it will come. 📖`;
  if (ratio > 0)     return `Keep pressing in. The Word rewards those who seek. 🙏`;
  return `Don't be discouraged. Read it again slowly this week. 🌱`;
};

/**
 * Sends a quiz question as an interactive quick-reply message (3 buttons).
 * The options array must have exactly 3 items (our quiz always does).
 */
const sendQuestion = async (
  phone: string,
  q: QuestQuestion,
  questionIndex: number,
  total: number,
  bookTitle: string,
  week: number
): Promise<void> => {
  const options = q.options as [string, string, string];

  // Intro header only on Q1
  if (questionIndex === 0) {
    await sendWhatsAppMessage(
      phone,
      `📖 *Week ${week} Quiz — ${bookTitle}*\n\nFour questions. Tap your answer for each one.\n\nLet's begin.`
    );
  }

  const payload: QuizButtonPayload = {
    questionNumber: questionIndex + 1,
    totalQuestions: total,
    bookTitle,
    questionText: q.question,
    options,
  };

  await sendQuizQuestion(phone, payload);
};

// ─────────────────────────────────────────────────────────────────────────────
// Answer parsing — handles both button taps AND typed replies
//
//   Button tap  → Twilio sends ButtonPayload = "option_a" | "option_b" | "option_c"
//                 AND Body = "A — Option text"
//   Typed reply → Body = "B" | "B — Jethro" | "b"
//
// Returns 0-based index (0=A, 1=B, 2=C) or -1 if unrecognised.
// ─────────────────────────────────────────────────────────────────────────────

export const parseAnswerLetter = (raw: string, buttonPayload?: string): number => {
  // Button payload is authoritative — fastest path
  if (buttonPayload) {
    if (buttonPayload === 'option_a') return 0;
    if (buttonPayload === 'option_b') return 1;
    if (buttonPayload === 'option_c') return 2;
  }

  // Fallback: parse text "A", "B — Jethro", "b", "b - jethro"
  const trimmed = raw.trim().toUpperCase();
  const letterMatch = trimmed.match(/^([A-E])[^A-Z]?/);
  if (letterMatch) return LETTERS.indexOf(letterMatch[1]);

  return -1;
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — User texts "QUIZ"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles the QUIZ keyword.
 * - Not enrolled → prompt to join.
 * - Mid-quiz session → resume from current question.
 * - Otherwise → start a new session for this week, send Q1.
 */
export const triggerWeeklyQuiz = async (
  phone: string,
  user: Partial<User> | null
): Promise<void> => {
  if (!user || !user.name) {
    await sendWhatsAppMessage(phone, `Type *QUEST* to join the Bible-in-a-Year programme first. 📖`);
    return;
  }

  const questProgress = await getQuestProgress(phone);
  if (!questProgress || !questProgress.active) {
    await sendWhatsAppMessage(
      phone,
      `You haven't started The Quest yet. Type *QUEST* to begin. 📖`
    );
    return;
  }

  // Resume an existing in-progress session
  const existing = await getQuizSession(phone);
  if (existing) {
    const q = existing.questions[existing.questionIndex];
    await sendQuestion(
      phone,
      q,
      existing.questionIndex,
      existing.questions.length,
      existing.bookTitle,
      existing.week
    );
    return;
  }

  // Fetch questContent/{week} from Firestore
  const db = getFirestore();
  const week = questProgress.week;
  const contentDoc = await db.collection('questContent').doc(String(week)).get();

  if (!contentDoc.exists) {
    await sendWhatsAppMessage(
      phone,
      `The quiz for Week ${week} isn't ready yet. Check back soon! 📖`
    );
    return;
  }

  const content = contentDoc.data() as QuestContent;
  if (!content.quizQuestions || content.quizQuestions.length === 0) {
    await sendWhatsAppMessage(phone, `No quiz questions found for Week ${week}.`);
    return;
  }

  const bookTitle = content.weekTitle;
  const session = await startQuizSession(phone, week, bookTitle, content.quizQuestions);
  await updateUserFields(phone, { awaitingQuizAnswer: true } as Partial<User>);

  await sendQuestion(phone, session.questions[0], 0, session.questions.length, bookTitle, week);

  logger.info({ phone, week }, 'Quiz started — Q1 sent (interactive)');
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1…N — User taps a button or types their answer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles each answer during an active quiz session.
 *
 * @param phone         - E.164 phone number
 * @param rawText       - Twilio Body field (button label or typed text)
 * @param buttonPayload - Twilio ButtonPayload field ("option_a" | "option_b" | "option_c")
 *                        Present only when the user tapped a quick-reply button.
 */
export const handleQuizAnswer = async (
  phone: string,
  rawText: string,
  buttonPayload?: string
): Promise<void> => {
  const session = await getQuizSession(phone);
  if (!session) {
    // Edge case: awaitingQuizAnswer flag was left set with no session — reset
    await updateUserFields(phone, { awaitingQuizAnswer: false } as Partial<User>);
    return;
  }

  const current   = session.questions[session.questionIndex];
  const total     = session.questions.length;
  const answerIdx = parseAnswerLetter(rawText, buttonPayload);

  // Unrecognised input — re-send the current question as buttons
  if (answerIdx === -1) {
    await sendQuestion(
      phone,
      current,
      session.questionIndex,
      total,
      session.bookTitle,
      session.week
    );
    return;
  }

  const isCorrect     = answerIdx === current.answerIndex;
  const correctLetter = LETTERS[current.answerIndex];
  const correctText   = current.options[current.answerIndex];

  const feedback = isCorrect
    ? `✅ Correct.`
    : `❌ The answer was *${correctLetter} — ${correctText}*.`;

  // Record answer (increments questionIndex inside session)
  const updated  = await recordAnswer(phone, isCorrect);
  const nextIndex = updated.questionIndex;

  // ── More questions ────────────────────────────────────────────────────────
  if (nextIndex < total) {
    // Send feedback as plain text, then immediately send next question as buttons
    await sendQuizResponse(phone, feedback);
    await sendQuestion(
      phone,
      session.questions[nextIndex],
      nextIndex,
      total,
      session.bookTitle,
      session.week
    );
    logger.info({ phone, week: session.week, questionIndex: nextIndex }, 'Quiz answer recorded');
    return;
  }

  // ── Quiz complete ──────────────────────────────────────────────────────────
  const score = updated.score;
  const enc   = encouragement(score, total);

  await sendQuizResponse(
    phone,
    `${feedback}\n\n🎉 *Quiz complete.*\n\nYou scored *${score} out of ${total}*.\n\n${enc}\n\nWeek ${session.week + 1} begins Monday. 📖`
  );

  await recordQuizScore(phone, session.week, score, total);
  await clearQuizSession(phone);
  await updateUserFields(phone, { awaitingQuizAnswer: false } as Partial<User>);

  logger.info({ phone, week: session.week, score, total }, 'Quiz completed');
};
