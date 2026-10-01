import { EditableParameter, prepareParametersForSave } from './parameters/parameterSave';

/** Parameters loaded from a saved set keep their ids: recorded job answers are keyed by them. */
export function lockedDragKeys(loaded: ReadonlyArray<EditableParameter>): Set<string> {
  return new Set(loaded.map((p) => p._dragKey));
}

export function parameterSetPayload(input: {
  name: string;
  description: string;
  parameters: ReadonlyArray<EditableParameter>;
  tableDataText: Record<number, string>;
  /**
   * Same predicate passed to ParameterListEditor's `isIdLocked`. Forwarded to
   * prepareParametersForSave so a new parameter colliding with a saved id is
   * the one renamed, never the saved one (controller ruling C4 / pin 2).
   */
  isIdLocked?: (p: EditableParameter) => boolean;
}): { payload?: { name: string; description: string | null; parameters: any[] }; errors: string[] } {
  const name = input.name.trim();
  if (!name) return { errors: ['Name is required.'] };
  if (name.includes(';')) return { errors: ['A set name cannot contain ";".'] };
  const { parameters, errors } = prepareParametersForSave(input.parameters, input.tableDataText, input.isIdLocked);
  if (errors.length) return { errors };
  return { payload: { name, description: input.description.trim() || null, parameters }, errors: [] };
}

export function usedByLabel(count: number): string {
  if (count === 0) return 'Not used';
  return `Used by ${count} operation${count === 1 ? '' : 's'}`;
}
