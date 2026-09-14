import { describe, it, expect } from 'vitest';
import { canInvoice, invoiceBlockedMessage } from './invoiceGate';

const versioned = [{ status: 'SENT' }];
const withFinal = [{ status: 'SENT' }, { status: 'FINAL' }];

describe('invoiceBlockedMessage', () => {
  it('allows a countersigned SOW, the only thing an invoice bills', () => {
    expect(invoiceBlockedMessage({ activeStatus: 'FINAL', versions: withFinal })).toBeNull();
    expect(canInvoice({ activeStatus: 'FINAL', versions: withFinal })).toBe(true);
  });

  it('blocks SENT and SIGNED, which are agreement by at most one party', () => {
    expect(invoiceBlockedMessage({ activeStatus: 'SENT', versions: versioned })).toMatch(/not been countersigned yet/i);
    expect(invoiceBlockedMessage({ activeStatus: 'SIGNED', versions: versioned })).toMatch(/not been countersigned yet/i);
  });

  it('blocks a cancelled SOW in its own words', () => {
    expect(invoiceBlockedMessage({ activeStatus: 'CANCELLED', versions: withFinal })).toMatch(/cancelled/i);
  });

  it('tells a withdrawn SOW apart from one never countersigned', () => {
    // The whole reason this reads the version list rather than just the pointer.
    expect(invoiceBlockedMessage({ activeStatus: null, versions: withFinal })).toMatch(/withdrawn/i);
    expect(invoiceBlockedMessage({ activeStatus: null, versions: versioned })).not.toMatch(/withdrawn/i);
  });

  it('points a pre-versioning SOW at the migration', () => {
    expect(invoiceBlockedMessage({ activeStatus: null, versions: [] })).toMatch(/migration/i);
  });

  it('treats a SOW that has not loaded as blocked, never as invoiceable', () => {
    // Same direction as jobEditing.ts: offering a button the server will refuse is
    // the worse failure.
    expect(canInvoice(null)).toBe(false);
    expect(canInvoice(undefined)).toBe(false);
    expect(invoiceBlockedMessage(null)).toMatch(/no Statement of Work yet/i);
  });

  it('matches the backend wording, which is what makes the mirror worth having', () => {
    // These strings are duplicated from damplab-backend/src/sow/sow-access.ts on
    // purpose; if they drift, the button explains one thing and the refusal another.
    expect(invoiceBlockedMessage({ activeStatus: 'SENT', versions: versioned })).toBe(
      'This Statement of Work has not been countersigned yet. Countersign it before invoicing, so the invoice bills the figures both parties agreed.'
    );
    expect(invoiceBlockedMessage({ activeStatus: null, versions: withFinal })).toBe(
      'This Statement of Work was countersigned but has since been withdrawn, so no version is in force. Send and countersign it again before invoicing.'
    );
  });
});
