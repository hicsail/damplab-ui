import { describe, it, expect } from 'vitest';
import {
  awaitingCustomerApproval,
  customerMayEdit,
  editingBlockedMessage,
  jobIsWithCustomer,
  needsReply,
  technicianCustomerActionCopy,
  needsWorkflowApproval,
  needsWorkflowEdit
} from './jobEditing';

describe('customerMayEdit', () => {
  it('requires both a change request and an explicit editing grant', () => {
    expect(customerMayEdit({ state: 'CHANGES_REQUESTED', customerEditingEnabled: true })).toBe(true);
    expect(customerMayEdit({ state: 'ACCEPTED', customerEditingEnabled: true })).toBe(false);
    expect(customerMayEdit({ state: 'CHANGES_REQUESTED', customerEditingEnabled: false })).toBe(false);
  });

  it('locks an unread or unwritten flag', () => {
    expect(customerMayEdit(null)).toBe(false);
    expect(customerMayEdit(undefined)).toBe(false);
    expect(customerMayEdit({ state: 'CHANGES_REQUESTED' })).toBe(false);
  });
});

describe('explicit customer actions', () => {
  it('recognizes only the requested action while the job is with the customer', () => {
    const reply = { state: 'CHANGES_REQUESTED', customerActionRequired: 'REPLY' as const };
    const edit = { state: 'CHANGES_REQUESTED', customerActionRequired: 'EDIT_WORKFLOW' as const };
    const approve = { state: 'CHANGES_REQUESTED', customerActionRequired: 'APPROVE_WORKFLOW' as const };

    expect([needsReply(reply), needsWorkflowEdit(reply), needsWorkflowApproval(reply)]).toEqual([true, false, false]);
    expect([needsReply(edit), needsWorkflowEdit(edit), needsWorkflowApproval(edit)]).toEqual([false, true, false]);
    expect([needsReply(approve), needsWorkflowEdit(approve), needsWorkflowApproval(approve)]).toEqual([false, false, true]);
  });

  it('ignores stale actions outside CHANGES_REQUESTED', () => {
    const stale = { state: 'ACCEPTED', customerActionRequired: 'APPROVE_WORKFLOW' as const };
    expect(needsReply(stale)).toBe(false);
    expect(needsWorkflowEdit(stale)).toBe(false);
    expect(needsWorkflowApproval(stale)).toBe(false);
  });
});

describe('awaitingCustomerApproval', () => {
  it('is a compatibility alias for the explicit approval action', () => {
    expect(awaitingCustomerApproval({ state: 'CHANGES_REQUESTED', customerActionRequired: 'APPROVE_WORKFLOW' })).toBe(true);
  });

  it('does not infer approval from editing being disabled', () => {
    expect(awaitingCustomerApproval({ state: 'CHANGES_REQUESTED', customerEditingEnabled: false, customerActionRequired: 'REPLY' })).toBe(false);
    expect(awaitingCustomerApproval({ state: 'CHANGES_REQUESTED', customerEditingEnabled: false })).toBe(false);
  });

  it('ignores a stale approval action outside CHANGES_REQUESTED', () => {
    expect(awaitingCustomerApproval({ state: 'ACCEPTED', customerActionRequired: 'APPROVE_WORKFLOW' })).toBe(false);
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

  it('distinguishes a requested reply from a requested approval', () => {
    expect(editingBlockedMessage({ state: 'CHANGES_REQUESTED', customerActionRequired: 'REPLY' })).toMatch(/reply/i);
    expect(editingBlockedMessage({ state: 'CHANGES_REQUESTED', customerActionRequired: 'APPROVE_WORKFLOW' })).toMatch(/approve/i);
  });

  it('does not describe an unknown read-only handoff as approval', () => {
    const message = editingBlockedMessage({ state: 'CHANGES_REQUESTED' });
    expect(message).toMatch(/not enabled/i);
    expect(message).not.toMatch(/approve/i);
  });

  it('always points at the comments, whatever the state', () => {
    for (const state of ['ACCEPTED', 'CHANGES_REQUESTED', 'CLOSED', 'QUEUED', undefined]) {
      expect(editingBlockedMessage({ state })).toMatch(/comments section/i);
    }
  });
});

describe('technicianCustomerActionCopy', () => {
  it('uses the explicit requested action for technician lifecycle copy', () => {
    expect(technicianCustomerActionCopy({ state: 'CHANGES_REQUESTED', customerActionRequired: 'REPLY' })).toMatch(/waiting.*reply/i);
    expect(technicianCustomerActionCopy({ state: 'CHANGES_REQUESTED', customerActionRequired: 'EDIT_WORKFLOW' })).toMatch(/edit.*resubmit/i);
    expect(technicianCustomerActionCopy({ state: 'CHANGES_REQUESTED', customerActionRequired: 'APPROVE_WORKFLOW' })).toMatch(/waiting.*approval/i);
  });

  it('uses conservative repair copy when the explicit action is missing', () => {
    const message = technicianCustomerActionCopy({ state: 'CHANGES_REQUESTED', customerEditingEnabled: true });
    expect(message).toMatch(/action.*unavailable|repair/i);
    expect(message).not.toMatch(/approval|edit and resubmit|waiting for.*reply/i);
  });
});
