/**
 * questContent/{weekNumber}
 *
 * Quest curriculum — one document per week (1-52).
 * The document ID is the week number as a string: "1", "2" … "52".
 */

export interface QuestContent {
  weekNumber: number;
  status: 'draft' | 'published';
  levelTracker?: string;
  weeklyChapterSpan?: string;
  weekIntro?: string;         // intro paragraph sent on QUEST enrollment or WATCH
  introImageUrl: string;      // MUST HAVE: image for their preparations before Tuesday
  days: {
    monday?: {
      readingPortion?: string;
      videoLink?: string;
      mondayEncouragement?: string;
    };
    tuesday?: {
      tuesdaySummary?: string;
      reflectionQuote?: string;
    };
    wednesday?: {
      readingPortion?: string;
      wednesdaySummary?: string;
      videoLink?: string;
      estimatedTime?: string;
      signOff?: string;
    };
    thursday?: {
      readingPortion?: string;
      thursdaySummary?: string;
    };
    friday?: {
      fridayEncouragement?: string;
      readingPortion?: string;
      videoLink?: string;
      weeklySummary?: string;
    };
    saturday?: {
      quizGreeting?: string;
      quizLinks?: string;
      saturdayEncouragement?: string;
    };
    sunday?: {
      sundaySummary?: string;
    };
  };
}

/**
 * users/{phone}/questLog/{YYYY-MM-DD}
 *
 * One document per day — tracks quest interactions for that calendar date.
 * Used for the PROGRESS summary and FlutterFlow activity feeds.
 */
export interface QuestLog {
  chaptersLogged: string[];   // e.g. ["Genesis 1", "Genesis 2"]
  videosWatched: string[];    // video IDs or week/index keys e.g. ["3/0", "3/1"]
}

/**
 * questProgress/{userId}
 *
 * Quest (video + reading) enrollment and progress.
 * Separated from users/ (3NF): quest progress is a distinct entity
 * that can be reset, paused, and queried independently of the user.
 */
export interface QuestProgress {
  userId: string;
  active: boolean;
  week: number;
  videoIndex: number;              // videos watched in the current week (0-3)
  totalChaptersLogged: number;     // cumulative chapters logged across all weeks
  updatedAt: Date;
}
