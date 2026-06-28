import type { Timestamp } from 'firebase-admin/firestore';

/**
 * knockMenu/current
 *
 * Singleton document for the KNOCK theme selection menu.
 * The image shows numbered themes; the bot sends it with a short instruction caption.
 * Admin updates `imageUrl` when the menu graphic changes.
 */
export interface KnockMenu {
  imageUrl: string;
  instruction?: string;
  updatedAt?: Timestamp | Date;
}

export const KNOCK_MENU_COLLECTION = 'knockMenu';
export const KNOCK_MENU_DOC_ID = 'current';
