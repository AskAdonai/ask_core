import type { Timestamp } from 'firebase-admin/firestore';

/**
 * media/{mediaId}
 * 
 * Represents an uploaded file (audio, image, video) in the Cloudflare R2 bucket.
 */
export interface Media {
  id: string; // The generated document ID
  type: 'audio' | 'image' | 'video';
  url: string; // The public Cloudflare R2 URL
  filename: string; // Original filename or path key
  tags: string[]; // Array of tag strings
  categoryIds: string[]; // References to MediaCategory documents
  createdAt?: Timestamp | Date;
}

/**
 * mediaCategories/{categoryId}
 * 
 * Represents a category for grouping media files (e.g. "thanksgiving", "morning devotion").
 */
export interface MediaCategory {
  id: string;
  name: string;
  createdAt?: Timestamp | Date;
}
