import { ACCESS_TIERS } from '../constants/accessTiers';

/** The 16 stored roster fields, split by editor. Order is the human's. */
export const PROFILE_TEXT_FIELDS = ['position', 'instrumentType', 'group', 'start', 'end', 'firstName', 'lastName', 'buId', 'preferredEmail', 'swipeAccess', 'reportsTo', 'affiliations'] as const;
export const PROFILE_ENUM_FIELDS = ['status', 'swipeCategory', 'sciShieldTrainings', 'rohp'] as const;
export type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];
export type ProfileEnumField = (typeof PROFILE_ENUM_FIELDS)[number];
export type ProfileField = ProfileTextField | ProfileEnumField;
const PROFILE_FIELDS: readonly ProfileField[] = [...PROFILE_TEXT_FIELDS, ...PROFILE_ENUM_FIELDS];

export type Option = { value: string; label: string };

/** Values are the backend GraphQL enums; labels are the human's exact strings. */
export const ENUM_OPTIONS: Record<ProfileEnumField, Option[]> = {
  status: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'ONBOARDING', label: 'Onboarding' }
  ],
  swipeCategory: [
    { value: 'DAMP_USER', label: 'DAMP User' },
    { value: 'DAMP_PERSONNEL', label: 'DAMP Personnel' }
  ],
  sciShieldTrainings: [
    { value: 'COMPLETE', label: 'Complete' },
    { value: 'NEED', label: 'Need' },
    { value: 'CERTIFICATES', label: 'Certificates' },
    { value: 'NA_BSL1', label: 'N/A BSL1' }
  ],
  rohp: [
    { value: 'NA', label: 'N/A' },
    { value: 'NEED', label: 'Need' },
    { value: 'COMPLETE', label: 'Complete' }
  ]
};

/** The pricing select, unchanged from the old table. '' clears every pricing group. */
export const PRICING_OPTIONS: Option[] = [
  { value: '', label: 'None (clear category groups)' },
  { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
  { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External — academic' },
  { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External — market' },
  { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External — no salary' }
];

export type CustomerColumnField = 'name' | 'username' | 'email' | 'pricingCategory' | 'accessTier' | 'canBookWithoutApproval' | ProfileField;

export interface CustomerColumnSpec {
  field: CustomerColumnField;
  headerName: string;
  kind: 'readonly' | 'text' | 'enum' | 'boolean' | 'pricing' | 'tier';
  defaultVisible: boolean;
}

const text = (field: ProfileTextField, headerName: string): CustomerColumnSpec => ({ field, headerName, kind: 'text', defaultVisible: false });
const choice = (field: ProfileEnumField, headerName: string, defaultVisible = false): CustomerColumnSpec => ({ field, headerName, kind: 'enum', defaultVisible });

/** Every column the grid offers, in order. Headers are the human's labels verbatim. */
export const CUSTOMER_COLUMNS: readonly CustomerColumnSpec[] = [
  { field: 'name', headerName: 'Name', kind: 'readonly', defaultVisible: true },
  { field: 'username', headerName: 'Username', kind: 'readonly', defaultVisible: false },
  { field: 'email', headerName: 'Email', kind: 'readonly', defaultVisible: true },
  { field: 'pricingCategory', headerName: 'Pricing category', kind: 'pricing', defaultVisible: true },
  { field: 'accessTier', headerName: 'Access tier', kind: 'tier', defaultVisible: true },
  { field: 'canBookWithoutApproval', headerName: 'Can book without approval', kind: 'boolean', defaultVisible: true },
  text('position', 'Position'),
  text('instrumentType', 'Instrument type'),
  text('group', 'Group'),
  text('start', 'Start'),
  text('end', 'End'),
  choice('status', 'Status', true),
  text('firstName', 'First Name'),
  text('lastName', 'Last Name'),
  text('buId', 'BU ID'),
  text('preferredEmail', 'Preferred Email'),
  choice('swipeCategory', 'Swipe Category (For Daniel)'),
  text('swipeAccess', 'Swipe Access'),
  text('reportsTo', 'Reports To'),
  choice('sciShieldTrainings', 'SciShield Trainings'),
  choice('rohp', 'ROHP'),
  text('affiliations', 'Affiliations')
];

export function defaultColumnVisibility(): Record<string, boolean> {
  return Object.fromEntries(CUSTOMER_COLUMNS.map((c) => [c.field, c.defaultVisible]));
}

const VISIBILITY_KEY = 'customerManagement:columnVisibility';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

/** This browser's column choice over the defaults. Anything unreadable falls back to the defaults. */
export function readColumnVisibility(store: Store | null = browserStore()): Record<string, boolean> {
  const model = defaultColumnVisibility();
  try {
    const raw = store?.getItem(VISIBILITY_KEY);
    if (!raw) return model;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return model;
    for (const field of Object.keys(model)) {
      if (typeof parsed[field] === 'boolean') model[field] = parsed[field];
    }
    return model;
  } catch {
    return defaultColumnVisibility();
  }
}

export function storeColumnVisibility(model: Record<string, boolean>, store: Store | null = browserStore()): void {
  try {
    store?.setItem(VISIBILITY_KEY, JSON.stringify(model));
  } catch {
    // A convenience; a full or blocked store must not break the page.
  }
}

/** A row as the list and search queries return it. */
export interface CustomerUser {
  id: string;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  customerCategory?: string | null;
  isDefaultExternalCustomer?: boolean | null;
  accessTier?: string | null;
  profile?: ({ canBookWithoutApproval?: boolean | null } & Partial<Record<ProfileField, string | null>>) | null;
}

/**
 * One grid row. `name` comes from Keycloak; `firstName` / `lastName` are the STORED
 * fields and never the Keycloak ones, which is what keeps them independent.
 * Missing values are '' so the grid's editors and filters see strings.
 */
export type CustomerRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  pricingCategory: string;
  isDefaultExternalCustomer: boolean;
  accessTier: string;
  canBookWithoutApproval: boolean;
} & Record<ProfileField, string>;

export function rowFromUser(u: CustomerUser): CustomerRow {
  const keycloakName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  const row: Record<string, unknown> = {
    id: u.id,
    name: keycloakName || u.username || u.email || u.id,
    username: u.username ?? '',
    email: u.email ?? '',
    // A legacy default-external user shows as "None", as the old table did.
    pricingCategory: u.isDefaultExternalCustomer ? '' : (u.customerCategory ?? ''),
    isDefaultExternalCustomer: u.isDefaultExternalCustomer === true,
    accessTier: u.accessTier ?? ACCESS_TIERS.Client,
    canBookWithoutApproval: u.profile?.canBookWithoutApproval === true
  };
  for (const f of PROFILE_FIELDS) row[f] = u.profile?.[f] ?? '';
  return row as CustomerRow;
}

export interface RowSavePlan {
  /** null clears every pricing group. */
  category?: string | null;
  tier?: string;
  profile?: Record<string, string | boolean | null>;
}

/** The mutations a Save needs: only the axes whose values changed. A cleared field is sent as null (an enum cannot carry ''). */
export function planRowSave(before: CustomerRow, after: CustomerRow): RowSavePlan {
  const plan: RowSavePlan = {};
  if (after.pricingCategory !== before.pricingCategory) plan.category = after.pricingCategory === '' ? null : after.pricingCategory;
  if (after.accessTier !== before.accessTier) plan.tier = after.accessTier;
  const profile: Record<string, string | boolean | null> = {};
  if (after.canBookWithoutApproval !== before.canBookWithoutApproval) profile.canBookWithoutApproval = after.canBookWithoutApproval;
  for (const f of PROFILE_FIELDS) {
    const next = String(after[f] ?? '').trim();
    if (next !== String(before[f] ?? '').trim()) profile[f] = next === '' ? null : next;
  }
  if (Object.keys(profile).length) plan.profile = profile;
  return plan;
}

export interface RowSaveCalls {
  setCategory: (category: string | null) => Promise<unknown>;
  setTier: (tier: string) => Promise<{ accessRoleMapped?: boolean | null } | null | undefined>;
  updateProfile: (input: Record<string, string | boolean | null>) => Promise<unknown>;
}

/** A Save that failed partway: `saved` holds the row fields whose mutation did succeed. */
export class RowSaveError extends Error {
  constructor(
    readonly failure: unknown,
    readonly saved: Partial<CustomerRow>
  ) {
    super(failure instanceof Error ? failure.message : String(failure));
    this.name = 'RowSaveError';
  }
}

/**
 * Run the planned mutations in order — pricing, access, profile — and stop at the
 * first failure. Pricing and access stay separate calls so neither carries the
 * other's value.
 */
export async function saveRow(before: CustomerRow, after: CustomerRow, calls: RowSaveCalls): Promise<{ accessRoleMapped: boolean | null }> {
  const plan = planRowSave(before, after);
  const saved: Partial<CustomerRow> = {};
  let accessRoleMapped: boolean | null = null;
  try {
    if ('category' in plan) {
      await calls.setCategory(plan.category ?? null);
      saved.pricingCategory = after.pricingCategory;
    }
    if (plan.tier !== undefined) {
      const result = await calls.setTier(plan.tier);
      accessRoleMapped = result?.accessRoleMapped ?? null;
      saved.accessTier = after.accessTier;
    }
    if (plan.profile) {
      await calls.updateProfile(plan.profile);
    }
  } catch (failure) {
    throw new RowSaveError(failure, saved);
  }
  return { accessRoleMapped };
}

/**
 * The STAFF list filter's tiers. The server resolves STAFF from KEYCLOAK_LAB_STAFF_GROUP_NAMES
 * (default damplab-staff,technician); this copy narrows only search results, which come back
 * unfiltered. Change both together.
 */
const STAFF_TIERS: readonly string[] = [ACCESS_TIERS.Administrator, ACCESS_TIERS.Technician];

/** Search results narrowed by the selected "Show users" category, exactly as the old table did. */
export function narrowSearchResults(users: CustomerUser[], category: string): CustomerUser[] {
  if (category === 'ALL') return users;
  if (category === 'STAFF') return users.filter((u) => STAFF_TIERS.includes(u.accessTier ?? ACCESS_TIERS.Client));
  if (category === 'EXTERNAL_CUSTOMER_DEFAULT') return users.filter((u) => u.isDefaultExternalCustomer === true);
  return users.filter((u) => (u.customerCategory ?? '') === category && !u.isDefaultExternalCustomer);
}
