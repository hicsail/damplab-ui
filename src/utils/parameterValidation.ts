import { expectedColumnsOf, isTableType } from './sampleSheetValue';

/**
 * A Number parameter's validation: one stored string such as
 * `>0 && <100 && integer`.
 *
 * Mirrors damplab-backend/src/services/parameter-validation.ts — same grammar,
 * same messages. The server is the authority (createJob re-checks); this copy
 * is what lets the form say it first. Keep the two in step.
 */
export type ValidationRule = { kind: 'gt' | 'gte' | 'lt' | 'lte'; n: number } | { kind: 'integer' };
export type ParsedValidation = { rules: ValidationRule[] } | { error: string };

const COMPARISONS: Record<string, 'gt' | 'gte' | 'lt' | 'lte'> = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' };
const COMPARISON = /^(>=|<=|>|<)(-?(?:\d+\.?\d*|\.\d+))$/;

export function parseValidation(text: unknown): ParsedValidation {
  const compact = String(text ?? '').replace(/\s+/g, '');
  if (compact === '') return { rules: [] };
  if (compact.includes('||')) return { error: '“||” is not supported — join rules with &&.' };
  const rules: ValidationRule[] = [];
  for (const token of compact.split('&&')) {
    if (token === '') return { error: 'A rule is missing next to “&&”.' };
    if (token.toLowerCase() === 'integer') {
      rules.push({ kind: 'integer' });
      continue;
    }
    const match = COMPARISON.exec(token);
    if (!match) return { error: `“${token}” is not a rule. Use >n, >=n, <n, <=n or integer.` };
    rules.push({ kind: COMPARISONS[match[1]], n: Number(match[2]) });
  }
  return { rules };
}

export function ruleMessage(rule: ValidationRule): string {
  switch (rule.kind) {
    case 'gt': return `Must be greater than ${rule.n}`;
    case 'gte': return `Must be at least ${rule.n}`;
    case 'lt': return `Must be less than ${rule.n}`;
    case 'lte': return `Must be at most ${rule.n}`;
    case 'integer': return 'Must be a whole number';
  }
}

function breaks(rule: ValidationRule, n: number): boolean {
  switch (rule.kind) {
    case 'gt': return !(n > rule.n);
    case 'gte': return !(n >= rule.n);
    case 'lt': return !(n < rule.n);
    case 'lte': return !(n <= rule.n);
    case 'integer': return !Number.isInteger(n);
  }
}

/** The first broken rule's message, or null. An empty value breaks nothing: "required" is a separate rule. */
export function checkValue(rules: ReadonlyArray<ValidationRule>, value: unknown): string | null {
  // A whitespace-only answer is an empty answer: Number('   ') is 0, which `<5` would accept and `>0` refuse.
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  if (rules.length === 0) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return 'Must be a number';
  for (const rule of rules) if (breaks(rule, n)) return ruleMessage(rule);
  return null;
}

const finite = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** The stored validation, or the legacy rangeValueMin / rangeValueMax written the same way. */
export function effectiveValidation(param: unknown): string {
  const p = (param ?? {}) as { validation?: unknown; rangeValueMin?: unknown; rangeValueMax?: unknown };
  const own = typeof p.validation === 'string' ? p.validation.trim() : '';
  if (own) return own;
  const parts: string[] = [];
  const min = finite(p.rangeValueMin);
  const max = finite(p.rangeValueMax);
  if (min !== undefined) parts.push(`>=${min}`);
  if (max !== undefined) parts.push(`<=${max}`);
  return parts.join(' && ');
}

/** A parameter type that can carry `screening: true`: Text, File Upload, and a Table under either stored string. */
export const isScreenableType = (type: unknown): boolean => type === 'string' || type === 'file' || isTableType(type);

/**
 * The screening flag's rules. Mirrors screeningRuleViolation in
 * damplab-backend/src/services/parameter-validation.ts — same sentences. The server also checks
 * a template-only Table against its template's header; the editor cannot read the template.
 */
export function screeningRuleViolation(param: unknown): string | null {
  if (!param || typeof param !== 'object') return null;
  const p = param as { type?: unknown; screening?: unknown; screeningFields?: unknown };
  const isTable = isTableType(p.type);
  if (p.screening !== undefined && p.screening !== null && typeof p.screening !== 'boolean') return '“Requires screening” must be true or false.';
  if (p.screening === true && !isScreenableType(p.type)) return 'Only Text, Table and File Upload parameters can require screening.';
  const hasFields = p.screeningFields !== undefined && p.screeningFields !== null;
  if (hasFields && !isTable) return 'Only a Table has screening columns.';
  if (hasFields && (!Array.isArray(p.screeningFields) || p.screeningFields.some((field) => typeof field !== 'string'))) return 'Screening columns must be a list of column names.';
  if (p.screening !== true || !isTable) return null;
  const fields = ((p.screeningFields as string[] | undefined) ?? []).map((field) => field.trim()).filter((field) => field !== '');
  if (fields.length === 0) return 'A Table that requires screening needs at least one screening column.';
  const columns = expectedColumnsOf(param);
  if (columns.length === 0) return null;
  const known = new Set(columns.map((column) => column.toLowerCase()));
  const unknown = fields.find((field) => !known.has(field.toLowerCase()));
  return unknown ? `Screening column “${unknown}” is not one of this Table's columns.` : null;
}
