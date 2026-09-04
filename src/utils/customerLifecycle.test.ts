import { describe, expect, it } from 'vitest';
import { deriveCustomerLifecycle, validResponseAction } from './customerLifecycle';

describe('deriveCustomerLifecycle', () => {
  it.each([
    ['REPLY', 'REPLY_REQUIRED', 'REPLY'],
    ['EDIT_WORKFLOW', 'WORKFLOW_EDIT_REQUIRED', 'EDIT_WORKFLOW'],
    ['APPROVE_WORKFLOW', 'WORKFLOW_APPROVAL_REQUIRED', 'APPROVE_WORKFLOW']
  ] as const)('maps CHANGES_REQUESTED + %s to its explicit primary action', (customerActionRequired, key, primaryAction) => {
    expect(deriveCustomerLifecycle({ state: 'CHANGES_REQUESTED', customerActionRequired })).toMatchObject({ key, primaryAction });
  });

  it('gives an explicit customer action precedence over a ready SOW', () => {
    expect(
      deriveCustomerLifecycle({
        state: 'CHANGES_REQUESTED',
        customerActionRequired: 'REPLY',
        activeSow: { status: 'SENT', visibleToCustomer: true },
        signBlockers: []
      })
    ).toMatchObject({ key: 'REPLY_REQUIRED', primaryAction: 'REPLY' });
  });

  it('does not honor a stale action outside CHANGES_REQUESTED', () => {
    expect(deriveCustomerLifecycle({ state: 'SUBMITTED', customerActionRequired: 'EDIT_WORKFLOW' })).toMatchObject({
      key: 'SUBMITTED',
      primaryAction: null
    });
  });

  it.each([undefined, null, 'INVALID'] as const)('fails closed on CHANGES_REQUESTED with %s explicit action', (customerActionRequired) => {
    const result = deriveCustomerLifecycle({
      state: 'CHANGES_REQUESTED',
      customerActionRequired: customerActionRequired as any,
      activeSow: { status: 'SENT', visibleToCustomer: true },
      signBlockers: []
    });
    expect(result).toMatchObject({ key: 'CUSTOMER_ACTION_UNKNOWN', primaryAction: null });
    expect(result.body).toMatch(/status.*unavailable|contact.*lab/i);
  });

  it('describes an accepted job with no issued SOW as preparing', () => {
    expect(deriveCustomerLifecycle({ state: 'ACCEPTED', activeSow: null })).toMatchObject({
      key: 'SOW_PREPARING',
      primaryAction: null
    });
    expect(deriveCustomerLifecycle({ state: 'ACCEPTED', activeSow: { status: 'DRAFT', visibleToCustomer: false } })).toMatchObject({
      key: 'SOW_PREPARING',
      primaryAction: null
    });
    expect(deriveCustomerLifecycle({ state: 'ACCEPTED', activeSow: { status: 'DRAFT', visibleToCustomer: true } })).toMatchObject({
      key: 'SOW_PREPARING',
      primaryAction: null
    });
  });

  it('offers signing only for a visible SENT version with no blockers', () => {
    expect(
      deriveCustomerLifecycle({
        state: 'ACCEPTED',
        activeSow: { status: 'SENT', visibleToCustomer: true },
        signBlockers: []
      })
    ).toMatchObject({ key: 'SOW_READY_TO_SIGN', primaryAction: 'SIGN_SOW' });
  });

  it('treats a blocked SENT version as withdrawn pending reissue', () => {
    const result = deriveCustomerLifecycle({
      state: 'ACCEPTED',
      activeSow: { status: 'SENT', visibleToCustomer: true },
      signBlockers: ['JOB_CHANGED_SINCE_ACCEPTANCE']
    });
    expect(result).toMatchObject({ key: 'SOW_REISSUE_REQUIRED', primaryAction: null });
    expect(result.body).toMatch(/reissue/i);
  });

  it.each([undefined, null] as const)('does not claim withdrawal while sign blockers are %s', (signBlockers) => {
    const result = deriveCustomerLifecycle({
      state: 'ACCEPTED',
      activeSow: { status: 'SENT', visibleToCustomer: true },
      signBlockers
    });
    expect(result).toMatchObject({ key: 'SOW_STATUS_UNAVAILABLE', primaryAction: null });
    expect(result.body).toMatch(/status.*unavailable.*reload/i);
    expect(result.body).not.toMatch(/withdrawn|reissue/i);
  });

  it.each([
    ['SIGNED', 'SOW_SIGNED'],
    ['FINAL', 'SOW_FINALIZED'],
    ['CANCELLED', 'SOW_CANCELLED']
  ] as const)('maps active %s to %s without an action', (status, key) => {
    expect(
      deriveCustomerLifecycle({
        state: 'ACCEPTED',
        activeSow: { status, visibleToCustomer: true },
        signBlockers: []
      })
    ).toMatchObject({ key, primaryAction: null });
  });

  it('calls a cancelled Statement of Work cancelled, not withdrawn', () => {
    // Withdrawing and cancelling are different operations, and the Statement of
    // Work card labels this status "Cancelled" on both the staff and the client
    // page. The Job card above it has to agree.
    const result = deriveCustomerLifecycle({
      state: 'ACCEPTED',
      activeSow: { status: 'CANCELLED', visibleToCustomer: true },
      signBlockers: []
    });
    expect(result.title).toMatch(/cancelled/i);
    expect(`${result.title} ${result.body}`).not.toMatch(/withdrawn/i);
  });

  it('states that the lab could not accept a rejected request', () => {
    const result = deriveCustomerLifecycle({ state: 'REJECTED' });
    expect(result).toMatchObject({ key: 'REJECTED', primaryAction: null });
    expect(result.body).toMatch(/lab could not accept/i);
    expect(result.body).not.toMatch(/you rejected|customer rejected/i);
  });

  it.each([
    ['SUBMITTED', 'SUBMITTED'],
    ['QUEUED', 'QUEUED'],
    ['IN_PROGRESS', 'IN_PROGRESS'],
    ['COMPLETE', 'COMPLETE'],
    ['CLOSED', 'CLOSED']
  ] as const)('provides a neutral %s state', (state, key) => {
    expect(deriveCustomerLifecycle({ state })).toMatchObject({ key, primaryAction: null });
  });

  it.each([
    ['CREATING', 'CREATING'],
    ['SUBMITTED', 'SUBMITTED'],
    ['CHANGES_REQUESTED', 'CUSTOMER_ACTION_UNKNOWN'],
    ['WAITING_FOR_SOW', 'WAITING_FOR_SOW'],
    ['QUEUED', 'QUEUED'],
    ['IN_PROGRESS', 'IN_PROGRESS'],
    ['COMPLETE', 'COMPLETE'],
    ['CLOSED', 'CLOSED'],
    ['REJECTED', 'REJECTED']
  ] as const)('%s ignores stale signable SOW data and returns %s', (state, key) => {
    const result = deriveCustomerLifecycle({
      state,
      activeSow: { status: 'SENT', visibleToCustomer: true },
      signBlockers: []
    });
    expect(result).toMatchObject({ key, primaryAction: null });
  });

  it('fails closed for missing, unknown, or non-visible SOW data', () => {
    expect(deriveCustomerLifecycle({})).toMatchObject({ key: 'UNKNOWN', primaryAction: null });
    expect(deriveCustomerLifecycle({ state: 'CHANGES_REQUESTED' })).toMatchObject({ key: 'CUSTOMER_ACTION_UNKNOWN', primaryAction: null });
    expect(
      deriveCustomerLifecycle({
        state: 'ACCEPTED',
        activeSow: { status: 'SENT', visibleToCustomer: false },
        signBlockers: []
      })
    ).toMatchObject({ key: 'SOW_PREPARING', primaryAction: null });
    expect(
      deriveCustomerLifecycle({
        state: 'ACCEPTED',
        activeSow: { status: 'SENT', visibleToCustomer: true }
      })
    ).toMatchObject({ key: 'SOW_STATUS_UNAVAILABLE', primaryAction: null });
  });
});

describe('validResponseAction', () => {
  it('keeps an open response only while it matches the lifecycle primary action', () => {
    expect(validResponseAction('REPLY', 'REPLY')).toBe('REPLY');
    expect(validResponseAction('EDIT_WORKFLOW', 'EDIT_WORKFLOW')).toBe('EDIT_WORKFLOW');
    expect(validResponseAction('APPROVE_WORKFLOW', 'APPROVE_WORKFLOW')).toBe('APPROVE_WORKFLOW');
  });

  it('clears stale response actions when lifecycle moves or changes action', () => {
    expect(validResponseAction('REPLY', 'EDIT_WORKFLOW')).toBeNull();
    expect(validResponseAction('REPLY', 'SIGN_SOW')).toBeNull();
    expect(validResponseAction('REPLY', null)).toBeNull();
  });
});
