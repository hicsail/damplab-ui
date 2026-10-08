import { describe, expect, it } from 'vitest';
import {
  isOtherOptionName, isOtherTextEntryId, OTHER_TEXT_LABEL, OTHER_TEXT_SUFFIX, otherLabel, otherOptionIdOf, otherTextEntryId, otherTextFrom, otherTextParentId, selectsOther
} from './otherOption';

const sampleType = { id: 'sample_type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'oth', name: ' other ' }] };

describe('the "Other" convention — mirror of the backend', () => {
  it('keeps the shared suffix and the field label', () => {
    expect(OTHER_TEXT_SUFFIX).toBe('__otherText');
    expect(OTHER_TEXT_LABEL).toBe('Please specify');
  });
  it('builds and recognises the companion entry id', () => {
    expect(otherTextEntryId('sample_type')).toBe('sample_type__otherText');
    expect(isOtherTextEntryId('sample_type__otherText')).toBe(true);
    expect(isOtherTextEntryId('sample_type')).toBe(false);
    expect(isOtherTextEntryId('__otherText')).toBe(false);
    expect(otherTextParentId('sample_type__otherText')).toBe('sample_type');
  });
  it('matches the option name trimmed and case-insensitively', () => {
    for (const name of ['Other', 'other', ' OTHER ']) expect(isOtherOptionName(name)).toBe(true);
    for (const name of ['Others', 'Other (specify)', '', null]) expect(isOtherOptionName(name)).toBe(false);
  });
  it('finds the Other option on a dropdown only, and knows when an answer selects it', () => {
    expect(otherOptionIdOf(sampleType)).toBe('oth');
    expect(otherOptionIdOf({ ...sampleType, type: 'string' })).toBeNull();
    expect(selectsOther(sampleType, 'oth')).toBe(true);
    expect(selectsOther(sampleType, ['bact', 'oth'])).toBe(true);
    expect(selectsOther(sampleType, 'bact')).toBe(false);
    expect(selectsOther(sampleType, [''])).toBe(false);
  });
  it('labels Other with its text', () => {
    expect(otherLabel('Other', ' Yeast ')).toBe('Other: Yeast');
    expect(otherLabel('Other', '')).toBe('Other');
    expect(otherLabel('Bacteria', 'Yeast')).toBe('Bacteria');
  });
  it('reads the text out of a formData list', () => {
    const formData = [{ id: 'sample_type', value: 'oth' }, { id: 'sample_type__otherText', value: 'Yeast' }];
    expect(otherTextFrom(formData, 'sample_type')).toBe('Yeast');
    expect(otherTextFrom(formData, 'volume')).toBe('');
    expect(otherTextFrom(undefined, 'sample_type')).toBe('');
    expect(otherTextFrom({ sample_type__otherText: 'Yeast' }, 'sample_type')).toBe('Yeast');
  });
});
