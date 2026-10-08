/**
 * The text form of a "show only if" condition — what staff type in the Catalog
 * Editor and in the workbook's `conditionalDisplayLogic` column:
 *
 *   "Sample Type"=="Bacteria" && ("Volume">5 || "Notes".includes("rush"))
 *   "Nucleic Acid Extraction"."Sample Type" in ("Bacteria","Yeast")
 *
 * Text is only ever an input and a display. What is stored on the parameter is
 * the `Condition` tree keyed by parameter id and option id (utils/parameterConditions.ts),
 * so renaming a parameter, a set or an option never changes what a condition means.
 *
 *   parseCondition(text)            text → syntax tree, or a syntax error
 *   resolveCondition(tree, scope)   syntax tree → Condition, or the first rule-6 error
 *   conditionText(condition, scope) Condition → text, with today's names
 *
 * Pure. UI only: the backend never sees text.
 */
import { comparisonFits } from './parameterConditions';
import type { Comparison, Condition, ConditionOp } from './parameterConditions';

// ------------------------------------------------------------------ syntax tree

export interface RefAst {
  /** The set name of a qualified reference: "Set"."Parameter". */
  set?: string;
  name: string;
}
export type LiteralAst = string | number | boolean;
export interface ComparisonAst {
  ref: RefAst;
  op: ConditionOp;
  /** Every operator but `in`. */
  value?: LiteralAst;
  /** `in (…)`. */
  values?: Array<string | number>;
}
export type ConditionAst = { all: ConditionAst[] } | { any: ConditionAst[] } | ComparisonAst;
export type ParsedCondition = { tree: ConditionAst } | { error: string };

// ------------------------------------------------------------------ tokens

type Token =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'word'; value: string }
  | { kind: 'symbol'; value: string };

const SYMBOLS = ['&&', '||', '==', '!=', '>=', '<=', '>', '<', '(', ')', ',', '.'] as const;
const OPERATORS: Record<string, ConditionOp> = { '==': 'eq', '!=': 'ne', '>': 'gt', '>=': 'ge', '<': 'lt', '<=': 'le' };
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)/;
/** NUMBER, anchored at both ends: a whole value that is a single number token. */
const NUMBER_WHOLE = new RegExp(`${NUMBER.source}$`);
const WORD = /^[A-Za-z_][A-Za-z0-9_]*/;

/** Curly quotes are read as straight quotes (rule 2). */
const straighten = (text: string): string => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

/**
 * What may close a string, by the character that opened it. Only the delimiters
 * are straightened, never what is inside: a string opened by a straight quote
 * closes on a straight quote alone, so a curly quote in a name is ordinary text.
 * One opened by a curly quote closes on either form.
 */
const CLOSERS: Record<string, string> = { '"': '"', "'": "'", '“': '"“”', '”': '"“”', '‘': "'‘’", '’': "'‘’" };

function tokenize(text: string): { tokens: Token[] } | { error: string } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch in CLOSERS) {
      let value = '';
      let j = i + 1;
      for (;;) {
        if (j >= text.length) return { error: `A quote opened at character ${i + 1} is never closed.` };
        if (text[j] === '\\' && j + 1 < text.length) {
          value += text[j + 1];
          j += 2;
          continue;
        }
        if (CLOSERS[ch].includes(text[j])) break;
        value += text[j];
        j += 1;
      }
      tokens.push({ kind: 'string', value });
      i = j + 1;
      continue;
    }
    const rest = text.slice(i);
    const symbol = SYMBOLS.find((s) => rest.startsWith(s));
    // "-5" and ".5" are numbers; "." before a quote or a word is the reference dot.
    const number = NUMBER.exec(rest);
    if (number && (symbol === undefined || symbol === '.')) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    if (symbol !== undefined) {
      tokens.push({ kind: 'symbol', value: symbol });
      i += symbol.length;
      continue;
    }
    const word = WORD.exec(rest);
    if (word) {
      tokens.push({ kind: 'word', value: word[0] });
      i += word[0].length;
      continue;
    }
    return { error: `Unexpected “${ch}” at character ${i + 1}.` };
  }
  return { tokens };
}

const show = (token: Token | undefined): string => {
  if (!token) return 'the end';
  if (token.kind === 'string') return `“${token.value}”`;
  return `“${String(token.value)}”`;
};

// ------------------------------------------------------------------ parser

class SyntaxProblem extends Error {}

/**
 * condition := and ('||' and)*          && binds tighter than ||
 * and       := unit ('&&' unit)*
 * unit      := '(' condition ')' | comparison
 * comparison:= ref ( op literal | 'in' '(' literal (',' literal)* ')' | '.includes' '(' string ')' )
 * ref       := string ('.' string)?
 */
export function parseCondition(text: string): ParsedCondition {
  const lexed = tokenize(text);
  if ('error' in lexed) return { error: lexed.error };
  const { tokens } = lexed;
  if (tokens.length === 0) return { error: 'The condition is empty.' };
  let at = 0;

  const peek = (): Token | undefined => tokens[at];
  const isSymbol = (value: string, token: Token | undefined = peek()): boolean => token?.kind === 'symbol' && token.value === value;
  const isWord = (value: string, token: Token | undefined = peek()): boolean => token?.kind === 'word' && token.value.toLowerCase() === value;
  const fail = (expected: string): never => {
    throw new SyntaxProblem(`Expected ${expected} but found ${show(peek())}.`);
  };
  const eat = (value: string): void => {
    if (!isSymbol(value)) fail(`“${value}”`);
    at += 1;
  };

  const literal = (): LiteralAst => {
    const token = peek();
    if (token?.kind === 'string' || token?.kind === 'number') {
      at += 1;
      return token.value;
    }
    if (isWord('true') || isWord('false')) {
      at += 1;
      return (token as { value: string }).value.toLowerCase() === 'true';
    }
    return fail('a quoted value, a number, true or false');
  };

  const comparison = (): ComparisonAst => {
    const first = peek();
    if (first?.kind !== 'string') return fail('a quoted parameter name');
    at += 1;
    let ref: RefAst = { name: first.value };
    if (isSymbol('.') && tokens[at + 1]?.kind === 'string') {
      ref = { set: first.value, name: (tokens[at + 1] as { value: string }).value };
      at += 2;
    }
    if (isSymbol('.')) {
      at += 1;
      if (!isWord('includes')) fail('“includes”');
      at += 1;
      eat('(');
      const token = peek();
      if (token?.kind !== 'string') return fail('quoted text');
      at += 1;
      eat(')');
      return { ref, op: 'includes', value: token.value };
    }
    if (isWord('in')) {
      at += 1;
      eat('(');
      const values: Array<string | number> = [];
      for (;;) {
        const value = literal();
        if (typeof value === 'boolean') throw new SyntaxProblem('“in” takes quoted values, not true or false.');
        values.push(value);
        if (!isSymbol(',')) break;
        at += 1;
      }
      eat(')');
      return { ref, op: 'in', values };
    }
    const token = peek();
    if (token?.kind !== 'symbol' || !(token.value in OPERATORS)) return fail('==, !=, >, >=, <, <=, in or .includes');
    at += 1;
    return { ref, op: OPERATORS[token.value], value: literal() };
  };

  const unit = (): ConditionAst => {
    if (!isSymbol('(')) return comparison();
    at += 1;
    const inner = or();
    eat(')');
    return inner;
  };

  const group = (key: 'all' | 'any', separator: string, part: () => ConditionAst): ConditionAst => {
    const parts = [part()];
    while (isSymbol(separator)) {
      at += 1;
      parts.push(part());
    }
    return parts.length === 1 ? parts[0] : ({ [key]: parts } as ConditionAst);
  };
  const and = (): ConditionAst => group('all', '&&', unit);
  function or(): ConditionAst {
    return group('any', '||', and);
  }

  try {
    const tree = or();
    if (at < tokens.length) fail('&& or ||');
    return { tree };
  } catch (error) {
    if (error instanceof SyntaxProblem) return { error: error.message };
    throw error;
  }
}

/** Whether two condition texts say the same thing ignoring whitespace outside quotes and quote style (rule 26). */
export function sameConditionText(a: string, b: string): boolean {
  const left = tokenize(a);
  const right = tokenize(b);
  if ('error' in left || 'error' in right) return a.trim() === b.trim();
  return JSON.stringify(left.tokens) === JSON.stringify(right.tokens);
}

// ------------------------------------------------------------------ scope

export interface ScopeSet {
  id: string;
  name: string;
  parameters?: unknown;
}

/** Where a condition lives: what its references are resolved against, and printed from. */
export interface ConditionScope {
  /** The list the carrier is in: one set's parameters, or an operation's own parameters. */
  list: ReadonlyArray<any>;
  /** The carrier's position in `list`. Omit when only printing. */
  carrierIndex?: number;
  /** The id of the set `list` belongs to; absent for an operation's own parameters (and for a set not saved yet). */
  setId?: string;
  /** Every parameter set, for qualified references. */
  sets: ReadonlyArray<ScopeSet>;
}

const key = (s: unknown): string => String(s ?? '').trim().toLowerCase();
/** `key` with quotes straightened, so a hand-typed "Buyer's note" finds `Buyer’s note`. */
const looseKey = (s: unknown): string => straighten(key(s));
/** The items named `wanted` (rule 4): an exact match wins; failing one, a match with quotes straightened on both sides. */
function named<T>(items: readonly T[], nameOf: (item: T) => unknown, wanted: unknown): T[] {
  const exact = items.filter((item) => key(nameOf(item)) === key(wanted));
  return exact.length > 0 ? exact : items.filter((item) => looseKey(nameOf(item)) === looseKey(wanted));
}
const listOf = (set: ScopeSet): any[] => (Array.isArray(set.parameters) ? set.parameters : []);
const optionsOf = (parameter: any): any[] => (Array.isArray(parameter?.options) ? parameter.options : []);
const labelOf = (parameter: any): string => String(parameter?.name ?? parameter?.id ?? '').trim();
/** The evaluator's `isChoice`: a legacy `enum` is a choice too. */
const isChoiceType = (type: string): boolean => type === 'dropdown' || type === 'enum';
const TYPE_NAMES: Record<string, string> = { table: 'Table', file: 'File upload', sampleSheet: 'Samples spreadsheet' };

// ------------------------------------------------------------------ resolver (rules 5–7)

const OPERATOR_TEXT: Record<string, string> = { eq: '==', ne: '!=', gt: '>', ge: '>=', lt: '<', le: '<=' };

class ResolveProblem extends Error {}

/** Key order is fixed (parameterId, parameterSetId, op, optionIds, value, values) so two equal conditions serialise the same. */
function comparisonOf(parameterId: string, parameterSetId: string | undefined, op: ConditionOp, payload: Pick<Comparison, 'optionIds' | 'value' | 'values'>): Comparison {
  return {
    parameterId,
    ...(parameterSetId !== undefined ? { parameterSetId } : {}),
    op,
    ...(payload.optionIds !== undefined ? { optionIds: payload.optionIds } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
    ...(payload.values !== undefined ? { values: payload.values } : {})
  };
}

function resolveComparison(ast: ComparisonAst, scope: ConditionScope): Comparison {
  // 1. Which list (rule 5).
  let list: ReadonlyArray<any> = scope.list;
  let parameterSetId: string | undefined;
  let where = 'here';
  if (ast.ref.set !== undefined) {
    const found = named(scope.sets, (set) => set.name, ast.ref.set);
    if (found.length === 0) throw new ResolveProblem(`No parameter set is named “${ast.ref.set}”.`);
    if (found.length > 1) throw new ResolveProblem(`${found.length} parameter sets are named “${ast.ref.set}”.`);
    where = `in “${found[0].name.trim()}”`;
    // Naming the carrier's own set is the same as not naming it.
    if (scope.setId === undefined || found[0].id !== scope.setId) {
      list = listOf(found[0]);
      parameterSetId = found[0].id;
    }
  }

  // 2. Which parameter.
  const matches = named(
    list.map((parameter, index) => ({ parameter, index })),
    ({ parameter }) => parameter?.name,
    ast.ref.name
  );
  if (matches.length === 0) throw new ResolveProblem(`No parameter is named “${ast.ref.name}” ${where}.`);
  if (matches.length > 1) throw new ResolveProblem(`${matches.length} parameters are named “${ast.ref.name}” ${where}.`);
  const { parameter, index } = matches[0];
  const name = labelOf(parameter);
  if (parameterSetId === undefined && index === scope.carrierIndex) throw new ResolveProblem('A parameter cannot depend on itself.');
  const id = String(parameter?.id ?? '');
  if (id === '') throw new ResolveProblem(`“${name}” has no id yet — save it first.`);

  // 3. What may be asked of it (rule 6).
  const type = String(parameter?.type ?? 'string');
  if (type in TYPE_NAMES) throw new ResolveProblem(`“${name}” is a ${TYPE_NAMES[type]} parameter and cannot control a condition.`);
  const { op } = ast;
  const ordering = op === 'gt' || op === 'ge' || op === 'lt' || op === 'le';
  const literals: LiteralAst[] = op === 'in' ? [...(ast.values ?? [])] : [ast.value as LiteralAst];

  if (type === 'boolean') {
    if (op !== 'eq' && op !== 'ne') throw new ResolveProblem(`“${name}” is a Yes/No parameter: compare it with == or != to true or false.`);
    if (typeof ast.value !== 'boolean') throw new ResolveProblem(`“${name}” is a Yes/No parameter: compare it to true or false, without quotes.`);
    return comparisonOf(id, parameterSetId, op, { value: ast.value });
  }
  if (literals.some((value) => typeof value === 'boolean')) throw new ResolveProblem(`true / false can only be compared with a Yes/No parameter; “${name}” is not one.`);

  if (ordering) {
    if (type !== 'number') throw new ResolveProblem(`“${OPERATOR_TEXT[op]}” needs a Number parameter; “${name}” is not one.`);
    const n = typeof ast.value === 'number' ? ast.value : Number(String(ast.value).trim());
    if (String(ast.value).trim() === '' || !Number.isFinite(n)) throw new ResolveProblem(`“${OPERATOR_TEXT[op]}” needs a number, not “${String(ast.value)}”.`);
    return comparisonOf(id, parameterSetId, op, { value: n });
  }

  if (op === 'includes') {
    if (type === 'number') throw new ResolveProblem(`.includes cannot be used on “${name}”: it is a Number parameter.`);
    if (String(ast.value) === '') throw new ResolveProblem('.includes needs some text.');
    return comparisonOf(id, parameterSetId, op, { value: String(ast.value) });
  }

  if (type === 'number') {
    // ==, != and in: a quoted number is accepted, as it is for the ordering operators; anything else could never be true.
    const bad = literals.find((value) => String(value).trim() === '' || !Number.isFinite(typeof value === 'number' ? value : Number(String(value).trim())));
    if (bad !== undefined) throw new ResolveProblem(`“${op === 'in' ? 'in' : OPERATOR_TEXT[op]}” needs ${op === 'in' ? 'numbers' : 'a number'}, not “${String(bad)}”.`);
  }

  if (isChoiceType(type)) {
    const optionIds = literals.map((value) => {
      const found = named(optionsOf(parameter), (option) => option?.name, value);
      if (found.length === 0) throw new ResolveProblem(`“${String(value)}” is not an option of “${name}”.`);
      if (found.length > 1) throw new ResolveProblem(`${found.length} options of “${name}” are named “${String(value)}”.`);
      const optionId = String(found[0]?.id ?? '');
      if (optionId === '') throw new ResolveProblem(`Option “${String(value)}” of “${name}” has no id yet — save it first.`);
      return optionId;
    });
    return comparisonOf(id, parameterSetId, op, { optionIds });
  }

  if (op === 'in') return comparisonOf(id, parameterSetId, op, { values: literals.map(String) });
  return comparisonOf(id, parameterSetId, op, { value: ast.value as string | number });
}

const isGroup = (c: unknown, k: 'all' | 'any'): c is Record<string, any[]> => !!c && typeof c === 'object' && Array.isArray((c as Record<string, unknown>)[k]);

function comparisonsOf(condition: unknown, out: Comparison[] = []): Comparison[] {
  if (isGroup(condition, 'all')) for (const child of condition.all) comparisonsOf(child, out);
  else if (isGroup(condition, 'any')) for (const child of condition.any) comparisonsOf(child, out);
  else if (condition && typeof condition === 'object' && typeof (condition as Comparison).parameterId === 'string') out.push(condition as Comparison);
  return out;
}

/** A cycle among the parameters the resolver can see: the carrier's list and every set (rule 6). */
function findLoop(condition: Condition, scope: ConditionScope): string | null {
  const OWN = '';
  const carrierKey = scope.setId ?? OWN;
  const lists = new Map<string, ReadonlyArray<any>>(scope.sets.map((set) => [set.id, listOf(set)] as const));
  lists.set(carrierKey, scope.list);
  const carrier = scope.carrierIndex !== undefined ? scope.list[scope.carrierIndex] : undefined;
  const nodeKey = (listKey: string, id: string): string => `${listKey}\u0000${id}`;
  const start = nodeKey(carrierKey, String(carrier?.id ?? ''));
  const targets = (c: unknown, fromList: string): Array<{ listKey: string; id: string }> => comparisonsOf(c).map((comparison) => ({ listKey: comparison.parameterSetId ?? fromList, id: comparison.parameterId }));

  const seen = new Set<string>();
  const queue = targets(condition, carrierKey);
  while (queue.length > 0) {
    const next = queue.pop()!;
    const k = nodeKey(next.listKey, next.id);
    if (k === start) return 'This condition would form a loop: the parameter it depends on depends, in turn, on this one.';
    if (seen.has(k)) continue;
    seen.add(k);
    const parameter = (lists.get(next.listKey) ?? []).find((p) => String(p?.id ?? '') === next.id);
    if (parameter?.showIf) queue.push(...targets(parameter.showIf, next.listKey));
  }
  return null;
}

/** The stored tree for a syntax tree, or the first error, naming the offending part (rules 5–7). */
export function resolveCondition(tree: ConditionAst, scope: ConditionScope): { condition: Condition } | { error: string } {
  const walk = (node: ConditionAst): Condition => {
    if ('all' in node) return { all: node.all.map(walk) };
    if ('any' in node) return { any: node.any.map(walk) };
    return resolveComparison(node, scope);
  };
  try {
    const condition = walk(tree);
    const loop = findLoop(condition, scope);
    return loop ? { error: loop } : { condition };
  } catch (error) {
    if (error instanceof ResolveProblem) return { error: error.message };
    throw error;
  }
}

/** Text straight to a stored condition: '' is "no condition". */
export function conditionFromText(text: string, scope: ConditionScope): { condition: Condition | undefined } | { error: string } {
  if (text.trim() === '') return { condition: undefined };
  const parsed = parseCondition(text);
  if ('error' in parsed) return { error: parsed.error };
  return resolveCondition(parsed.tree, scope);
}

// ------------------------------------------------------------------ printer (rule 25)

export const MISSING = '<missing>';
const quote = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** The parameter a stored comparison means in this scope, with how to write it; `text` is "<missing>" when it no longer resolves. */
function lookup(comparison: Comparison, scope: ConditionScope): { parameter?: any; text: string; missing?: string } {
  const sameList = comparison.parameterSetId === undefined || comparison.parameterSetId === scope.setId;
  if (sameList) {
    const parameter = scope.list.find((p) => String(p?.id ?? '') === comparison.parameterId);
    return parameter ? { parameter, text: quote(labelOf(parameter)) } : { text: quote(MISSING), missing: `a parameter that no longer exists (id ${comparison.parameterId})` };
  }
  const set = scope.sets.find((s) => s.id === comparison.parameterSetId);
  if (!set) return { text: quote(MISSING), missing: `a parameter set that no longer exists (id ${comparison.parameterSetId})` };
  const parameter = listOf(set).find((p) => String(p?.id ?? '') === comparison.parameterId);
  if (!parameter) return { text: quote(MISSING), missing: `a parameter that is no longer in “${set.name.trim()}” (id ${comparison.parameterId})` };
  return { parameter, text: `${quote(set.name.trim())}.${quote(labelOf(parameter))}` };
}

function comparisonText(comparison: Comparison, scope: ConditionScope, missing: string[]): string {
  const found = lookup(comparison, scope);
  if (found.missing) missing.push(found.missing);
  // The parameter is still there but its answer format changed under the condition: the evaluator treats that as unresolved too.
  // One phrase says it; the options it no longer has are not listed on top.
  const fits = !found.parameter || comparisonFits(comparison, found.parameter);
  if (!fits) missing.push(`“${labelOf(found.parameter)}”, whose answer format has changed since`);
  // A Number controller's values are numbers (possibly stored as numeric strings): written bare, as they are typed.
  // Only what the tokenizer reads back as one number goes bare (so not 1e3, +5 or 0x10), and in its trimmed form.
  const bare = (value: string): boolean => found.parameter?.type === 'number' && NUMBER_WHOLE.test(value.trim());
  const literal = (value: unknown): string => (typeof value !== 'string' ? String(value) : bare(value) ? value.trim() : quote(value));
  const optionText = (id: string): string => {
    const option = optionsOf(found.parameter).find((o) => String(o?.id ?? '') === id);
    if (!option && found.parameter && fits) missing.push(`an option “${labelOf(found.parameter)}” no longer has (id ${id})`);
    return quote(option ? String(option.name ?? '').trim() : MISSING);
  };
  const values = comparison.optionIds !== undefined ? comparison.optionIds.map(optionText) : comparison.values !== undefined ? comparison.values.map(literal) : [literal(comparison.value)];
  if (comparison.op === 'includes') return `${found.text}.includes(${values[0]})`;
  if (comparison.op === 'in') return `${found.text} in (${values.join(',')})`;
  return `${found.text}${OPERATOR_TEXT[comparison.op]}${values[0]}`;
}

function print(condition: Condition, scope: ConditionScope, missing: string[], parent?: 'all' | 'any'): string {
  for (const kind of ['all', 'any'] as const) {
    if (!isGroup(condition, kind)) continue;
    const children = (condition as Record<string, Condition[]>)[kind];
    const body = children.map((child) => print(child, scope, missing, kind)).join(kind === 'all' ? ' && ' : ' || ');
    // && binds tighter than ||, so only an && group directly under || goes without parentheses.
    return parent === undefined || (kind === 'all' && parent === 'any') ? body : `(${body})`;
  }
  return comparisonText(condition as Comparison, scope, missing);
}

/** The stored condition as text, with current names (rule 25). '' for no condition. */
export function conditionText(condition: Condition | null | undefined, scope: ConditionScope): string {
  if (condition === null || condition === undefined) return '';
  return print(condition, scope, []);
}

/** What a stored condition refers to that no longer resolves in this scope — one phrase each, no repeats (rule 32). */
export function missingReferences(condition: Condition | null | undefined, scope: ConditionScope): string[] {
  if (condition === null || condition === undefined) return [];
  const missing: string[] = [];
  print(condition, scope, missing);
  return [...new Set(missing)];
}

/**
 * The scope of one parameter of an operation's EFFECTIVE list (own, then each
 * set's, set entries carrying fromParameterSetId / fromParameterSetName) — for
 * read-only views that have no set list of their own (rule 33). A set the
 * operation does not use is not in scope there, so a reference into it prints
 * as "<missing>", which is also how the form treats it.
 */
export function effectiveScope(parameter: any, effectiveParameters: ReadonlyArray<any>): ConditionScope {
  const setIdOf = (p: any): string | undefined => (p?.fromParameterSetId ? String(p.fromParameterSetId) : undefined);
  const sets = new Map<string, ScopeSet & { parameters: any[] }>();
  for (const p of effectiveParameters) {
    const id = setIdOf(p);
    if (id === undefined) continue;
    if (!sets.has(id)) sets.set(id, { id, name: String(p.fromParameterSetName ?? id), parameters: [] });
    sets.get(id)!.parameters.push(p);
  }
  const setId = setIdOf(parameter);
  return { list: setId === undefined ? effectiveParameters.filter((p) => setIdOf(p) === undefined) : sets.get(setId)!.parameters, setId, sets: [...sets.values()] };
}
