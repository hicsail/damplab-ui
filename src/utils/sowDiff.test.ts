import { describe, it, expect } from 'vitest';
import { diffVersions, pickDiffBaseline, previousCustomerVersion, versionLabel } from './sowDiff';
import { SowField, SowStatus, SowVersion } from '../components/sow/sowTypes';

function field(key: string, value: string, over: Partial<SowField> = {}): SowField {
  return { key, label: key, kind: 'PROSE', order: 10, value, calculatedValue: value, isOverridden: false, isEnabled: true, allowsTextOverride: true, ...over };
}

function version(n: number, fields: SowField[], over: Partial<SowVersion> = {}): SowVersion {
  return {
    id: `v${n}`,
    versionNumber: n,
    status: 'DRAFT' as SowStatus,
    visibleToCustomer: false,
    createdByName: 'tech',
    createdAt: '2026-08-09T12:00:00.000Z',
    fields,
    inputs: { projectManager: '', projectLead: '', scopeOfWork: [], deliverables: [], periods: [], services: [], adjustments: [] },
    ...over
  };
}

describe('diffVersions', () => {
  it('reports an unchanged document as having no changes', () => {
    const a = version(1, [field('billToAddress', 'Boston')]);
    const b = version(2, [field('billToAddress', 'Boston')]);
    const d = diffVersions(a, b);
    expect(d.hasChanges).toBe(false);
    expect(d.fields[0].kind).toBe('unchanged');
  });

  it('produces word-level parts for edited text', () => {
    const a = version(1, [field('clientResponsibilities', 'The client ships samples.')]);
    const b = version(2, [field('clientResponsibilities', 'The client ships samples on dry ice.')]);
    const d = diffVersions(a, b);

    expect(d.fields[0].kind).toBe('changed');
    const added = (d.fields[0].parts ?? []).filter((p) => p.added).map((p) => p.value).join('');
    expect(added).toContain('dry ice');
    // The untouched opening is shared, not re-reported as an insertion.
    expect((d.fields[0].parts ?? []).some((p) => !p.added && !p.removed && p.value.includes('The client'))).toBe(true);
  });

  it('separates a visibility change from a text change', () => {
    const a = version(1, [field('billToAddress', 'Boston', { isEnabled: true })]);
    const b = version(2, [field('billToAddress', 'Boston', { isEnabled: false })]);
    expect(diffVersions(a, b).fields[0].kind).toBe('hidden');

    const c = version(3, [field('billToAddress', 'Boston', { isEnabled: true })]);
    expect(diffVersions(b, c).fields[0].kind).toBe('shown');
  });

  it('reports an added custom section', () => {
    const a = version(1, [field('billToAddress', 'Boston')]);
    const b = version(2, [field('billToAddress', 'Boston'), field('custom-1', 'Dry ice', { kind: 'CUSTOM', order: 1000 })]);
    const d = diffVersions(a, b);
    expect(d.fields.find((f) => f.key === 'custom-1')?.kind).toBe('added');
    expect(d.changedKeys.has('custom-1')).toBe(true);
  });

  it('reports a removed section even though it is absent from the newer version', () => {
    const a = version(1, [field('billToAddress', 'Boston'), field('custom-1', 'Dry ice', { kind: 'CUSTOM', order: 1000 })]);
    const b = version(2, [field('billToAddress', 'Boston')]);
    const d = diffVersions(a, b);
    expect(d.fields.find((f) => f.key === 'custom-1')?.kind).toBe('removed');
  });

  it('treats every section as added when there is no baseline', () => {
    const b = version(1, [field('billToAddress', 'Boston')]);
    expect(diffVersions(null, b).fields[0].kind).toBe('added');
  });

  it('walks the newer version in document order', () => {
    const a = version(1, []);
    const b = version(2, [field('c', 'x', { order: 30 }), field('a', 'x', { order: 10 }), field('b', 'x', { order: 20 })]);
    expect(diffVersions(a, b).fields.map((f) => f.key)).toEqual(['a', 'b', 'c']);
  });
});

describe('pickDiffBaseline', () => {
  const f = [field('x', 'v')];

  it('defaults to the immediately previous version', () => {
    const versions = [version(1, f), version(2, f), version(3, f)];
    expect(pickDiffBaseline(versions, 3)).toBe(2);
  });

  it('jumps back to the signed version when the current one is an edit made after signing', () => {
    const versions = [version(1, f), version(2, f, { status: 'SENT', visibleToCustomer: true }), version(3, f, { status: 'SIGNED', visibleToCustomer: true }), version(4, f, { status: 'DRAFT' })];
    // Comparing a post-signature draft against v3 answers the question that matters:
    // what has changed since the customer committed.
    expect(pickDiffBaseline(versions, 4)).toBe(3);
  });

  it('prefers the most recent issued version when several exist', () => {
    const versions = [version(1, f, { status: 'SIGNED', visibleToCustomer: true }), version(2, f, { status: 'FINAL', visibleToCustomer: true }), version(3, f, { status: 'DRAFT' })];
    expect(pickDiffBaseline(versions, 3)).toBe(2);
  });

  it('uses the previous version when the current one is itself signed', () => {
    const versions = [version(1, f), version(2, f, { status: 'SENT' }), version(3, f, { status: 'SIGNED' })];
    expect(pickDiffBaseline(versions, 3)).toBe(2);
  });

  it('returns null for the first version, which has nothing to compare against', () => {
    expect(pickDiffBaseline([version(1, f)], 1)).toBeNull();
  });

  it('does not depend on the input array being ordered', () => {
    const versions = [version(3, f), version(1, f), version(2, f)];
    expect(pickDiffBaseline(versions, 3)).toBe(2);
  });
});

describe('previousCustomerVersion', () => {
  const f = [field('x', 'v')];

  it('skips internal drafts the customer never saw', () => {
    const versions = [
      version(1, f, { status: 'DRAFT' }),
      version(2, f, { status: 'SENT', visibleToCustomer: true }),
      version(3, f, { status: 'DRAFT' }),
      version(4, f, { status: 'DRAFT' }),
      version(5, f, { status: 'SENT', visibleToCustomer: true })
    ];
    expect(previousCustomerVersion(versions, 5)).toBe(2);
  });

  it('returns null when this is the first version they were sent', () => {
    const versions = [version(1, f, { status: 'DRAFT' }), version(2, f, { status: 'SENT', visibleToCustomer: true })];
    expect(previousCustomerVersion(versions, 2)).toBeNull();
  });
});

describe('versionLabel', () => {
  it('reads as version, status and date', () => {
    expect(versionLabel(version(3, [], { status: 'SIGNED', createdAt: '2026-08-09T12:00:00.000Z' }))).toBe('v3 · signed · Aug 9');
  });

  it('omits the date when it is unusable', () => {
    expect(versionLabel(version(1, [], { createdAt: 'not-a-date' }))).toBe('v1 · draft');
  });
});
