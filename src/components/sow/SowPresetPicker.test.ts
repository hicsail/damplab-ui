import { describe, it, expect } from 'vitest';
import { matchingPresetId, presetSelectionPatch, presetSubtitle, SowTextPresetOption } from './SowPresetPicker';

function preset(over: Partial<SowTextPresetOption> = {}): SowTextPresetOption {
  return { id: 'p1', sectionKey: 'invoiceProcedures', name: 'Default', text: 'Pay on receipt.', ...over };
}

describe('presetSelectionPatch', () => {
  /**
   * The "Edited" marker means the section's text differs from what this SOW
   * generated. Picking the block it was generated with must therefore clear the
   * marker, not set it — otherwise choosing your way back to the default would
   * leave the document looking hand-edited.
   */
  it('clears the override when the chosen block is what the SOW was written with', () => {
    expect(presetSelectionPatch('Original.', 'Original.')).toEqual({ value: 'Original.', isOverridden: false });
  });

  it('sets the override when a different block is chosen', () => {
    expect(presetSelectionPatch('Net 30.', 'Original.')).toEqual({ value: 'Net 30.', isOverridden: true });
  });

  it('treats a section with no baseline as overridden once text is chosen', () => {
    expect(presetSelectionPatch('Something.', null)).toEqual({ value: 'Something.', isOverridden: true });
    expect(presetSelectionPatch('Something.', undefined).isOverridden).toBe(true);
  });

  it('does not mark an empty choice against an empty baseline', () => {
    expect(presetSelectionPatch('', undefined).isOverridden).toBe(false);
  });
});

describe('matchingPresetId', () => {
  it('finds the block whose text the section is showing', () => {
    const presets = [preset({ id: 'p1', text: 'A' }), preset({ id: 'p2', text: 'B' })];
    expect(matchingPresetId(presets, 'B')).toBe('p2');
  });

  /** Hand-edited text belongs to no block; the dropdown shows "Custom text". */
  it('answers empty when the text matches no block', () => {
    expect(matchingPresetId([preset({ text: 'A' })], 'something typed')).toBe('');
  });

  it('answers empty for a section with no blocks at all', () => {
    expect(matchingPresetId([], 'anything')).toBe('');
  });
});

describe('presetSubtitle', () => {
  it('names the date and the editor', () => {
    const when = new Date('2026-06-01T12:00:00Z');
    const subtitle = presetSubtitle(preset({ updatedAt: when.toISOString(), updatedByName: 'jane' }));
    expect(subtitle).toBe(`Edited ${when.toLocaleDateString()} by jane`);
  });

  it('drops the attribution when nobody is recorded', () => {
    const when = new Date('2026-06-01T12:00:00Z');
    expect(presetSubtitle(preset({ updatedAt: when.toISOString() }))).toBe(`Edited ${when.toLocaleDateString()}`);
  });

  it('says so when the block has never been edited', () => {
    expect(presetSubtitle(preset())).toBe('Never edited');
  });
});
