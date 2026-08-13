import { describe, it, expect } from 'vitest';
import { sowStatusLabel, versionDisplayLabel, feeScheduleIsStale, feeScheduleLivePatch, SowVersionInputs } from './sowTypes';

describe('sowStatusLabel', () => {
  it('translates internal statuses to customer-facing wording', () => {
    expect(sowStatusLabel('DRAFT')).toBe('Draft');
    expect(sowStatusLabel('SENT')).toBe('Sent to Customer');
    expect(sowStatusLabel('SIGNED')).toBe('Customer Signed');
    expect(sowStatusLabel('FINAL')).toBe('Finalized');
    expect(sowStatusLabel('CANCELLED')).toBe('Cancelled');
  });

  it('falls back to a dash for a missing status', () => {
    expect(sowStatusLabel(null)).toBe('—');
    expect(sowStatusLabel(undefined)).toBe('—');
  });
});

describe('versionDisplayLabel', () => {
  it('prefers the server-computed label', () => {
    expect(versionDisplayLabel({ versionNumber: 3, displayVersion: '1.2' })).toBe('1.2');
  });

  it('decodes versionNumber itself if the server has not labelled it yet', () => {
    expect(versionDisplayLabel({ versionNumber: 1002 })).toBe('1.2');
    expect(versionDisplayLabel({ versionNumber: 1 })).toBe('0.1');
  });

  it('returns an empty string for no version', () => {
    expect(versionDisplayLabel(null)).toBe('');
    expect(versionDisplayLabel(undefined)).toBe('');
  });
});

describe('feeScheduleIsStale', () => {
  const live = [{ serviceId: 's1', name: 'PCR', description: '', cost: 100 }];

  it('is false when the local services match the live figures', () => {
    expect(feeScheduleIsStale({ services: live }, { liveServices: live })).toBe(false);
  });

  it('is true when a local cost no longer matches the live figure', () => {
    const local = [{ serviceId: 's1', name: 'PCR', description: '', cost: 50 }];
    expect(feeScheduleIsStale({ services: local }, { liveServices: live })).toBe(true);
  });

  it('is true when a service line was added or removed', () => {
    expect(feeScheduleIsStale({ services: [] }, { liveServices: live })).toBe(true);
  });

  it('ignores adjustments entirely — only services drive it', () => {
    // No adjustments field even exists on the Pick<...> the function takes; this
    // just documents that comparing services is the whole story.
    expect(feeScheduleIsStale({ services: live }, { liveServices: live })).toBe(false);
  });

  it('is false when there is nothing live to compare against yet', () => {
    expect(feeScheduleIsStale({ services: live }, null)).toBe(false);
    expect(feeScheduleIsStale({ services: live }, { liveServices: undefined })).toBe(false);
  });
});

describe('feeScheduleLivePatch', () => {
  function inputs(over: Partial<SowVersionInputs> = {}): SowVersionInputs {
    return {
      projectManager: '',
      projectLead: '',
      scopeOfWork: [],
      deliverables: [],
      periods: [],
      services: [],
      adjustments: [],
      ...over
    };
  }

  it('sums live service costs into baseCost and totalCost when there are no adjustments', () => {
    const live = [
      { serviceId: 's1', name: 'PCR', description: '', cost: 100 },
      { serviceId: 's2', name: 'Gel', description: '', cost: 25 }
    ];
    const patch = feeScheduleLivePatch(inputs(), live, 'EXTERNAL_CUSTOMER_MARKET');
    expect(patch.services).toBe(live);
    expect(patch.baseCost).toBe(125);
    expect(patch.totalCost).toBe(125);
    expect(patch.customerCategory).toBe('EXTERNAL_CUSTOMER_MARKET');
  });

  it('applies existing adjustments on top of the fresh baseCost, discount and additional cost alike', () => {
    const live = [{ serviceId: 's1', name: 'PCR', description: '', cost: 100 }];
    const withAdjustments = inputs({
      adjustments: [
        { type: 'DISCOUNT', description: 'Loyalty', amount: 10 },
        { type: 'ADDITIONAL_COST', description: 'Rush', amount: 20 }
      ]
    });
    const patch = feeScheduleLivePatch(withAdjustments, live, 'INTERNAL_CUSTOMERS');
    expect(patch.baseCost).toBe(100);
    expect(patch.totalCost).toBe(110); // 100 - 10 + 20
  });

  it('leaves adjustments themselves untouched — the patch never mentions them', () => {
    const withAdjustments = inputs({ adjustments: [{ type: 'DISCOUNT', description: 'Loyalty', amount: 10 }] });
    const patch = feeScheduleLivePatch(withAdjustments, [], 'INTERNAL_CUSTOMERS');
    expect(patch.adjustments).toBeUndefined();
  });
});
