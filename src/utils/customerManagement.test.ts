import { describe, expect, it, vi } from 'vitest';
import {
  CUSTOMER_COLUMNS,
  ENUM_OPTIONS,
  PROFILE_ENUM_FIELDS,
  PROFILE_TEXT_FIELDS,
  RowSaveError,
  defaultColumnVisibility,
  planRowSave,
  readColumnVisibility,
  rowFromUser,
  saveRow,
  storeColumnVisibility,
  type CustomerRow
} from './customerManagement';

const fakeStore = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; } };
};

const user = (over: any = {}) => ({
  id: 'u-1',
  username: 'cara',
  email: 'cara@bu.edu',
  firstName: 'Cara',
  lastName: 'Kc',
  customerCategory: 'INTERNAL_CUSTOMERS',
  isDefaultExternalCustomer: false,
  accessTier: 'CLIENT',
  profile: { userSub: 'u-1', canBookWithoutApproval: false, position: 'Postdoc', status: 'ACTIVE', firstName: null, lastName: null },
  ...over
});

describe('columns', () => {
  it('offers every column the human listed, headers verbatim, 16 stored fields', () => {
    expect(CUSTOMER_COLUMNS.map((c) => c.headerName)).toEqual([
      'Name', 'Username', 'Email', 'Pricing category', 'Access tier', 'Can book without approval',
      'Position', 'Instrument type', 'Group', 'Start', 'End', 'Status', 'First Name', 'Last Name', 'BU ID',
      'Preferred Email', 'Swipe Category (For Daniel)', 'Swipe Access', 'Reports To', 'SciShield Trainings', 'ROHP', 'Affiliations'
    ]);
    expect(PROFILE_TEXT_FIELDS.length + PROFILE_ENUM_FIELDS.length).toBe(16);
  });

  it('shows Name, Email, Pricing category, Access tier, the flag and Status by default', () => {
    const v = defaultColumnVisibility();
    expect(Object.entries(v).filter(([, on]) => on).map(([f]) => f)).toEqual(['name', 'email', 'pricingCategory', 'accessTier', 'canBookWithoutApproval', 'status']);
    expect(Object.keys(v)).toHaveLength(22);
  });

  it('labels the dropdowns with the human’s exact strings', () => {
    expect(ENUM_OPTIONS.status.map((o) => o.label)).toEqual(['Active', 'Inactive', 'Onboarding']);
    expect(ENUM_OPTIONS.swipeCategory.map((o) => o.label)).toEqual(['DAMP User', 'DAMP Personnel']);
    expect(ENUM_OPTIONS.sciShieldTrainings.map((o) => [o.value, o.label])).toEqual([['COMPLETE', 'Complete'], ['NEED', 'Need'], ['CERTIFICATES', 'Certificates'], ['NA_BSL1', 'N/A BSL1']]);
    expect(ENUM_OPTIONS.rohp.map((o) => [o.value, o.label])).toEqual([['NA', 'N/A'], ['NEED', 'Need'], ['COMPLETE', 'Complete']]);
  });
});

describe('column visibility storage', () => {
  it('round-trips a choice, over the defaults', () => {
    const store = fakeStore();
    storeColumnVisibility({ ...defaultColumnVisibility(), buId: true, status: false }, store);
    const back = readColumnVisibility(store);
    expect(back.buId).toBe(true);
    expect(back.status).toBe(false);
    expect(back.name).toBe(true);
  });

  it('ignores unknown fields and non-boolean values', () => {
    const back = readColumnVisibility(fakeStore({ 'customerManagement:columnVisibility': JSON.stringify({ robots: true, buId: 'yes', group: true }) }));
    expect(back).not.toHaveProperty('robots');
    expect(back.buId).toBe(false);
    expect(back.group).toBe(true);
  });

  it('falls back to the defaults on garbage, a throwing store, or none', () => {
    expect(readColumnVisibility(fakeStore({ 'customerManagement:columnVisibility': '{not json' }))).toEqual(defaultColumnVisibility());
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(readColumnVisibility(broken)).toEqual(defaultColumnVisibility());
    expect(() => storeColumnVisibility(defaultColumnVisibility(), broken)).not.toThrow();
    expect(readColumnVisibility(null)).toEqual(defaultColumnVisibility());
  });
});

describe('rowFromUser', () => {
  it('names the row from Keycloak but keeps the stored first/last name separate', () => {
    const row = rowFromUser(user({ profile: { userSub: 'u-1', canBookWithoutApproval: true, firstName: 'Caroline', lastName: null } }));
    expect(row.name).toBe('Cara Kc');
    expect(row.firstName).toBe('Caroline');
    expect(row.lastName).toBe('');
    expect(row.canBookWithoutApproval).toBe(true);
  });

  it('shows a legacy default-external user as having no category, and a missing tier as Client', () => {
    const row = rowFromUser(user({ customerCategory: 'EXTERNAL_CUSTOMER_MARKET', isDefaultExternalCustomer: true, accessTier: null, profile: null }));
    expect(row.pricingCategory).toBe('');
    expect(row.accessTier).toBe('CLIENT');
    expect(row.status).toBe('');
    expect(row.canBookWithoutApproval).toBe(false);
  });
});

describe('planRowSave', () => {
  const before: CustomerRow = rowFromUser(user());

  it('plans nothing for an untouched row', () => {
    expect(planRowSave(before, { ...before })).toEqual({});
  });

  it('plans only the axes that changed', () => {
    expect(planRowSave(before, { ...before, accessTier: 'TECHNICIAN' })).toEqual({ tier: 'TECHNICIAN' });
    expect(planRowSave(before, { ...before, pricingCategory: '' })).toEqual({ category: null });
    expect(planRowSave(before, { ...before, canBookWithoutApproval: true, position: 'PI' })).toEqual({ profile: { canBookWithoutApproval: true, position: 'PI' } });
  });

  it('sends null to clear a text or dropdown field, and ignores whitespace-only edits', () => {
    expect(planRowSave(before, { ...before, position: '   ', status: '' })).toEqual({ profile: { position: null, status: null } });
    expect(planRowSave(before, { ...before, position: ' Postdoc ' })).toEqual({});
  });
});

describe('saveRow', () => {
  const before: CustomerRow = rowFromUser(user());
  const calls = () => ({
    setCategory: vi.fn(async () => undefined),
    setTier: vi.fn(async () => ({ accessRoleMapped: true })),
    updateProfile: vi.fn(async () => undefined)
  });

  it('calls only the mutations whose fields changed', async () => {
    const c = calls();
    await saveRow(before, { ...before, canBookWithoutApproval: true }, c);
    expect(c.setCategory).not.toHaveBeenCalled();
    expect(c.setTier).not.toHaveBeenCalled();
    expect(c.updateProfile).toHaveBeenCalledWith({ canBookWithoutApproval: true });
  });

  it('reports an unmapped access role', async () => {
    const c = calls();
    c.setTier.mockResolvedValueOnce({ accessRoleMapped: false });
    expect(await saveRow(before, { ...before, accessTier: 'TECHNICIAN' }, c)).toEqual({ accessRoleMapped: false });
  });

  it('on a failure, says which fields did save and stops there', async () => {
    const c = calls();
    const refusal = new Error('You cannot lower your own access tier');
    c.setTier.mockRejectedValueOnce(refusal);
    const after = { ...before, pricingCategory: 'EXTERNAL_CUSTOMER_ACADEMIC', accessTier: 'TECHNICIAN', position: 'PI' };
    const err = await saveRow(before, after, c).catch((e) => e);
    expect(err).toBeInstanceOf(RowSaveError);
    expect(err.failure).toBe(refusal);
    expect(err.saved).toEqual({ pricingCategory: 'EXTERNAL_CUSTOMER_ACADEMIC' });
    expect(c.updateProfile).not.toHaveBeenCalled();
  });
});
