import type { Timestamp } from 'firebase-admin/firestore';

/**
 * dailyDeclarations/{dateString}
 * 
 * Represents a scheduled daily declaration for the KNOCK flow.
 * Document ID is the YYYY-MM-DD string format in the target timezone.
 */
export interface DailyDeclaration {
  date: string; // Document ID (e.g. "2026-06-06")
  mediaId: string; // Reference to Media document
  audioUrl: string; // Dereferenced audio URL for fast access
  declarationText?: string;
  bibleVerse?: string;
  reference?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
