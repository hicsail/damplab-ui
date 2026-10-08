import { describe, expect, it } from 'vitest';
import { parseCondition, sameConditionText } from './parameterConditionText';

const tree = (text: string): any => {
  const parsed = parseCondition(text);
  if ('error' in parsed) throw new Error(parsed.error);
  return parsed.tree;
};
const syntaxError = (text: string): string => {
  const parsed = parseCondition(text);
  return 'error' in parsed ? parsed.error : 'no error';
};

describe('parseCondition — grammar (rules 1–3)', () => {
  it('reads a comparison: reference, operator, value', () => {
    expect(tree('"Sample Type"=="Bacteria"')).toEqual({ ref: { name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"Volume" >= 2.5')).toEqual({ ref: { name: 'Volume' }, op: 'ge', value: 2.5 });
    expect(tree('"Volume"<-1')).toEqual({ ref: { name: 'Volume' }, op: 'lt', value: -1 });
    expect(tree('"Hot start"!=TRUE')).toEqual({ ref: { name: 'Hot start' }, op: 'ne', value: true });
    expect(tree('"Hot start"==false')).toEqual({ ref: { name: 'Hot start' }, op: 'eq', value: false });
  });

  it('reads every operator', () => {
    expect(['==', '!=', '>', '>=', '<', '<='].map((op) => tree(`"A"${op}1`).op)).toEqual(['eq', 'ne', 'gt', 'ge', 'lt', 'le']);
    expect(tree('"A" in ("x", "y",3)')).toEqual({ ref: { name: 'A' }, op: 'in', values: ['x', 'y', 3] });
    expect(tree('"A".includes("rush")')).toEqual({ ref: { name: 'A' }, op: 'includes', value: 'rush' });
  });

  it('reads a qualified reference, with every operator form', () => {
    expect(tree('"Nucleic Acid Extraction"."Sample Type"=="Bacteria"')).toEqual({ ref: { set: 'Nucleic Acid Extraction', name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"Set"."P".includes("x")')).toEqual({ ref: { set: 'Set', name: 'P' }, op: 'includes', value: 'x' });
    expect(tree('"Set" . "P" in ("x")')).toEqual({ ref: { set: 'Set', name: 'P' }, op: 'in', values: ['x'] });
  });

  it('&& binds tighter than ||; parentheses group', () => {
    const a = { ref: { name: 'A' }, op: 'eq', value: 1 };
    const b = { ref: { name: 'B' }, op: 'eq', value: 2 };
    const c = { ref: { name: 'C' }, op: 'eq', value: 3 };
    expect(tree('"A"==1 || "B"==2 && "C"==3')).toEqual({ any: [a, { all: [b, c] }] });
    expect(tree('("A"==1 || "B"==2) && "C"==3')).toEqual({ all: [{ any: [a, b] }, c] });
    expect(tree('"A"==1 && "B"==2 && "C"==3')).toEqual({ all: [a, b, c] });
    expect(tree('(("A"==1))')).toEqual(a);
  });

  it('reads curly quotes as straight quotes, single quotes as quotes, and \\" inside a name', () => {
    expect(tree('“Sample Type”==‘Bacteria’')).toEqual({ ref: { name: 'Sample Type' }, op: 'eq', value: 'Bacteria' });
    expect(tree('"5\\" plate"=="x"')).toEqual({ ref: { name: '5" plate' }, op: 'eq', value: 'x' });
  });

  it('ignores whitespace outside quotes and keeps it inside', () => {
    expect(tree('  "A  b"\n ==\t"x  y" ')).toEqual({ ref: { name: 'A  b' }, op: 'eq', value: 'x  y' });
  });

  it.each([
    ['', 'The condition is empty.'],
    ['   ', 'The condition is empty.'],
    ['Enzyme used depends on template', 'Expected a quoted parameter name but found “Enzyme”.'],
    ['"A"', 'Expected ==, !=, >, >=, <, <=, in or .includes but found the end.'],
    ['"A"==', 'Expected a quoted value, a number, true or false but found the end.'],
    ['"A"=="x" &&', 'Expected a quoted parameter name but found the end.'],
    ['"A"=="x" "B"=="y"', 'Expected && or || but found “B”.'],
    ['("A"=="x"', 'Expected “)” but found the end.'],
    ['"A"=="x', 'A quote opened at character 6 is never closed.'],
    ['"A" = "x"', 'Unexpected “=” at character 5.'],
    ['"A" in "x"', 'Expected “(” but found “x”.'],
    ['"A" in ()', 'Expected a quoted value, a number, true or false but found “)”.'],
    ['"A" in (true)', '“in” takes quoted values, not true or false.'],
    ['"A".contains("x")', 'Expected “includes” but found “contains”.'],
    ['"A".includes(5)', 'Expected quoted text but found “5”.'],
    ['"A"==yes', 'Expected a quoted value, a number, true or false but found “yes”.']
  ])('syntax error: %s', (text, message) => {
    expect(syntaxError(text)).toBe(message);
  });
});

describe('sameConditionText (rule 26)', () => {
  it('ignores whitespace outside quotes and quote style', () => {
    expect(sameConditionText('"A"=="x" && "B">5', '“A” == ‘x’&&"B" > 5')).toBe(true);
    expect(sameConditionText('"A"=="x y"', '"A"=="x  y"')).toBe(false);
    expect(sameConditionText('"A"=="x"', '"a"=="x"')).toBe(false);
    expect(sameConditionText('', '   ')).toBe(true);
  });
  it('falls back to the trimmed text for something that is not a condition', () => {
    expect(sameConditionText('a note = b', ' a note = b ')).toBe(true);
    expect(sameConditionText('a note = b', 'another note = b')).toBe(false);
  });
});
