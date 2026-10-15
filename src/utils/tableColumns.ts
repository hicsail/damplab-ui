import { idFromName } from './idFromName';
import { expectedColumnsOf, hasStaffTemplate, isTableType } from './sampleSheetValue';

/**
 * A Table parameter's columns, from a list of names to what is stored
 * (`tableData.columns`). One rule for the Catalog Editor's Columns field and
 * the workbook's `options` cell.
 */

export interface TableColumn {
  header: string;
  field: string;
  [key: string]: unknown;
}

const key = (name: unknown): string => String(name ?? '').trim().toLowerCase();

/**
 * Names are trimmed and blank ones dropped; two names equal ignoring case are
 * refused. A name equal (ignoring case) to a stored column's header keeps that
 * column — its `field` and anything else on it — under the new spelling. A new
 * name gets a `field` slugged from it, unique within the parameter. Nothing
 * reads `field` any more; it is kept so stored columns are never rewritten.
 */
export function resolveTableColumns(names: readonly string[], stored: readonly any[]): { columns: TableColumn[]; errors: string[] } {
  const wanted = names.map((name) => String(name ?? '').trim()).filter((name) => name !== '');
  const errors: string[] = [];
  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const name of wanted) {
    const k = key(name);
    if (seen.has(k) && !reported.has(k)) {
      errors.push(`Column “${name}” is listed twice.`);
      reported.add(k);
    }
    seen.add(k);
  }

  const storedColumns = (Array.isArray(stored) ? stored : []).filter((column) => column && typeof column === 'object');
  const kept = wanted.map((name) => storedColumns.find((column) => key(column.header) === key(name)));
  const usedFields = new Set<string>(kept.filter(Boolean).map((column) => String(column.field ?? '')).filter((field) => field !== ''));

  const columns = wanted.map((name, index) => {
    const old = kept[index];
    if (old && typeof old.field === 'string' && old.field !== '') return { ...old, header: name } as TableColumn;
    const base = idFromName(name);
    let field = base;
    for (let n = 2; usedFields.has(field); n++) field = `${base}_${n}`;
    usedFields.add(field);
    return { ...(old ?? {}), header: name, field } as TableColumn;
  });
  return { columns, errors };
}

/** The Columns field holds one name per line, so a name may contain “;”. */
export const columnNamesFromText = (text: string): string[] =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

/** What the Columns field shows: the text being typed, else the stored headers one per line. */
export const columnsText = (parameter: any): string => (typeof parameter?._columnsText === 'string' ? parameter._columnsText : expectedColumnsOf(parameter).join('\n'));

/** Why the Columns field cannot be saved as it stands, or null. */
export function columnsError(parameter: any): string | null {
  if (!isTableType(parameter?.type)) return null;
  const edited = typeof parameter?._columnsText === 'string';
  const names = edited ? columnNamesFromText(parameter._columnsText) : expectedColumnsOf(parameter);
  // The save refuses a repeated name only in the text that was typed; stored columns are not re-judged.
  if (edited) {
    const { errors } = resolveTableColumns(names, []);
    if (errors.length > 0) return errors[0];
  }
  if (names.length === 0 && !hasStaffTemplate(parameter)) return 'Add at least one column.';
  return null;
}
