/** Any SheetJS cell value as trimmed text. A date cell reads as its ISO day. */
export function cellText(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v === null || v === undefined) return '';
  return String(v).replace(/\r\n/g, '\n').trim();
}

/** Two names with the same key differ only by case or spacing: a near-duplicate. */
export const nearKey = (s: string): string => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const YES = new Set(['y', 'yes', 'true', '1']);
const NO = new Set(['', 'n', 'no', 'false', '0']);

/** True/False, Y/N, Yes/No, 1/0, any case. A blank cell is "no". */
export function parseYesNo(raw: string): boolean | 'invalid' {
  const v = raw.trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return 'invalid';
}

export const yesNo = (v: unknown): 'Y' | 'N' => (v === true ? 'Y' : 'N');

/** '' → null (clear); a negative or non-number → 'invalid'. Accepts "$1,200.50". */
export function parseMoney(raw: string): number | null | 'invalid' {
  if (raw === '') return null;
  const n = Number(raw.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

/** A semicolon-separated cell as trimmed, non-blank names. */
export const splitList = (raw: string): string[] => raw.split(';').map((s) => s.trim()).filter(Boolean);

export const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
