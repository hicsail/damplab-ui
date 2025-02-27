import { GridRowModel } from "@mui/x-data-grid";

interface ParameterValidationError {
  field: string;
  errorMsg: string;
}

export function validateParameter(row: GridRowModel): ParameterValidationError {
  let errors: ParameterValidationError[] = [];

  // Name is required
  if (row.name === undefined || row.name === "") {
    errors.push({ field: "name", errorMsg: "Name is a required field." });
  }
  // Type is required
  if (row.type === undefined) {
    errors.push({ field: "type", errorMsg: "Type is a required field." });
  }
  // Options is required if param is of type enum
  if (
    row.type === "enum" &&
    (row.options === undefined || row.options.length === 0)
  ) {
    errors.push({
      field: "options",
      errorMsg: "Options are required for parameters of type 'enum'.",
    });
  }

  return errors;
}
