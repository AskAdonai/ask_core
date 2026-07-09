import {
  resolveDeclarationContentPosition,
} from '../src/webhook/handlers/declarationHandler';

describe('resolveDeclarationContentPosition', () => {
  it('uses live journey pointer when no same-day snapshot exists', () => {
    expect(
      resolveDeclarationContentPosition(
        { journeyStage: 1, journeyDayIndex: 5 },
        '2026-07-08',
      ),
    ).toEqual({ journeyStage: 1, journeyDayIndex: 5, fromSnapshot: false });
  });

  it('reuses snapshot after YES advances the live day pointer same day', () => {
    expect(
      resolveDeclarationContentPosition(
        {
          journeyStage: 1,
          journeyDayIndex: 6, // already advanced by YES
          declarationContentDate: '2026-07-08',
          declarationContentStage: 1,
          declarationContentDayIndex: 5,
        },
        '2026-07-08',
      ),
    ).toEqual({ journeyStage: 1, journeyDayIndex: 5, fromSnapshot: true });
  });

  it('drops stale snapshot on the next calendar day', () => {
    expect(
      resolveDeclarationContentPosition(
        {
          journeyStage: 1,
          journeyDayIndex: 6,
          declarationContentDate: '2026-07-07',
          declarationContentStage: 1,
          declarationContentDayIndex: 5,
        },
        '2026-07-08',
      ),
    ).toEqual({ journeyStage: 1, journeyDayIndex: 6, fromSnapshot: false });
  });
});
