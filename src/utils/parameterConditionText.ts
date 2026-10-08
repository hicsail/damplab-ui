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
import type { ConditionOp } from './parameterConditions';

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
const WORD = /^[A-Za-z_][A-Za-z0-9_]*/;

/** Curly quotes are read as straight quotes (rule 2). */
const straighten = (text: string): string => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

function tokenize(input: string): { tokens: Token[] } | { error: string } {
  const text = straighten(input);
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let value = '';
      let j = i + 1;
      for (;;) {
        if (j >= text.length) return { error: `A quote opened at character ${i + 1} is never closed.` };
        if (text[j] === '\\' && j + 1 < text.length) {
          value += text[j + 1];
          j += 2;
          continue;
        }
        if (text[j] === ch) break;
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
