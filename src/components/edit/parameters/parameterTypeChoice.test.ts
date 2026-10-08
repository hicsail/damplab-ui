import { describe, expect, it } from 'vitest';
import { applyTypeChoice, applyValidationText, CHECKBOXES_CHOICE, typeChoiceOf, validationError, validationText } from './parameterTypeChoice';
import { validateParameter } from './ParameterValidation';

describe('the "Checkboxes" answer format (rule 31)', () => {
  it('is a multi-value dropdown shown as checkboxes', () => {
    expect(applyTypeChoice(CHECKBOXES_CHOICE)).toEqual({ type: 'dropdown', display: 'checkboxes', allowMultipleValues: true });
  });
  it('any other format clears the display flag and leaves "allow multiple" alone', () => {
    expect(applyTypeChoice('dropdown')).toEqual({ type: 'dropdown', display: undefined });
    expect(applyTypeChoice('number')).toEqual({ type: 'number', display: undefined });
  });
  it('reads back as its own choice', () => {
    expect(typeChoiceOf({ type: 'dropdown', display: 'checkboxes' })).toBe('checkboxes');
    expect(typeChoiceOf({ type: 'dropdown' })).toBe('dropdown');
    expect(typeChoiceOf({ type: 'number' })).toBe('number');
    expect(typeChoiceOf({})).toBe('string');
  });
});

describe('the Validation field (rule 23)', () => {
  it('shows the stored string, or the legacy min/max written as rules', () => {
    expect(validationText({ validation: '>0 && integer' })).toBe('>0 && integer');
    expect(validationText({ rangeValueMin: 1, rangeValueMax: 10 })).toBe('>=1 && <=10');
    expect(validationText({})).toBe('');
  });
  it('keeps what is being typed, even a trailing space, and even over a legacy range', () => {
    expect(validationText({ validation: '>0 ', rangeValueMin: 1 })).toBe('>0 ');
    expect(validationText({ validation: '', rangeValueMin: 1 })).toBe('');
  });
  it('writes the string and stops writing min/max', () => {
    expect(applyValidationText('>0 && <5')).toEqual({ validation: '>0 && <5', rangeValueMin: undefined, rangeValueMax: undefined });
    expect(applyValidationText('')).toEqual({ validation: '', rangeValueMin: undefined, rangeValueMax: undefined });
  });
  it('reports the parse error for a number, and nothing for other formats', () => {
    expect(validationError({ type: 'number', validation: '>0 || <5' })).toBe('“||” is not supported — join rules with &&.');
    expect(validationError({ type: 'number', validation: '>0' })).toBeNull();
    expect(validationError({ type: 'number' })).toBeNull();
    expect(validationError({ type: 'string', validation: '>0 || <5' })).toBeNull();
  });
});

describe('validateParameter refuses what the server would refuse', () => {
  const base = { name: 'Cycles', type: 'number' };
  it('an unparseable validation', () => {
    expect(validateParameter({ ...base, validation: 'positive' })).toContainEqual({ field: 'Validation', errorMsg: '“positive” is not a rule. Use >n, >=n, <n, <=n or integer.' });
    expect(validateParameter({ ...base, validation: '>0' })).toEqual([]);
  });
  it('checkboxes without multiple selections', () => {
    const options = [{ id: 'a', name: 'A' }];
    expect(validateParameter({ name: 'T', type: 'dropdown', display: 'checkboxes', allowMultipleValues: false, options })).toContainEqual({
      field: 'Answer format', errorMsg: 'Checkboxes needs “Allow multiple selections” to be Yes.'
    });
    expect(validateParameter({ name: 'T', type: 'dropdown', display: 'checkboxes', allowMultipleValues: true, options })).toEqual([]);
  });
});
