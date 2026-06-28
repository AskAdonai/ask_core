import { sendWhatsAppMessage } from '../../services/twilioService';
import { handleOnboarding as _handleOnboarding } from './onboardingHandler';

const stubReply = async (phone: string, featureName: string) => {
  await sendWhatsAppMessage(phone, `[STUB] ${featureName} feature coming soon!`);
};

export const handleOnboarding = _handleOnboarding;

export const handleQuestOnboarding = async (phone: string, _userData: any) => stubReply(phone, 'Quest Onboarding');
export const handleFallback = async (phone: string) => {
  // sent a  template
  await sendWhatsAppMessage(phone, "I didn't catch that... Try sending ASK, PAUSE, or HELP.");
};
