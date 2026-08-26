import { describe, expect, it } from 'vitest';
import { deriveCustomerCategory, isExternalCustomerClaims, isInternalCustomerClaims, DEFAULT_CUSTOMER_CATEGORY, type CustomerCategory } from './customerCategory';

/**
 * This table is the same table as `damplab-backend/src/pricing/pricing-groups.spec.ts`.
 * The two packages share no code, so keeping the tables identical is the only thing
 * stopping the checkout estimate and the invoice from disagreeing again.
 */
const FIXTURES: { name: string; claims: string[]; expected: CustomerCategory | undefined }[] = [
  { name: 'no claims at all', claims: [], expected: undefined },
  { name: 'unrelated claims only', claims: ['damplab-staff', 'offline_access'], expected: undefined },
  { name: 'internal-customers group', claims: ['internal-customers'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'internal-customer legacy role', claims: ['internal-customer'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'external-customer-academic group', claims: ['external-customer-academic'], expected: 'EXTERNAL_CUSTOMER_ACADEMIC' },
  { name: 'external-customer-market group', claims: ['external-customer-market'], expected: 'EXTERNAL_CUSTOMER_MARKET' },
  { name: 'external-customer-no-salary group', claims: ['external-customer-no-salary'], expected: 'EXTERNAL_CUSTOMER_NO_SALARY' },
  { name: 'external-customers group (the bug this phase fixes)', claims: ['external-customers'], expected: 'EXTERNAL_CUSTOMER_MARKET' },
  { name: 'external-customers group path', claims: ['/external-customers'], expected: 'EXTERNAL_CUSTOMER_MARKET' },
  { name: 'external-customer legacy role', claims: ['external-customer'], expected: 'EXTERNAL_CUSTOMER_MARKET' },
  { name: 'internal-customers beats external-customer-market', claims: ['external-customer-market', 'internal-customers'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'internal-customer (singular) beats external-customer-market', claims: ['external-customer-market', 'internal-customer'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'internal-customer (singular) beats external-customer-academic', claims: ['external-customer-academic', 'internal-customer'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'internal-customer (singular) beats external-customer-no-salary', claims: ['external-customer-no-salary', 'internal-customer'], expected: 'INTERNAL_CUSTOMERS' },
  { name: 'a specific external tier beats the default external group', claims: ['external-customers', 'external-customer-academic'], expected: 'EXTERNAL_CUSTOMER_ACADEMIC' },
  { name: 'academic pricing survives the equipment-user access group', claims: ['external-customer-academic', 'client-unassisted-equipment-users'], expected: 'EXTERNAL_CUSTOMER_ACADEMIC' },
  { name: 'technician access group carries no price', claims: ['technician'], expected: undefined },
];

describe('deriveCustomerCategory (frontend mirror of the backend derivation)', () => {
  it.each(FIXTURES)('$name', ({ claims, expected }) => {
    expect(deriveCustomerCategory(claims)).toBe(expected);
  });

  it('puts the legacy singular internal role FIRST, as the backend does', () => {
    // The regression this replaces: internal-customer used to be checked fifth,
    // after the three specific external tiers, so this user was quoted market
    // rates at checkout and invoiced at internal rates.
    expect(deriveCustomerCategory(['internal-customer', 'external-customer-market'])).toBe('INTERNAL_CUSTOMERS');
  });
});

describe('customer flags', () => {
  it('treats the plural default external group as an external customer', () => {
    expect(isExternalCustomerClaims(['external-customers'])).toBe(true);
    expect(isInternalCustomerClaims(['external-customers'])).toBe(false);
  });

  it('treats both internal spellings as internal', () => {
    expect(isInternalCustomerClaims(['internal-customers'])).toBe(true);
    expect(isInternalCustomerClaims(['internal-customer'])).toBe(true);
  });
});

describe('DEFAULT_CUSTOMER_CATEGORY', () => {
  it('is the market tier, never the internal one', () => {
    expect(DEFAULT_CUSTOMER_CATEGORY).toBe('EXTERNAL_CUSTOMER_MARKET');
  });
});
