/** CRLF as LF — how the reader sees a cell; the stored side of every comparison goes through it too. */
export const normalizeEol = (v: unknown): string => (v === null || v === undefined ? '' : String(v).replace(/\r\n/g, '\n'));

/** Any SheetJS cell value as trimmed text. A date cell reads as its ISO day. */
export function cellText(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return normalizeEol(v).trim();
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

/** '' → null (clear); a negative or non-number → 'invalid'. Accepts "$1,200.50"; after stripping `$`, `,` and spaces only a plain decimal is a price. */
export function parseMoney(raw: string): number | null | 'invalid' {
  if (raw === '') return null;
  const stripped = raw.replace(/[$,\s]/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(stripped)) return 'invalid';
  const n = Number(stripped);
  return Number.isFinite(n) ? n : 'invalid';
}

/** A semicolon-separated cell as trimmed, non-blank names. */
export const splitList = (raw: string): string[] => raw.split(';').map((s) => s.trim()).filter(Boolean);

export const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
