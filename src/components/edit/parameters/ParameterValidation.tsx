import { GridRowModel } from "@mui/x-data-grid";

interface ParameterValidationError {
  field: string;
  errorMsg: string;
}

export function validateParameter(row: GridRowModel): ParameterValidationError {
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

  return errors;
}
