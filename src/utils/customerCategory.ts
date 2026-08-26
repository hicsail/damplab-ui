/**
 * The frontend's copy of the pricing derivation.
 *
 * `damplab-ui` and `damplab-backend` are separate npm packages sharing no code, so
 * this is deliberately a mirror of `damplab-backend/src/pricing/pricing-groups.ts`
 * rather than an import. What keeps the two honest is the fixture table: the cases
 * in `customerCategory.test.ts` are the same cases as `pricing-groups.spec.ts`.
 *
 * The precedence matters. This file used to defer the legacy singular
 * `internal-customer` role to *fifth* while the backend put it first, so a user in
 * both `internal-customer` and `external-customer-market` saw a market estimate at
 * checkout and was invoiced at internal rates.
 */
export type CustomerCategory = 'INTERNAL_CUSTOMERS' | 'EXTERNAL_CUSTOMER_ACADEMIC' | 'EXTERNAL_CUSTOMER_MARKET' | 'EXTERNAL_CUSTOMER_NO_SALARY';

/** Keycloak group names. Plural — the realm's roles are the singular spellings. */
export const PRICING_GROUP = {
  INTERNAL_CUSTOMERS: 'internal-customers',
  EXTERNAL_CUSTOMERS: 'external-customers',
  EXTERNAL_CUSTOMER_ACADEMIC: 'external-customer-academic',
  EXTERNAL_CUSTOMER_MARKET: 'external-customer-market',
  EXTERNAL_CUSTOMER_NO_SALARY: 'external-customer-no-salary',
} as const;

/** Legacy realm roles granted by the pricing groups' role mappings. */
export const LEGACY_PRICING_ROLE = {
  INTERNAL_CUSTOMER: 'internal-customer',
  EXTERNAL_CUSTOMER: 'external-customer',
} as const;

/**
 * The category a user with no pricing membership at all is quoted at.
 *
 * Everywhere that needs a default must use this one — `BookInventory` used to fall
 * back to `legacy ?? internal ?? external`, quoting an uncategorised user the
 * *cheapest* tier, while every other site defaulted to legacy or market.
 */
export const DEFAULT_CUSTOMER_CATEGORY: CustomerCategory = 'EXTERNAL_CUSTOMER_MARKET';

function claimMatches(entry: string, name: string): boolean {
  return entry === name || entry.endsWith(`/${name}`);
}

/**
 * Derive a pricing category from a user's realm roles plus `groups` claim.
 *
 * Mirrors `deriveCustomerCategory` in the backend, precedence included: internal
 * (either spelling) first, then the three specific external tiers, then the default
 * external group — which maps to EXTERNAL_CUSTOMER_MARKET.
 */
export function deriveCustomerCategory(claims: readonly string[]): CustomerCategory | undefined {
  const has = (name: string) => claims.some((entry) => claimMatches(entry, name));
  if (has(PRICING_GROUP.INTERNAL_CUSTOMERS) || has(LEGACY_PRICING_ROLE.INTERNAL_CUSTOMER)) return 'INTERNAL_CUSTOMERS';
  if (has(PRICING_GROUP.EXTERNAL_CUSTOMER_ACADEMIC)) return 'EXTERNAL_CUSTOMER_ACADEMIC';
  if (has(PRICING_GROUP.EXTERNAL_CUSTOMER_MARKET)) return 'EXTERNAL_CUSTOMER_MARKET';
  if (has(PRICING_GROUP.EXTERNAL_CUSTOMER_NO_SALARY)) return 'EXTERNAL_CUSTOMER_NO_SALARY';
  if (has(PRICING_GROUP.EXTERNAL_CUSTOMERS) || has(LEGACY_PRICING_ROLE.EXTERNAL_CUSTOMER)) return 'EXTERNAL_CUSTOMER_MARKET';
  return undefined;
}

/** True if the user sits in any internal pricing group. */
export function isInternalCustomerClaims(claims: readonly string[]): boolean {
  const has = (name: string) => claims.some((entry) => claimMatches(entry, name));
  return has(PRICING_GROUP.INTERNAL_CUSTOMERS) || has(LEGACY_PRICING_ROLE.INTERNAL_CUSTOMER);
}

/** True if the user sits in any external pricing group. */
export function isExternalCustomerClaims(claims: readonly string[]): boolean {
  const has = (name: string) => claims.some((entry) => claimMatches(entry, name));
  return (
    has(PRICING_GROUP.EXTERNAL_CUSTOMER_ACADEMIC) ||
    has(PRICING_GROUP.EXTERNAL_CUSTOMER_MARKET) ||
    has(PRICING_GROUP.EXTERNAL_CUSTOMER_NO_SALARY) ||
    has(PRICING_GROUP.EXTERNAL_CUSTOMERS) ||
    has(LEGACY_PRICING_ROLE.EXTERNAL_CUSTOMER)
  );
}
