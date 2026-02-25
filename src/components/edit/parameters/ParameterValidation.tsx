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
  // Options is required if param is of type dropdown (enum-style)
  if (
    row.type === "dropdown" &&
    (row.options === undefined || row.options.length === 0)
  ) {
    errors.push({
      field: "options",
      errorMsg: "Options are required for parameters of type 'dropdown'.",
    });
  }

  if (row.price !== undefined && row.price !== null) {
    const numericPrice = Number(row.price);
    if (Number.isNaN(numericPrice)) {
      errors.push({ field: "price", errorMsg: "Price must be a number." });
    } else if (numericPrice < 0) {
      errors.push({ field: "price", errorMsg: "Price cannot be negative." });
    }
  }

  return errors;
}
