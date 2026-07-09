import type { Response } from 'express';

export function mockResponse(): Response & {
  status: jest.Mock;
  json: jest.Mock;
} {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response & { status: jest.Mock; json: jest.Mock };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}
