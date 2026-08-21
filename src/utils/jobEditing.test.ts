import { describe, it, expect } from 'vitest';
import { customerMayEdit, jobIsWithCustomer, awaitingCustomerApproval, editingBlockedMessage } from './jobEditing';

describe('customerMayEdit', () => {
  it('is the flag, not the state', () => {
    expect(customerMayEdit({ state: 'ACCEPTED', customerEditingEnabled: true })).toBe(true);
    expect(customerMayEdit({ state: 'CHANGES_REQUESTED', customerEditingEnabled: false })).toBe(false);
  });

  it('locks an unread or unwritten flag', () => {
    expect(customerMayEdit(null)).toBe(false);
    expect(customerMayEdit(undefined)).toBe(false);
    expect(customerMayEdit({ state: 'CHANGES_REQUESTED' })).toBe(false);
  });
});

describe('awaitingCustomerApproval', () => {
  it('is a job held by the customer that they cannot edit', () => {
    expect(awaitingCustomerApproval({ state: 'CHANGES_REQUESTED', customerEditingEnabled: false })).toBe(true);
  });

  it('is not a change request, which they can edit', () => {
    expect(awaitingCustomerApproval({ state: 'CHANGES_REQUESTED', customerEditingEnabled: true })).toBe(false);
  });

  it('is not a job the lab still holds', () => {
    expect(awaitingCustomerApproval({ state: 'ACCEPTED', customerEditingEnabled: false })).toBe(false);
    expect(awaitingCustomerApproval({ state: 'SUBMITTED', customerEditingEnabled: false })).toBe(false);
  });
});

describe('jobIsWithCustomer', () => {
  it('tracks CHANGES_REQUESTED alone', () => {
    expect(jobIsWithCustomer({ state: 'CHANGES_REQUESTED' })).toBe(true);
    expect(jobIsWithCustomer({ state: 'SUBMITTED' })).toBe(false);
  });
});

describe('editingBlockedMessage', () => {
  it('names acceptance explicitly and points at the comments', () => {
    const msg = editingBlockedMessage({ state: 'ACCEPTED' });
    expect(msg).toMatch(/accepted/i);
    expect(msg).toMatch(/comments section/i);
  });

  it('explains an approval request rather than just refusing', () => {
    expect(editingBlockedMessage({ state: 'CHANGES_REQUESTED' })).toMatch(/approve it rather than change it/i);
  });

  it('always points at the comments, whatever the state', () => {
    for (const state of ['ACCEPTED', 'CHANGES_REQUESTED', 'CLOSED', 'QUEUED', undefined]) {
      expect(editingBlockedMessage({ state })).toMatch(/comments section/i);
    }
  });
});
