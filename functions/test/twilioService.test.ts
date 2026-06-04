const mockCreate = jest.fn();

jest.mock('twilio', () => jest.fn(() => ({
  messages: {
    create: mockCreate,
  },
})));

describe('twilioService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      TWILIO_ACCOUNT_SID: 'AC1234567890',
      TWILIO_AUTH_TOKEN: 'auth-token',
      TWILIO_WHATSAPP_NUMBER: '+14155238886',
      TWILIO_CONTENT_SID_QUIZ: 'HXquiztemplate',
    };
    mockCreate.mockResolvedValue({ sid: 'SM123' });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends quiz questions through the Content template with visible option text and short buttons', async () => {
    const { sendQuizQuestion } = await import('../src/services/twilioService');

    await sendQuizQuestion('+15551234567', {
      questionNumber: 2,
      totalQuestions: 4,
      bookTitle: 'Genesis',
      questionText: 'Who built the ark?',
      options: ['Noah', 'Moses with a very long option', 'Abraham'],
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+15551234567',
      contentSid: 'HXquiztemplate',
    }));

    const messageParams = mockCreate.mock.calls[0][0];
    expect(JSON.parse(messageParams.contentVariables)).toEqual({
      '1': 'Genesis — Question 2 of 4',
      '2': 'Who built the ark?\n\nA — Noah\nB — Moses with a very long option\nC — Abraham',
      '3': 'A',
      '4': 'B',
      '5': 'C',
    });
  });
});
