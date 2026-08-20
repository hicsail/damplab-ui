import { describe, it, expect } from 'vitest';
import { consentSummaryLabels, sowStatusLabel, versionDisplayLabel, feeScheduleIsStale, feeScheduleLivePatch, formatMultiplier, serviceLineCost, serviceMultiplier, serviceUnitCost, toInputsPayload, SowVersionInputs, sowTotals, signingAgreementText, customerDocumentFields, DEFAULT_SIGNATURES_TEXT, SowField } from './sowTypes';

describe('consentSummaryLabels', () => {
  it('reads the two boilerplate groups back as a single agreement', () => {
    // The customer ticked one box; showing two lines implied two decisions.
    expect(consentSummaryLabels(['CALCULATED', 'PROSE'])).toEqual(['the terms']);
  });

  it('says the same thing when only one boilerplate group was recorded', () => {
    expect(consentSummaryLabels(['CALCULATED'])).toEqual(['the terms']);
    expect(consentSummaryLabels(['PROSE'])).toEqual(['the terms']);
  });

  it('keeps custom sections as their own line', () => {
    expect(consentSummaryLabels(['CALCULATED', 'PROSE', 'CUSTOM'])).toEqual(['the terms', 'the additional sections']);
    expect(consentSummaryLabels(['CUSTOM'])).toEqual(['the additional sections']);
  });

  it('has nothing to say about an empty or missing consent', () => {
    expect(consentSummaryLabels([])).toEqual([]);
    expect(consentSummaryLabels(null)).toEqual([]);
    expect(consentSummaryLabels(undefined)).toEqual([]);
  });
});

function field(key: string, value: string, over: Partial<SowField> = {}): SowField {
  return {
    key,
    label: key,
    kind: 'PROSE',
    order: 10,
    value,
    calculatedValue: value,
    isOverridden: false,
    isEnabled: true,
    allowsTextOverride: true,
    allowsEmpty: true,
    requiresInitials: false,
    ...over
  };
}

describe('signingAgreementText', () => {
  it('uses the Signatures section the staff set on this document', () => {
    expect(signingAgreementText([field('scopeOfWork', 'Do the work'), field('signatures', 'We agree to the terms as written.')])).toBe('We agree to the terms as written.');
  });

  it('falls back to the catalogue default when a legacy SOW has no Signatures text', () => {
    expect(signingAgreementText([field('scopeOfWork', 'Do the work')])).toBe(DEFAULT_SIGNATURES_TEXT);
    expect(signingAgreementText([field('signatures', '   ')])).toBe(DEFAULT_SIGNATURES_TEXT);
    expect(signingAgreementText([])).toBe(DEFAULT_SIGNATURES_TEXT);
  });
});

describe('customerDocumentFields', () => {
  it('omits Signatures from the document body so the clause is not shown twice', () => {
    const fields = [field('scopeOfWork', 'Do the work', { order: 20 }), field('signatures', 'Witness.', { order: 180 }), field('feeSchedule', 'Costs', { order: 10 })];
    expect(customerDocumentFields(fields).map((f) => f.key)).toEqual(['feeSchedule', 'scopeOfWork']);
  });

  it('still hides sections the staff turned off', () => {
    expect(customerDocumentFields([field('scopeOfWork', 'Do the work', { isEnabled: false })]).map((f) => f.key)).toEqual([]);
  });
});

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

  it('is true when only the base price behind an unchanged total moved', () => {
    // Same line total, split differently — a re-priced service on a line whose
    // multiplier changed to compensate. Keying on cost alone would miss it and
    // leave the Fee Schedule quoting a base the job no longer charges.
    const documented = [{ serviceId: 's1', name: 'PCR', description: '', cost: 100, unitCost: 10, multiplier: 10 }];
    const relive = [{ serviceId: 's1', name: 'PCR', description: '', cost: 100, unitCost: 20, multiplier: 5 }];
    expect(feeScheduleIsStale({ services: documented }, { liveServices: relive })).toBe(true);
  });

  it('is true when documented category differs from the job category even if costs match', () => {
    expect(
      feeScheduleIsStale(
        { services: live, customerCategory: 'INTERNAL_CUSTOMERS' },
        { liveServices: live, liveCustomerCategory: 'EXTERNAL_CUSTOMER_MARKET' }
      )
    ).toBe(true);
  });

  it('is false when documented and live categories match and costs match', () => {
    expect(
      feeScheduleIsStale(
        { services: live, customerCategory: 'EXTERNAL_CUSTOMER_MARKET' },
        { liveServices: live, liveCustomerCategory: 'EXTERNAL_CUSTOMER_MARKET' }
      )
    ).toBe(false);
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

describe('fee schedule line arithmetic', () => {
  it('reads the unit price off a line that has one', () => {
    expect(serviceUnitCost({ unitCost: 5, cost: 350 })).toBe(5);
  });

  it('falls back to the line total on a document written before unit prices existed', () => {
    expect(serviceUnitCost({ cost: 350 })).toBe(350);
    expect(serviceUnitCost({ unitCost: null, cost: 350 })).toBe(350);
  });

  it('keeps a legitimate zero unit price rather than falling back to the total', () => {
    expect(serviceUnitCost({ unitCost: 0, cost: 0 })).toBe(0);
  });

  it('treats an absent, zero or negative multiplier as 1', () => {
    expect(serviceMultiplier({})).toBe(1);
    expect(serviceMultiplier({ multiplier: null })).toBe(1);
    expect(serviceMultiplier({ multiplier: 0 })).toBe(1);
    expect(serviceMultiplier({ multiplier: -3 })).toBe(1);
    expect(serviceMultiplier({ multiplier: 70 })).toBe(70);
  });

  it('rounds the line total to the cent, matching the server', () => {
    expect(serviceLineCost(3.3, 3)).toBe(9.9);
    expect(serviceLineCost(5, 70)).toBe(350);
  });

  it('writes a multiplier without trailing zeros', () => {
    expect(formatMultiplier(10)).toBe('10');
    expect(formatMultiplier(2.5)).toBe('2.5');
  });
});

describe('toInputsPayload', () => {
  function inputs(services: any[]): SowVersionInputs {
    return {
      projectManager: '',
      projectLead: '',
      scopeOfWork: [],
      deliverables: [],
      periods: [],
      services,
      adjustments: []
    } as unknown as SowVersionInputs;
  }

  it('sends the unit price so the server can derive the total from the multiplier', () => {
    const payload = toInputsPayload(inputs([{ serviceId: 's1', name: 'PCR', description: '', cost: 350, unitCost: 5, multiplier: 70 }]));
    expect((payload.services as any[])[0]).toMatchObject({ serviceId: 's1', cost: 350, unitCost: 5 });
  });

  it('sends a null unit price for a line that has none, so the server writes the total through as before', () => {
    const payload = toInputsPayload(inputs([{ serviceId: 's1', name: 'PCR', description: '', cost: 350 }]));
    expect((payload.services as any[])[0].unitCost).toBeNull();
  });
});

describe('sowTotals', () => {
  const services = [
    { serviceId: 'a', name: 'NGS', cost: 350 },
    { serviceId: 'b', name: 'Prep', cost: 125.5 }
  ];

  it('adds the service lines', () => {
    expect(sowTotals(services, [])).toEqual({ baseCost: 475.5, totalCost: 475.5 });
  });

  it('subtracts a discount and adds a cost, whatever sign was typed', () => {
    const adjustments = [
      { type: 'DISCOUNT' as const, description: 'Academic', amount: 75 },
      { type: 'ADDITIONAL_COST' as const, description: 'Rush', amount: -50 }
    ];
    expect(sowTotals(services, adjustments).totalCost).toBe(450.5);
  });

  it('treats missing lists as nothing rather than NaN', () => {
    expect(sowTotals(null, null)).toEqual({ baseCost: 0, totalCost: 0 });
    expect(sowTotals(undefined, undefined)).toEqual({ baseCost: 0, totalCost: 0 });
  });
});
