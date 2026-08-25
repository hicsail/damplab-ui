import { describe, it, expect } from 'vitest';
import {
  adjustmentDescriptionText,
  adjustmentLineAmount,
  adjustmentMultiplier,
  adjustmentUnitAmount,
  blockerStep,
  consentSummaryLabels,
  customerBlockerMessage,
  customerDocumentFields,
  customerSigningState,
  DEFAULT_SIGNATURES_TEXT,
  feeScheduleIsStale,
  feeScheduleLivePatch,
  formatMultiplier,
  isSettledBlocker,
  repairBlockers,
  serviceMultiplier,
  serviceUnitCost,
  signingAgreementText,
  SowActionGate,
  SowEditorState,
  SowField,
  SowVersion,
  SowVersionInputs,
  sowStatusLabel,
  sowTotals,
  toInputsPayload,
  versionDisplayLabel
, nextSentVersionLabel} from './sowTypes';

describe('SOW contract repair types', () => {
  it('represents accepted source linkage and the customer signing gate', () => {
    const version = {
      id: 'version-1',
      versionNumber: 1000,
      status: 'SENT',
      visibleToCustomer: true,
      sourceJobVersionNumber: 7,
      sourceContractFingerprint: 'contract-fingerprint',
      createdByName: 'Technician',
      createdAt: '2026-08-21T12:00:00Z',
      fields: [],
      inputs: {} as SowVersionInputs
    } satisfies SowVersion;
    const gate = {
      canSend: false,
      sendBlockers: ['NO_DRAFT_TO_SEND'],
      canSign: true,
      signBlockers: [],
      canCountersign: false,
      countersignBlockers: ['AWAITING_CUSTOMER_SIGNATURE'],
      missingFields: []
    } satisfies SowActionGate;
    const state = { id: 'sow-1', sowNumber: 'SOW-1', currentVersionNumber: 1000, activeVersionNumber: 1000, documentStale: false, currentVersion: version, actionGate: gate } satisfies SowEditorState;

    expect(state.currentVersion?.sourceJobVersionNumber).toBe(7);
    expect(state.actionGate?.canSign).toBe(true);
  });

  it('keeps waiting states settled and identifies source/sign-version blockers as repairs', () => {
    expect(isSettledBlocker('NO_DRAFT_TO_SEND')).toBe(true);
    expect(isSettledBlocker('AWAITING_CUSTOMER_SIGNATURE')).toBe(true);
    expect(repairBlockers(['AWAITING_CUSTOMER_SIGNATURE', 'ACCEPTED_SOURCE_UNAVAILABLE', 'STALE_SIGN_VERSION'])).toEqual([
      'ACCEPTED_SOURCE_UNAVAILABLE',
      'STALE_SIGN_VERSION'
    ]);
  });

  it.each([
    ['ACCEPTED_SOURCE_UNAVAILABLE', /re-accept.*save a fresh draft.*reissue/i],
    ['JOB_CHANGED_SINCE_ACCEPTANCE', /re-accept.*save a fresh draft.*reissue/i],
    ['STALE_SIGN_VERSION', /reload.*latest version/i],
    ['AWAITING_SENT_VERSION', /send the document/i],
    ['UNSENT_DRAFT', /revert to the signed version/i]
  ] as const)('gives %s an actionable repair step', (blocker, expected) => {
    expect(blockerStep(blocker)).toMatch(expected);
  });
});

describe('customer signing gate', () => {
  it('enables signing only for the active SENT version with an explicit clear gate', () => {
    expect(customerSigningState({ isActive: true, status: 'SENT', canSign: true, signBlockers: [] })).toEqual({
      enabled: true,
      blockerMessage: null
    });
    expect(customerSigningState({ isActive: false, status: 'SENT', canSign: true, signBlockers: [] }).enabled).toBe(false);
    expect(customerSigningState({ isActive: true, status: 'SIGNED', canSign: true, signBlockers: [] }).enabled).toBe(false);
    expect(customerSigningState({ isActive: true, status: 'SENT', canSign: false, signBlockers: [] }).enabled).toBe(false);
    expect(customerSigningState({ isActive: true, status: 'SENT', canSign: true, signBlockers: undefined }).enabled).toBe(false);
  });

  it('explains the first blocker without exposing staff repair instructions', () => {
    const state = customerSigningState({
      isActive: true,
      status: 'SENT',
      canSign: false,
      signBlockers: ['JOB_CHANGED_SINCE_ACCEPTANCE']
    });
    expect(state.enabled).toBe(false);
    expect(state.blockerMessage).toBe(customerBlockerMessage('JOB_CHANGED_SINCE_ACCEPTANCE'));
    expect(state.blockerMessage).toMatch(/lab must issue an updated/i);
    expect(state.blockerMessage).not.toMatch(/re-accept|save.*draft/i);
  });
});

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

/**
 * The document keeps its own figures; this is the signal that the job's have
 * moved on and a Recalculate is available. Not an error state — a static record
 * disagreeing with a changed job is the expected condition.
 */
describe('feeScheduleIsStale', () => {
  const live = [{ serviceId: 's1', name: 'PCR', cost: 350, unitCost: 5, multiplier: 70 }] as any;

  it('is false when the document already matches the job', () => {
    expect(feeScheduleIsStale({ services: live } as any, { liveServices: live })).toBe(false);
  });

  it('is true when the job repriced a line', () => {
    const documented = [{ ...live[0], cost: 420, unitCost: 6 }];
    expect(feeScheduleIsStale({ services: documented } as any, { liveServices: live })).toBe(true);
  });

  it('is true when the job added a line the document does not have', () => {
    expect(feeScheduleIsStale({ services: [] } as any, { liveServices: live })).toBe(true);
  });

  it('is true when only the pricing category moved', () => {
    expect(
      feeScheduleIsStale({ services: live, customerCategory: 'INTERNAL_CUSTOMERS' } as any, { liveServices: live, liveCustomerCategory: 'EXTERNAL_CUSTOMER_MARKET' })
    ).toBe(true);
  });

  it('ignores adjustments entirely — those are staff-authored, never drift', () => {
    const withAdjustments = { services: live, adjustments: [{ type: 'DISCOUNT', amount: 50 }] } as any;
    expect(feeScheduleIsStale(withAdjustments, { liveServices: live })).toBe(false);
  });

  it('reports nothing when the job figures have not loaded', () => {
    expect(feeScheduleIsStale({ services: live } as any, null)).toBe(false);
    expect(feeScheduleIsStale({ services: live } as any, { liveServices: undefined })).toBe(false);
  });
});

describe('feeScheduleLivePatch', () => {
  const live = [{ serviceId: 's1', name: 'PCR', cost: 420 }] as any;
  const inputs = { services: [{ serviceId: 's1', name: 'PCR', cost: 350 }], adjustments: [], customerCategory: 'INTERNAL_CUSTOMERS' } as any;

  it('adopts the job figures and rederives the totals', () => {
    const patch = feeScheduleLivePatch(inputs, live, 'EXTERNAL_CUSTOMER_MARKET');
    expect(patch.services).toEqual(live);
    expect(patch.baseCost).toBe(420);
    expect(patch.customerCategory).toBe('EXTERNAL_CUSTOMER_MARKET');
  });

  it('leaves adjustments alone and folds them into the new total', () => {
    const withDiscount = { ...inputs, adjustments: [{ type: 'DISCOUNT', amount: 20 }] } as any;
    const patch = feeScheduleLivePatch(withDiscount, live, 'INTERNAL_CUSTOMERS');
    expect(patch.adjustments).toBeUndefined();
    expect(patch.totalCost).toBe(400);
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

  it('writes a multiplier without trailing zeros', () => {
    expect(formatMultiplier(10)).toBe('10');
    expect(formatMultiplier(2.5)).toBe('2.5');
  });
});

describe('adjustment line arithmetic', () => {
  it('reads the unit amount off an adjustment that has one', () => {
    expect(adjustmentUnitAmount({ unitAmount: 120, amount: 1680 })).toBe(120);
  });

  it('falls back to the stored figure on an adjustment written before unit amounts existed', () => {
    expect(adjustmentUnitAmount({ amount: 500 })).toBe(500);
    expect(adjustmentUnitAmount({ unitAmount: null, amount: 500 })).toBe(500);
  });

  it('keeps a legitimate zero unit amount rather than falling back to the figure', () => {
    expect(adjustmentUnitAmount({ unitAmount: 0, amount: 0 })).toBe(0);
  });

  it('treats an absent, zero or negative multiplier as 1', () => {
    expect(adjustmentMultiplier({})).toBe(1);
    expect(adjustmentMultiplier({ multiplier: null })).toBe(1);
    expect(adjustmentMultiplier({ multiplier: 0 })).toBe(1);
    expect(adjustmentMultiplier({ multiplier: -4 })).toBe(1);
    expect(adjustmentMultiplier({ multiplier: 14 })).toBe(14);
  });

  it('reads an adjustment written before the reason box was folded in as the one line the document quotes', () => {
    expect(adjustmentDescriptionText({ description: 'Academic discount', reason: 'grant' })).toBe('Academic discount — grant');
  });

  it('adds no dash when only one of the two was ever filled in', () => {
    expect(adjustmentDescriptionText({ description: 'Rush handling', reason: null })).toBe('Rush handling');
    expect(adjustmentDescriptionText({ description: '', reason: 'grant' })).toBe('grant');
    expect(adjustmentDescriptionText({ description: '', reason: null })).toBe('');
  });

  it('rounds the line figure to the cent, matching the server', () => {
    expect(adjustmentLineAmount(120, 14)).toBe(1680);
    expect(adjustmentLineAmount(3.3, 3)).toBe(9.9);
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

  it('never sends service lines — figures are derived server-side, never named by the client', () => {
    const payload = toInputsPayload(inputs([{ serviceId: 's1', name: 'PCR', description: '', cost: 350, unitCost: 5, multiplier: 70 }]));
    expect(payload.services).toBeUndefined();
  });

  it('sends the refresh intent rather than the refreshed figures', () => {
    expect(toInputsPayload(inputs([]), true).refreshFeeSchedule).toBe(true);
    expect(toInputsPayload(inputs([])).refreshFeeSchedule).toBe(false);
  });

  it('sends the adjustment unit amount, multiplier and category so the server can derive the figure', () => {
    const withAdjustments = { ...inputs([]), adjustments: [{ type: 'ADDITIONAL_COST', description: 'Staff time', amount: 1680, unitAmount: 120, multiplier: 14, category: 'DAYS' }] } as unknown as SowVersionInputs;
    expect((toInputsPayload(withAdjustments).adjustments as any[])[0]).toMatchObject({ amount: 1680, unitAmount: 120, multiplier: 14, category: 'DAYS' });
  });

  it('sends nulls for an adjustment written before unit amounts and categories existed, so its stored figure is written through as before', () => {
    const legacy = { ...inputs([]), adjustments: [{ type: 'DISCOUNT', description: 'Academic', amount: 500 }] } as unknown as SowVersionInputs;
    const adj = (toInputsPayload(legacy).adjustments as any[])[0];
    expect(adj).toMatchObject({ amount: 500 });
    expect(adj.unitAmount).toBeNull();
    expect(adj.multiplier).toBeNull();
    expect(adj.category).toBeNull();
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

  it('still totals a legacy adjustment from its stored figure, with no unit amount or multiplier on it', () => {
    expect(sowTotals(services, [{ type: 'DISCOUNT' as const, description: 'Academic', amount: 75 }]).totalCost).toBe(400.5);
  });

  it('treats missing lists as nothing rather than NaN', () => {
    expect(sowTotals(null, null)).toEqual({ baseCost: 0, totalCost: 0 });
    expect(sowTotals(undefined, undefined)).toEqual({ baseCost: 0, totalCost: 0 });
  });
});

describe('nextSentVersionLabel', () => {
  // Sending bumps the whole number, so the draft label is never what the
  // customer ends up holding.
  it('reports the version the customer will actually receive', () => {
    expect(nextSentVersionLabel({ versionNumber: 4 })).toBe('1.0');
    expect(nextSentVersionLabel({ versionNumber: 1003 })).toBe('2.0');
    expect(nextSentVersionLabel({ versionNumber: 2000 })).toBe('3.0');
  });

  it('is empty with nothing to send', () => {
    expect(nextSentVersionLabel(null)).toBe('');
  });
});
