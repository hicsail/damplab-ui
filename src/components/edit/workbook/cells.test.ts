import { describe, expect, it } from 'vitest';
import { cellText, nearKey, normalizeEol, parseMoney, parseYesNo, sameList, splitList, yesNo } from './cells';

describe('cells', () => {
  it('reads any cell as trimmed text', () => {
    expect(cellText('  PCR ')).toBe('PCR');
    expect(cellText(5)).toBe('5');
    expect(cellText(true)).toBe('true');
    expect(cellText(null)).toBe('');
    expect(cellText(undefined)).toBe('');
    expect(cellText('a\r\nb')).toBe('a\nb');
    expect(cellText(new Date('2026-01-02T00:00:00Z'))).toBe('2026-01-02');
  });

  it('accepts True/False, Y/N, Yes/No, 1/0 in any case (rule 10); blank is no', () => {
    for (const yes of ['True', 'TRUE', 'y', 'Y', 'Yes', 'yes', '1']) expect(parseYesNo(yes)).toBe(true);
    for (const no of ['False', 'false', 'n', 'N', 'No', 'NO', '0', '']) expect(parseYesNo(no)).toBe(false);
    expect(parseYesNo('maybe')).toBe('invalid');
    expect(yesNo(true)).toBe('Y');
    expect(yesNo(undefined)).toBe('N');
  });

  it('keys a name for near-duplicate detection: lower-cased, whitespace collapsed (rule 4)', () => {
    expect(nearKey('  Gibson   Assembly ')).toBe('gibson assembly');
    expect(nearKey('GIBSON ASSEMBLY')).toBe(nearKey('Gibson Assembly'));
  });

  it('reads money, blank as "clear"', () => {
    expect(parseMoney('$1,200.50')).toBe(1200.5);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('-1')).toBe('invalid');
    expect(parseMoney('free')).toBe('invalid');
  });

  it('F13: a price cell must be a plain decimal once $ , and spaces are stripped', () => {
    for (const bad of ['$', ',', '$,', ' $ ', '0x10', '1e3', '1.2.3', '.', '--1']) expect(parseMoney(bad)).toBe('invalid');
    expect(parseMoney('0')).toBe(0);
    expect(parseMoney('$ 1,200')).toBe(1200);
    expect(parseMoney('.5')).toBe(0.5);
    expect(parseMoney('12.')).toBe(12);
  });

  it('M6: normalises CRLF line ends the way the reader does', () => {
    expect(normalizeEol('a\r\nb\r\nc')).toBe('a\nb\nc');
    expect(normalizeEol(undefined)).toBe('');
  });

  it('splits a semicolon list, trimming and dropping blanks', () => {
    expect(splitList(' A; B ;; C ;')).toEqual(['A', 'B', 'C']);
    expect(splitList('')).toEqual([]);
    expect(sameList(['A', 'B'], ['A', 'B'])).toBe(true);
    expect(sameList(['A', 'B'], ['B', 'A'])).toBe(false);
    expect(sameList(['A'], ['A', 'B'])).toBe(false);
  });
});
