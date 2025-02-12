/*
    Custom renderEditCells for parameter fields.
 */

import * as React from "react";
import {
  GridEditInputCell,
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";
import {
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";

// TODO: Re-render grid (or individual edit cells) on parameter type change.

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
  return (
    <GridEditInputCell
      {...props}
      placeholder={"Name (required)"}
      endAdornment={<InputAdornment>*</InputAdornment>}
    />
  );
}

export function ParameterOptionsButton(props: GridRenderEditCellParams) {
  // TODO: remove tooltip. re-render on parameter type change? info msg on hover over disabled button?

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
  const { id, value, field, hasFocus, setTypeChangeDialog } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    /* FIXME: Changing the value triggers a MUI error complaining about the Select component going from uncontrolled to controlled.
       Apparently, on initial render it gets classified as uncontrolled, because the value is undefined.
       But this component is in fact controlled - value is read from props and gets set here on change.
       So need to either figure out why I am wrong and it's actually initially uncontrolled,
       or figure out how to explain to MUI that there's no problem...
    */

    if (value === "string" && !!props.row.defaultValue) {
      setTypeChangeDialog({
        open: true,
        oldType: value,
        newType: event.target.value,
        fieldsToReset: ["defaultValue"],
        onConfirm: () => {
          apiRef.current.setEditCellValue({
            id,
            field: "defaultValue",
            value: undefined,
          });
          apiRef.current.setEditCellValue({
            id,
            field,
            value: event.target.value,
          });
          setTypeChangeDialog({ open: false });
        },
        onCancel: () => {
          setTypeChangeDialog({ open: false });
        },
      });
    } else if (value === "number") {
      let fieldsToReset: string[] = [];
      if (!!props.row.defaultValue) {
        // do we want to check the new type and if it is "string" then leave this be...?
        fieldsToReset.push("defaultValue");
      }
      if (!!props.row.rangeValueMin) {
        fieldsToReset.push("rangeValueMin");
      }
      if (!!props.row.rangeValueMax) {
        fieldsToReset.push("rangeValueMax");
      }

      if (fieldsToReset.length > 0) {
        setTypeChangeDialog({
          open: true,
          oldType: value,
          newType: event.target.value,
          fieldsToReset: fieldsToReset,
          onConfirm: () => {
            for (const field of fieldsToReset) {
              apiRef.current.setEditCellValue({
                id,
                field: field,
                value: undefined,
              });
            }
            apiRef.current.setEditCellValue({
              id,
              field,
              value: event.target.value,
            });
            setTypeChangeDialog({ open: false });
          },
          onCancel: () => {
            setTypeChangeDialog({ open: false });
          },
        });
      } else {
        // No problems
        apiRef.current.setEditCellValue({
          id,
          field,
          value: event.target.value,
        });
      }
    } else if (
      value === "enum" &&
      !!props.row.options &&
      props.row.options?.length > 0
    ) {
      setTypeChangeDialog({
        open: true,
        oldType: value,
        newType: event.target.value,
        fieldsToReset: ["options"],
        onConfirm: () => {
          apiRef.current.setEditCellValue({ id, field: "options", value: [] });
          apiRef.current.setEditCellValue({
            id,
            field,
            value: event.target.value,
          });
          setTypeChangeDialog({ open: false });
        },
        onCancel: () => {
          setTypeChangeDialog({ open: false });
        },
      });
    } else if (value === "table" && !!props.row.tableData) {
      setTypeChangeDialog({
        open: true,
        oldType: value,
        newType: event.target.value,
        fieldsToReset: ["tableData"],
        onConfirm: () => {
          apiRef.current.setEditCellValue({
            id,
            field: "tableData",
            value: undefined,
          });
          apiRef.current.setEditCellValue({
            id,
            field,
            value: event.target.value,
          });
          setTypeChangeDialog({ open: false });
        },
        onCancel: () => {
          setTypeChangeDialog({ open: false });
        },
      });
    } else {
      // No problems
      apiRef.current.setEditCellValue({ id, field, value: event.target.value });
    }
    // TODO: Re-render the grid/the edit cells that depend on the param type
    //apiRef.current.forceUpdate(); //<-- this is not quite it...
  };

  return (
    <FormControl fullWidth>
      <Select
        value={value}
        ref={ref}
        onChange={handleValueChange}
        displayEmpty={true}
        endAdornment={<InputAdornment>*</InputAdornment>}
        renderValue={(val) => {
          if (val === undefined) {
            //return <span color={"textDisabled"}>Type (required)</span>;
            return <MenuItem disabled>Type (required)</MenuItem>;
          }
          return val;
        }}
      >
        <MenuItem disabled value={undefined}>
          <em>Type (required)</em>
        </MenuItem>
        <MenuItem value={"string"}>string</MenuItem>
        <MenuItem value={"number"}>number</MenuItem>
        <MenuItem value={"file"}>file</MenuItem>
        <MenuItem value={"boolean"}>boolean</MenuItem>
        <MenuItem value={"enum"}>enum (dropdown)</MenuItem>
        <MenuItem value={"table"}>table</MenuItem>
      </Select>
    </FormControl>
  );
}
