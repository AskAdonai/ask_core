import { 
  QuestMondayPayload, 
  QuestTuesdayPayload, 
  QuestWednesdayPayload, 
  QuestFridayPayload, 
  QuestSaturdayPayload 
} from '../services/twilioService';

export const formatMondayPayload = (user: any, weekData: any): QuestMondayPayload => {
  const days = weekData.days || {};
  return {
    name: user.name || 'Friend',
    weekNumber: weekData.weekNumber || 1,
    mondayEncouragement: days.monday?.mondayEncouragement || '',
    readingPortion: days.monday?.readingPortion || '',
    videoLink: days.monday?.videoLink || '',
    coverPic: weekData.introImageUrl || '',
  };
};

export const formatTuesdayPayload = (user: any, weekData: any): QuestTuesdayPayload => {
  const days = weekData.days || {};
  return {
    name: user.name || 'Friend',
    tuesdaySummary: days.tuesday?.tuesdaySummary || '',
    reflectionQuote: days.tuesday?.reflectionQuote || '',
  };
};

export const formatWednesdayPayload = (user: any, weekData: any): QuestWednesdayPayload => {
  const days = weekData.days || {};
  return {
    name: user.name || 'Friend',
    weekNumber: weekData.weekNumber || 1,
    readingPortion: days.wednesday?.readingPortion || '',
    wednesdaySummary: days.wednesday?.wednesdaySummary || '',
    videoLink: days.wednesday?.videoLink || '',
    estimatedTime: days.wednesday?.estimatedTime || '15 mins',
    signOff: days.wednesday?.signOff || 'Blessings!',
  };
};

export const formatFridayPayload = (user: any, weekData: any): QuestFridayPayload => {
  const days = weekData.days || {};
  return {
    name: user.name || 'Friend',
    fridayEncouragement: days.friday?.fridayEncouragement || '',
    weekNumber: weekData.weekNumber || 1,
    readingPortion: days.friday?.readingPortion || '',
    videoLink: days.friday?.videoLink || '',
    weeklySummary: days.friday?.weeklySummary || '',
  };
};

export const formatSaturdayPayload = (user: any, weekData: any): QuestSaturdayPayload => {
  const days = weekData.days || {};
  return {
    name: user.name || 'Friend',
    quizGreeting: days.saturday?.quizGreeting || '',
    weeklyChapterSpan: weekData.weeklyChapterSpan || '',
    quizLinks: days.saturday?.quizLinks || '',
    saturdayEncouragement: days.saturday?.saturdayEncouragement || '',
  };
};
