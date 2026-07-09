const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

jest.mock('../src/services/schedulingService', () => ({
  rescheduleAfterSend: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/deliveryLogService', () => ({
  writeDeliveryLog: jest.fn().mockResolvedValue('log-1'),
}));

import {
  MAX_MORNING_DELIVERY_ATTEMPTS,
  recordMorningDeliveryFailure,
  resetMorningDeliveryFailures,
} from '../src/services/morningDeliveryFailureService';
import { rescheduleAfterSend } from '../src/services/schedulingService';
import { writeDeliveryLog } from '../src/services/deliveryLogService';

describe('morningDeliveryFailureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate });
    mockCollection.mockReturnValue({ doc: mockDoc });
  });

  it('increments failure count and logs a retryable failure below the cap', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ morningDeliveryFailureCount: 2 }) });

    const result = await recordMorningDeliveryFailure({
      userId: 'user-1',
      timezone: 'Africa/Lagos',
      reminderHour: 6,
      reminderMinute: 30,
      deliveryId: 'delivery-1',
      error: new Error('boom'),
      journeyStage: 1,
      journeyDayIndex: 5,
    });

    expect(result).toEqual({ attempts: 3, permanent: false });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ morningDeliveryFailureCount: 3 }),
    );
    expect(writeDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        metadata: expect.objectContaining({ attempts: 3, maxAttempts: MAX_MORNING_DELIVERY_ATTEMPTS }),
      }),
    );
    expect(rescheduleAfterSend).not.toHaveBeenCalled();
  });

  it('marks permanently failed and reschedules after the fifth attempt', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ morningDeliveryFailureCount: 4 }) });

    const result = await recordMorningDeliveryFailure({
      userId: 'user-1',
      timezone: 'Africa/Lagos',
      reminderHour: 6,
      reminderMinute: 30,
      deliveryId: 'delivery-5',
      error: new Error('documentPath invalid'),
      journeyStage: 1,
      journeyDayIndex: 5,
    });

    expect(result).toEqual({ attempts: 5, permanent: true });
    expect(rescheduleAfterSend).toHaveBeenCalledWith('user-1', 'Africa/Lagos', 6, 30);
    expect(writeDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'permanently_failed',
        pinned: true,
        metadata: expect.objectContaining({ attempts: 5 }),
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ morningDeliveryFailureCount: 0 }),
    );
  });

  it('clears the failure counter after a successful send path', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ morningDeliveryFailureCount: 2 }) });

    await resetMorningDeliveryFailures('user-1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ morningDeliveryFailureCount: 0 }),
    );
  });
});
