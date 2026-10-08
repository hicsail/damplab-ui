import { describe, expect, it } from 'vitest';
import { checkValue, effectiveValidation, parseValidation, ruleMessage, ValidationRule } from './parameterValidation';

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
