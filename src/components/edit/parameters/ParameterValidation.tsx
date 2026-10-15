import { GridRowModel } from "@mui/x-data-grid";
import { validationError } from './parameterTypeChoice';
import { isTableType, tableIsSetUp } from '../../../utils/sampleSheetValue';

export interface ParameterValidationError {
  field: string;
  errorMsg: string;
}

export interface ParameterValidationOptions {
  /** A Table loaded from the server that this edit did not change: rule 12 does not hold it, so an unrelated edit to its catalog still saves. */
  tableUntouched?: boolean;
}

export function validateParameter(row: GridRowModel, options: ParameterValidationOptions = {}): ParameterValidationError[] {
  let errors: ParameterValidationError[] = [];

  // Name is required
  if (row.name === undefined || row.name === "") {
    errors.push({ field: "Name", errorMsg: "Name is required." });
  }
  // Type is required
  if (row.type === undefined) {
    errors.push({ field: "Answer format", errorMsg: "Answer format is required." });
  }
  // Options is required if param is of type dropdown (enum-style)
  if (
    row.type === "dropdown" &&
    (row.options === undefined || row.options.length === 0)
  ) {
    errors.push({
      field: "Choices",
      errorMsg: "Add at least one choice when answer format is Pick from list.",
    });
  }

  if (row.price !== undefined && row.price !== null) {
    const numericPrice = Number(row.price);
    if (Number.isNaN(numericPrice)) {
      errors.push({ field: "Fallback price", errorMsg: "Fallback price must be a number." });
    } else if (numericPrice < 0) {
      errors.push({ field: "Fallback price", errorMsg: "Fallback price cannot be negative." });
    }
  }

  const validationProblem = validationError(row);
  if (validationProblem) {
    errors.push({ field: "Validation", errorMsg: validationProblem });
  }

  if (row.display === "checkboxes" && !(row.type === "dropdown" && row.allowMultipleValues === true)) {
    errors.push({ field: "Answer format", errorMsg: "Checkboxes needs “Allow multiple selections” to be Yes." });
  }

  // A Table needs a column or a staff template, or no upload could be checked against it. Held only when this edit is what leaves it so.
  if (isTableType(row.type) && !tableIsSetUp(row) && !options.tableUntouched) {
    errors.push({ field: "Columns", errorMsg: "Add at least one column." });
  }

  return errors;
}
