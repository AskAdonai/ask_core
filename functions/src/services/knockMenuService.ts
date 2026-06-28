import { getFirestore } from 'firebase-admin/firestore';
import {
  KNOCK_MENU_COLLECTION,
  KNOCK_MENU_DOC_ID,
  type KnockMenu,
} from '../types/KnockMenu';

const isPlaceholderUrl = (url?: string): boolean =>
  !url || url.includes('example.com');

export const DEFAULT_KNOCK_MENU_INSTRUCTION =
  `What does your heart need today?\n\n` +
  `Look at the menu above and reply with a *number* or *theme name*.\n\n` +
  `Type *RESET* to cancel.`;

export const KNOCK_UNAVAILABLE_IN_COUNTRY_MESSAGE =
  `Thank you for reaching out. The *KNOCK* prayer themes are not available in your country at the moment.\n\n` +
  `You can still reply *SEEK* for today's declaration, *HELP* for options, or *ASK* for your vine status.`;

export const getKnockMenu = async (): Promise<KnockMenu | null> => {
  const doc = await getFirestore()
    .collection(KNOCK_MENU_COLLECTION)
    .doc(KNOCK_MENU_DOC_ID)
    .get();

  if (!doc.exists) return null;
  return doc.data() as KnockMenu;
};

export const getKnockMenuDisplay = async (): Promise<{
  imageUrl?: string;
  instruction: string;
}> => {
  const menu = await getKnockMenu();
  const imageUrl = menu?.imageUrl?.trim();
  const instruction =
    menu?.instruction?.trim() || DEFAULT_KNOCK_MENU_INSTRUCTION;

  return {
    imageUrl: !isPlaceholderUrl(imageUrl) ? imageUrl : undefined,
    instruction,
  };
};
