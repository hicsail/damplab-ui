import { describe, it, expect } from 'vitest';
import { draftStorageKey, fieldsFingerprint, mergeDraftOntoFresh } from './SowEditorModal';
import { SowField } from './sowTypes';

function field(over: Partial<SowField> = {}): SowField {
  return {
    key: 'engagementResources',
    label: 'Engagement Resources',
    kind: 'CALCULATED',
    order: 50,
    value: 'Jane – Project Manager',
    calculatedValue: 'Jane – Project Manager',
    isOverridden: false,
    isEnabled: true,
    allowsTextOverride: true,
    allowsEmpty: false,
    requiresInitials: false,
    ...over
  };
}

describe('fieldsFingerprint', () => {
  it('is unaffected by a calculatedValue-only refresh (e.g. a live preview round trip)', () => {
    const before = [field({ calculatedValue: 'Jane – Project Manager' })];
    const afterPreview = [field({ calculatedValue: 'Jane Doe – Project Manager' })]; // value unchanged, only the server-derived text moved
    expect(fieldsFingerprint(afterPreview)).toBe(fieldsFingerprint(before));
  });

  it('changes when something the staff actually controls changes', () => {
    const before = [field({ value: 'Jane – Project Manager' })];
    const after = [field({ value: 'Someone Else – Project Manager' })];
    expect(fieldsFingerprint(after)).not.toBe(fieldsFingerprint(before));

    expect(fieldsFingerprint([field({ isEnabled: false })])).not.toBe(fieldsFingerprint([field({ isEnabled: true })]));
    expect(fieldsFingerprint([field({ requiresInitials: true })])).not.toBe(fieldsFingerprint([field({ requiresInitials: false })]));
  });
});

describe('mergeDraftOntoFresh', () => {
  it('keeps the draft value for a field the staff overrode', () => {
    const draft = [field({ isOverridden: true, value: 'Bespoke wording' })];
    const fresh = [field({ calculatedValue: 'Newly generated text' })];
    const merged = mergeDraftOntoFresh(draft, fresh);
    expect(merged[0].value).toBe('Bespoke wording');
    expect(merged[0].calculatedValue).toBe('Newly generated text');
  });

  it('replaces stale generated text with the fresh calculatedValue for a non-overridden field', () => {
    const draft = [field({ isOverridden: false, value: 'Old PM name', calculatedValue: 'Old PM name' })];
    const fresh = [field({ calculatedValue: 'Current PM name' })];
    const merged = mergeDraftOntoFresh(draft, fresh);
    expect(merged[0].value).toBe('Current PM name');
    expect(merged[0].calculatedValue).toBe('Current PM name');
  });

  it('carries over a custom section with no server counterpart', () => {
    const custom = field({ key: 'custom-1', kind: 'CUSTOM', calculatedValue: undefined, value: 'Ships on dry ice' });
    const merged = mergeDraftOntoFresh([custom], [field()]);
    expect(merged.find((f) => f.key === 'custom-1')?.value).toBe('Ships on dry ice');
  });
});

describe('draftStorageKey', () => {
  it('scopes by both sow id and version number', () => {
    expect(draftStorageKey('sow-1', 3)).not.toBe(draftStorageKey('sow-2', 3));
    expect(draftStorageKey('sow-1', 3)).not.toBe(draftStorageKey('sow-1', 4));
  });
});
