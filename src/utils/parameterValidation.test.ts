import { describe, expect, it } from 'vitest';
import { checkValue, effectiveValidation, isScreenableType, parseValidation, ruleMessage, screeningRuleViolation, ValidationRule } from './parameterValidation';

const rules = (text: string): ValidationRule[] => {
  const parsed = parseValidation(text);
  if ('error' in parsed) throw new Error(parsed.error);
  return parsed.rules;
};

describe('parseValidation (rule 22) — mirror of the backend', () => {
  it('reads rules joined by &&, ignoring whitespace and case', () => {
    expect(parseValidation('>0 && <100 && integer')).toEqual({ rules: [{ kind: 'gt', n: 0 }, { kind: 'lt', n: 100 }, { kind: 'integer' }] });
    expect(parseValidation(' >= -1.5&&<=2 && INTEGER ')).toEqual({ rules: [{ kind: 'gte', n: -1.5 }, { kind: 'lte', n: 2 }, { kind: 'integer' }] });
    expect(parseValidation('')).toEqual({ rules: [] });
  });
  it('names the offending token', () => {
    expect(parseValidation('>0 || <5')).toEqual({ error: '“||” is not supported — join rules with &&.' });
    expect(parseValidation('>0 && positive')).toEqual({ error: '“positive” is not a rule. Use >n, >=n, <n, <=n or integer.' });
    expect(parseValidation('>0 &&')).toEqual({ error: 'A rule is missing next to “&&”.' });
  });
});

describe('ruleMessage / checkValue (rule 25)', () => {
  it('uses the pinned sentences', () => {
    expect(ruleMessage({ kind: 'gt', n: 0 })).toBe('Must be greater than 0');
    expect(ruleMessage({ kind: 'gte', n: 1 })).toBe('Must be at least 1');
    expect(ruleMessage({ kind: 'lt', n: 100 })).toBe('Must be less than 100');
    expect(ruleMessage({ kind: 'lte', n: 2.5 })).toBe('Must be at most 2.5');
    expect(ruleMessage({ kind: 'integer' })).toBe('Must be a whole number');
  });
  it('F11: a whitespace-only answer is an empty answer, not the number 0', () => {
    for (const blank of [' ', '   ', '\t', '\n', ' \r\n ']) {
      expect(checkValue(rules('<5'), blank)).toBeNull();
      expect(checkValue(rules('>0'), blank)).toBeNull();
      expect(checkValue(rules('>=1 && <=3'), blank)).toBeNull();
    }
    // An answer with text in it is still checked, padded or not.
    expect(checkValue(rules('>0'), ' 0 ')).toBe('Must be greater than 0');
    expect(checkValue(rules('<5'), ' 7 ')).toBe('Must be less than 5');
    expect(checkValue(rules('>0'), ' x ')).toBe('Must be a number');
  });

  it('returns the first broken rule, null for a pass, null for an empty value', () => {
    expect(checkValue(rules('>0 && <100 && integer'), 5)).toBeNull();
    expect(checkValue(rules('>0 && <100 && integer'), 0)).toBe('Must be greater than 0');
    expect(checkValue(rules('>0 && <100 && integer'), 2.5)).toBe('Must be a whole number');
    for (const empty of [null, undefined, '']) expect(checkValue(rules('>0'), empty)).toBeNull();
  });
  it('reads a number typed as text, and refuses text that is not a number (Review Focus 4)', () => {
    expect(checkValue(rules('integer'), ' 5 ')).toBeNull();
    expect(checkValue(rules('integer'), '5.0')).toBeNull();
    expect(checkValue(rules('>0'), 'abc')).toBe('Must be a number');
  });
});

describe('effectiveValidation (rule 24)', () => {
  it('prefers the stored validation, then the legacy min/max', () => {
    expect(effectiveValidation({ validation: ' >0 ', rangeValueMin: 5 })).toBe('>0');
    expect(effectiveValidation({ rangeValueMin: 1, rangeValueMax: 10 })).toBe('>=1 && <=10');
    expect(effectiveValidation({ rangeValueMax: 3 })).toBe('<=3');
    expect(effectiveValidation({})).toBe('');
    expect(effectiveValidation(null)).toBe('');
  });
});

describe('screeningRuleViolation (mirror of damplab-backend parameter-validation.ts)', () => {
  const table = (over: Record<string, unknown> = {}) => ({ id: 'plate', type: 'table', tableData: { columns: [{ header: 'Well' }, { header: 'Insert' }] }, ...over });

  it('uses the server’s sentences', () => {
    expect(screeningRuleViolation({ type: 'number', screening: true })).toBe('Only Text, Table and File Upload parameters can require screening.');
    expect(screeningRuleViolation({ type: 'string', screening: 'yes' })).toBe('“Requires screening” must be true or false.');
    expect(screeningRuleViolation({ type: 'string', screening: true, screeningFields: ['x'] })).toBe('Only a Table has screening columns.');
    expect(screeningRuleViolation(table({ screening: true, screeningFields: 'Insert' }))).toBe('Screening columns must be a list of column names.');
    expect(screeningRuleViolation(table({ screening: true, screeningFields: [] }))).toBe('A Table that requires screening needs at least one screening column.');
    expect(screeningRuleViolation(table({ screening: true, screeningFields: ['Vector'] }))).toBe('Screening column “Vector” is not one of this Table\'s columns.');
  });

  it('accepts the good shapes and template-only Tables', () => {
    expect(screeningRuleViolation({ type: 'string', screening: true })).toBeNull();
    expect(screeningRuleViolation(table({ screening: true, screeningFields: ['insert'] }))).toBeNull();
    expect(screeningRuleViolation({ type: 'sampleSheet', templateFile: { key: 'sample-sheet-templates/a.xlsx' }, screening: true, screeningFields: ['Any'] })).toBeNull();
    expect(screeningRuleViolation({ type: 'number' })).toBeNull();
    expect(screeningRuleViolation({ type: 'file', screening: true })).toBeNull();
    expect(screeningRuleViolation({ type: 'file', screening: true, screeningFields: ['x'] })).toBe('Only a Table has screening columns.');
  });

  it('isScreenableType is Text, File Upload and both Table strings', () => {
    expect(['string', 'table', 'sampleSheet', 'file'].map(isScreenableType)).toEqual([true, true, true, true]);
    expect(['number', 'dropdown', 'boolean'].map(isScreenableType)).toEqual([false, false, false]);
  });
});
