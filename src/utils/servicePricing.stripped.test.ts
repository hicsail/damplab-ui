import { describe, expect, it } from 'vitest';
import { calculateServiceCost } from './servicePricing';

/**
 * Phase D made the server strip every pricing tier the caller is not in, on the
 * *shared* `services` query that the canvas fetches into AppContext. That closed a
 * leak — and it changed the shape of the data every price display in this app reads.
 *
 * The failure mode it created is silent and expensive: a client builds a workflow
 * and every node quotes $0 or blank. Nothing throws; the number is just gone.
 *
 * The fixtures below are **real responses**, captured from the running backend with
 * `DEV_AS_ROLES` set to each pricing group, for the seeded "Normalization" service
 * (internal 0.01, academic 0.02, market 0.03, no-salary 0.04, legacy 0.05). If the
 * strip is ever tightened further, these are what fail.
 */

const STRIPPED_FOR = {
  admin: {
    price: 0.05,
    internalPrice: 0.01,
    externalPrice: 0.03,
    pricingMode: 'SERVICE',
    pricing: { internal: 0.01, external: null, externalAcademic: 0.02, externalMarket: 0.03, externalNoSalary: 0.04, legacy: 0.05 }
  },
  internal: {
    price: 0.05,
    internalPrice: 0.01,
    externalPrice: null,
    pricingMode: 'SERVICE',
    pricing: { internal: 0.01, external: null, externalAcademic: null, externalMarket: null, externalNoSalary: null, legacy: 0.05 }
  },
  academic: {
    price: 0.05,
    internalPrice: null,
    externalPrice: 0.03,
    pricingMode: 'SERVICE',
    pricing: { internal: null, external: null, externalAcademic: 0.02, externalMarket: null, externalNoSalary: null, legacy: 0.05 }
  },
  uncategorised: {
    price: 0.05,
    internalPrice: null,
    externalPrice: 0.03,
    pricingMode: 'SERVICE',
    pricing: { internal: null, external: null, externalAcademic: null, externalMarket: null, externalNoSalary: null, legacy: 0.05 }
  }
} as const;

describe('canvas pricing still works against server-stripped payloads', () => {
  it('quotes an internal customer their own rate, from what they were actually sent', () => {
    expect(calculateServiceCost(STRIPPED_FOR.internal as any, {}, undefined, 'INTERNAL_CUSTOMERS')).toBe(0.01);
  });

  it('quotes an academic customer their own rate', () => {
    expect(calculateServiceCost(STRIPPED_FOR.academic as any, {}, undefined, 'EXTERNAL_CUSTOMER_ACADEMIC')).toBe(0.02);
  });

  it('quotes an uncategorised caller the legacy rate rather than nothing', () => {
    expect(calculateServiceCost(STRIPPED_FOR.uncategorised as any, {}, undefined, undefined)).toBe(0.05);
  });

  it('still quotes staff every tier, because nothing is stripped for them', () => {
    expect(calculateServiceCost(STRIPPED_FOR.admin as any, {}, undefined, 'INTERNAL_CUSTOMERS')).toBe(0.01);
    expect(calculateServiceCost(STRIPPED_FOR.admin as any, {}, undefined, 'EXTERNAL_CUSTOMER_MARKET')).toBe(0.03);
    expect(calculateServiceCost(STRIPPED_FOR.admin as any, {}, undefined, 'EXTERNAL_CUSTOMER_NO_SALARY')).toBe(0.04);
  });

  it('never quotes a non-staff caller a tier they were not sent', () => {
    // The whole point: an internal customer's payload cannot yield the market
    // rate even if something asks for it, because the number is not there.
    expect(calculateServiceCost(STRIPPED_FOR.internal as any, {}, undefined, 'EXTERNAL_CUSTOMER_MARKET')).toBe(0.05);
    expect(calculateServiceCost(STRIPPED_FOR.academic as any, {}, undefined, 'INTERNAL_CUSTOMERS')).toBe(0.05);
  });

  it('does not leak the external rate to an internal customer through externalPrice', () => {
    // `externalPrice` on this record holds 0.03 — the market rate. It is withheld
    // from internal customers specifically, because their chain never reads it and
    // handing it over would have made the tier strip leak the number it hides.
    expect(STRIPPED_FOR.internal.externalPrice).toBeNull();
    expect(STRIPPED_FOR.academic.externalPrice).toBe(0.03);
  });
});
