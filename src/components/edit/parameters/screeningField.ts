import { screeningRuleViolation } from '../../../utils/parameterValidation';
import { columnNamesFromText, columnsText } from '../../../utils/tableColumns';

/** The Table's columns as the Columns field currently reads — offered in the Screening columns picker. */
export const screeningColumnOptions = (parameter: any): string[] => columnNamesFromText(columnsText(parameter));

export const screeningFieldsOf = (parameter: any): string[] =>
  Array.isArray(parameter?.screeningFields) ? parameter.screeningFields.filter((field: unknown): field is string => typeof field === 'string' && field.trim() !== '') : [];

/** The rule, judged against the columns as typed (the save resolves `_columnsText` into tableData first). */
export function screeningFieldError(parameter: any): string | null {
  const columns = screeningColumnOptions(parameter).map((header) => ({ header }));
  return screeningRuleViolation({ ...parameter, tableData: { ...(parameter?.tableData ?? {}), columns } });
}
