import { describe, expect, it } from 'vitest';
import { billedCustomerCategory, buildInvoicePricingNote, buildVoidNotice, invoiceMoney } from './JobInvoiceDocument';

/**
 * The invoice has to state the same pricing basis the SOW's Fee Schedule does.
 * buildFeeSchedule (damplab-backend/src/sow/sow-field-calculator.ts) prints
 * "$50.00 x 4 = $200.00" from unitCost/multiplier/cost; these assert this side
 * of that agreement, including the case where there is no breakdown to state.
 */
describe('buildInvoicePricingNote', () => {
  it('words the breakdown exactly as the Fee Schedule does', () => {
    expect(buildInvoicePricingNote({ unitCost: 50, multiplier: 4, cost: 200 })).toBe('$50.00 x 4 = $200.00');
  });

  it('names the run count when that is what multiplied the line', () => {
    expect(buildInvoicePricingNote({ unitCost: 50, multiplier: 4, runCount: 4, cost: 200 })).toBe('$50.00 x 4 = $200.00\nNumber of runs: 4');
  });

  it.each([
    ['a legacy line with no unit price', { cost: 200 }],
    ['an explicitly absent unit price', { unitCost: null, multiplier: 4, cost: 200 }],
    ['a line that was not multiplied', { unitCost: 200, multiplier: 1, cost: 200 }],
    ['a non-numeric multiplier', { unitCost: 50, multiplier: 'four', cost: 200 }]
  ])('says nothing rather than inventing a figure for %s', (_label, row) => {
    expect(buildInvoicePricingNote(row)).toBe('');
  });

  it('keeps a zero unit price, which is a real price and not an absent one', () => {
    // The distinction the null guard exists for: `== null` rather than falsy.
    expect(buildInvoicePricingNote({ unitCost: 0, multiplier: 3, cost: 0 })).toBe('$0.00 x 3 = $0.00');
  });

  it('does not print trailing zeros on a fractional multiplier', () => {
    expect(buildInvoicePricingNote({ unitCost: 10, multiplier: 2.5, cost: 25 })).toBe('$10.00 x 2.5 = $25.00');
  });
});

describe('buildInvoicePricingNote: parameter-priced lines', () => {
  const details = [
    { label: 'Instrument: Bioanalyzer', quantity: 1, unitPrice: 100, total: 100 },
    { label: 'Hours in use', quantity: 3, unitPrice: 40, total: 120 }
  ];

  it('itemises the selections on a line with no multiplier to describe', () => {
    // The gap this closes: multiplier 1 suppressed the "x N =" form, so the
    // customer saw a bare $220.00 and no indication of what drove it.
    expect(buildInvoicePricingNote({ cost: 220, unitCost: 220, multiplier: 1, pricingDetails: details })).toBe(
      'Instrument: Bioanalyzer — 1 x $100.00 = $100.00\nHours in use — 3 x $40.00 = $120.00'
    );
  });

  it('shows the itemisation above the multiplier when a line has both', () => {
    const note = buildInvoicePricingNote({ cost: 440, unitCost: 220, multiplier: 2, pricingDetails: details });
    expect(note.split('\n')).toEqual([
      'Instrument: Bioanalyzer — 1 x $100.00 = $100.00',
      'Hours in use — 3 x $40.00 = $120.00',
      '$220.00 x 2 = $440.00'
    ]);
  });

  it('says nothing at all for a line with neither, exactly as before', () => {
    expect(buildInvoicePricingNote({ cost: 350, unitCost: 350, multiplier: 1 })).toBe('');
    expect(buildInvoicePricingNote({ cost: 350, unitCost: 350, multiplier: 1, pricingDetails: [] })).toBe('');
  });

  it('skips a row with no label rather than printing a dangling dash', () => {
    expect(buildInvoicePricingNote({ cost: 10, multiplier: 1, pricingDetails: [{ label: '  ', quantity: 1, unitPrice: 10, total: 10 }] })).toBe('');
  });
});


describe('buildVoidNotice', () => {
  // A voided invoice stays downloadable — the client may already hold the copy
  // that was sent — so the document itself has to say it is not payable.
  const voided = { voidedAt: '2026-09-08T15:00:00.000Z', voidedBy: 'tech@bu.edu', voidReason: 'Billed the wrong customer' };

  it('renders nothing for a live invoice', () => {
    expect(buildVoidNotice({ voidedAt: null })).toBeNull();
    expect(buildVoidNotice(null)).toBeNull();
    expect(buildVoidNotice(undefined)).toBeNull();
  });

  it('says the invoice is not payable, in words', () => {
    expect(buildVoidNotice(voided)?.title).toBe('VOID — THIS INVOICE IS NOT PAYABLE');
  });

  it('records who voided it and when', () => {
    expect(buildVoidNotice(voided)?.attribution).toBe('Voided on 09/08/2026 by tech@bu.edu.');
  });

  it('prints the reason the client will read', () => {
    expect(buildVoidNotice(voided)?.reason).toBe('Reason: Billed the wrong customer');
  });

  it('never leaves the reason blank, which would read as a rendering fault', () => {
    expect(buildVoidNotice({ voidedAt: voided.voidedAt, voidReason: '   ' })?.reason).toBe('Reason: not recorded');
  });

  it('omits the attribution parts it does not have', () => {
    expect(buildVoidNotice({ voidedAt: voided.voidedAt })?.attribution).toBe('Voided on 09/08/2026.');
  });
});

describe('billedCustomerCategory', () => {
  // Not cosmetic: this decides INTERNAL vs EXTERNAL in the header and which
  // payment block prints. Reading the live job made a re-categorised job reprint
  // an old invoice telling an external customer to file an internal ISR.
  it('prefers what the invoice recorded over what the job says today', () => {
    expect(billedCustomerCategory({ customerCategory: 'EXTERNAL_CUSTOMER_ACADEMIC' }, 'INTERNAL_CUSTOMERS')).toBe('EXTERNAL_CUSTOMER_ACADEMIC');
  });

  it('falls back to the live job for an invoice written before this was recorded', () => {
    expect(billedCustomerCategory({}, 'INTERNAL_CUSTOMERS')).toBe('INTERNAL_CUSTOMERS');
    expect(billedCustomerCategory(null, 'INTERNAL_CUSTOMERS')).toBe('INTERNAL_CUSTOMERS');
  });

  it('treats an empty recorded category as absent rather than as a category', () => {
    expect(billedCustomerCategory({ customerCategory: '   ' }, 'INTERNAL_CUSTOMERS')).toBe('INTERNAL_CUSTOMERS');
  });

  it('is null when neither knows, so the caller renders the external default', () => {
    expect(billedCustomerCategory({}, null)).toBeNull();
    expect(billedCustomerCategory({}, undefined)).toBeNull();
  });
});

describe('invoiceMoney: an invoice prints only its own lines', () => {
  it('uses the invoice’s own figures when it has them', () => {
    const money = invoiceMoney({ services: [{ cost: 100 }, { cost: 50 }], subtotal: 150, totalCost: 120 });
    expect(money).toMatchObject({ lineItemSum: 150, subtotal: 150, total: 120 });
  });

  it('renders an empty legacy invoice as zero rather than borrowing the SOW’s lines', () => {
    // The removed fallback fed the TOTALS, not just the line list, so an invoice
    // with no services printed the SOW's raw line sum — the discount dropped.
    // There is now no shape of input that can make this read anything but zero.
    expect(invoiceMoney({ services: [] })).toMatchObject({ services: [], lineItemSum: 0, subtotal: 0, total: 0 });
    expect(invoiceMoney({})).toMatchObject({ services: [], subtotal: 0, total: 0 });
    expect(invoiceMoney(null)).toMatchObject({ services: [], subtotal: 0, total: 0 });
  });

  it('falls back to the line sum for invoices predating adjustments, staying within its own figures', () => {
    const money = invoiceMoney({ services: [{ cost: 100 }, { cost: 50 }] });
    expect(money).toMatchObject({ subtotal: 150, total: 150 });
  });

  it('keeps a genuine zero total rather than treating it as absent', () => {
    // An over-large discount floors the total at zero server-side; `!= null` is
    // what stops that becoming the line sum again.
    expect(invoiceMoney({ services: [{ cost: 100 }], subtotal: 100, totalCost: 0 }).total).toBe(0);
  });

  it('ignores a line whose cost is missing or unparseable', () => {
    expect(invoiceMoney({ services: [{ cost: 100 }, { cost: null }, { cost: 'x' }, {}] }).lineItemSum).toBe(100);
  });
});
