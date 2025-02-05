/*
    Custom renderEditCells for parameter fields.

    Checks are being performed in renderEditCell rather than with preProcessEditCellProps
    because otherwise, as the code currently stands, in the (common) case where a user *adds a new* row/record,
    preProcessEditCellProps does not run if the user does not touch the relevant cell, and so the user will
    not see the relevant feedback.
 */

import * as React from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import {
  GridEditInputCell,
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";
import { Button, Tooltip } from "@mui/material";

export function ParameterDefaultValueInput(props: GridRenderEditCellParams) {
  // TODO: make disabled state look more evident; info msg on hover over disabled cell.
  const { id, field, hasFocus } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <GridEditInputCell
      ref={ref}
      disabled={!(props.row.type === "string" || props.row.type === "number")}
      onChange={handleValueChange}
      {...props}
    />
  );
}

export function ParameterNameInput(props: GridRenderEditCellParams) {
  const hasError = props.value === undefined || props.value.length === 0;
  const errorMsg = "Name is required.";

  return (
    <Tooltip open={hasError} title={errorMsg} arrow>
      <GridEditInputCell {...props} />
    </Tooltip>
  );
}

export function ParameterOptionsButton(props: GridRenderEditCellParams) {
  // TODO: re-render on parameter type change? info msg on hover over disabled button?

  let hasError, errorMsg;
  if (
    props.row.type === "enum" &&
    (props.value === undefined || props.value.length == 0)
  ) {
    hasError = true;
    errorMsg = "Options are required for parameters of type 'enum'.";
  } else if (
    props.row.type !== "enum" &&
    props.value !== undefined &&
    props.value.length > 0
  ) {
    hasError = true;
    errorMsg = "Options will be ignored for parameters of type 'enum'.";
  } else {
    hasError = false;
    errorMsg = "";
  }
  return (
    <Tooltip open={hasError} title={errorMsg} arrow>
      <Button
        variant="contained"
        disabled={props.row.type !== "enum"}
        onClick={() => props.handleOptionsEditButton(props)}
      >
        Edit
      </Button>
    </Tooltip>
  );
}

export function ParameterRangeValueInput(props: GridRenderEditCellParams) {
  // TODO: make disabled state look more evident; info msg on hover over disabled cell.
  const { id, field, hasFocus } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <GridEditInputCell
      ref={ref}
      disabled={props.row.type !== "number"}
      onChange={handleValueChange}
      {...props}
    />
  );
}

export function ParameterTypeSelect(props: GridRenderEditCellParams) {
  const { id, value, field, hasFocus } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <FormControl fullWidth>
      <Tooltip open={value === undefined} title={"Type is required."} arrow>
        <Select value={value} ref={ref} onChange={handleValueChange}>
          <MenuItem value={"string"}>string</MenuItem>
          <MenuItem value={"number"}>number</MenuItem>
          <MenuItem value={"file"}>file</MenuItem>
          <MenuItem value={"boolean"}>boolean</MenuItem>
          <MenuItem value={"enum"}>enum (dropdown)</MenuItem>
          <MenuItem value={"table"}>table</MenuItem>
        </Select>
      </Tooltip>
    </FormControl>
  );
}
