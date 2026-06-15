import { sendWhatsAppMessage } from '../../services/twilioService';
import { updateUserFields, User } from '../../services/userService';
import { parseTime } from '../../utils/timeParser';
import { computeNextSendAt, computeNextReminderAt, computeUserScheduleFields } from '../../utils/timezone';
import pino from 'pino';

const logger = pino();

export const triggerReminderTimeUpdate = async (phone: string): Promise<void> => {
  await updateUserFields(phone, { awaitingReminderTime: true } as Partial<User>);
  
  await sendWhatsAppMessage(
    phone,
    `When would you like to receive your morning prayer card? \n\nReply with your preferred time (e.g., *6am*, *7:30*, *18:00*).`
  );
  
  logger.info({ phone }, 'User requested reminder time update');
};

export const handleReminderTimeUpdate = async (phone: string, text: string, user: Partial<User>): Promise<void> => {
  const parsed = parseTime(text);
  
  if (!parsed) {
    await sendWhatsAppMessage(
      phone,
      `Sorry, I couldn't understand that time format. Please try again (e.g., *6am*, *8:30*, *18:00*).`
    );
    return;
  }
  const scheduleFields = computeUserScheduleFields(phone, parsed.hour, parsed.minute, parsed.display, user.timezone);

  await updateUserFields(phone, {
    ...scheduleFields,
    awaitingReminderTime: false,
  } as Partial<User>);

  await sendWhatsAppMessage(
    phone,
    `Your morning reminder is now set to *${scheduleFields.reminderTimeLocal}*. 🙏`
  );
  
  logger.info({ phone, localTime: scheduleFields.reminderTimeLocal }, 'Reminder time updated successfully');
};
