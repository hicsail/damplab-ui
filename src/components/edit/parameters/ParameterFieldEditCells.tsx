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
  Box,
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";

// TODO: Re-render grid (or individual edit cells) on parameter type change.

export function ParameterBooleanSelect(props: GridRenderEditCellParams) {
  // This component exists solely to make the singleSelect show the field name as the displayEmpty renderValue.

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
      <Select
        value={value !== undefined ? value : ""}
        ref={ref}
        onChange={handleValueChange}
        displayEmpty={true}
        renderValue={(val) => {
          if (val === true) {
            return "true";
          } else if (val === false) {
            return "false";
          } else {
            //return <span color={"textDisabled"}>{field}</span>;
            return <MenuItem disabled>{field}</MenuItem>;
          }
        }}
      >
        <MenuItem disabled value={""}>
          <em>{field}</em>
        </MenuItem>
        <MenuItem value={true}>true</MenuItem>
        <MenuItem value={false}>false</MenuItem>
      </Select>
    </FormControl>
  );
}

export function ParameterDefaultValueInput(props: GridRenderEditCellParams) {
  const { id, field, hasFocus } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();
  const [isHover, setIsHover] = React.useState(false);

  const isDisabled = !(
    props.row.type === "string" || props.row.type === "number"
  );
  const disabledTooltipMsg = `${field} is only applicable for parameters of type string or number.`;

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <Tooltip open={isDisabled && isHover} title={disabledTooltipMsg} arrow>
      <GridEditInputCell
        ref={ref}
        disabled={isDisabled}
        onChange={handleValueChange}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        placeholder={"Default value"}
        {...props}
      />
    </Tooltip>
  );
}

export function ParameterDescriptionInput(props: GridRenderEditCellParams) {
  return <GridEditInputCell {...props} placeholder={"Description"} />;
}

export function ParameterIdInput(props: GridRenderEditCellParams) {
  return <GridEditInputCell {...props} placeholder={"id"} />;
}

export function ParameterNameInput(props: GridRenderEditCellParams) {
  return (
    <GridEditInputCell
      {...props}
      placeholder={"Name (required)"}
      endAdornment={<InputAdornment position={"end"}>*</InputAdornment>}
    />
  );
}

export function ParameterOptionsButton(props: GridRenderEditCellParams) {
  const [isHover, setIsHover] = React.useState(false);

  const isDisabled = props.row.type !== "enum";
  const disabledTooltipMsg =
    "Options is only applicable for parameters of type enum.";

  return (
    <Tooltip open={isDisabled && isHover} title={disabledTooltipMsg} arrow>
      <Box
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
      >
        <Button
          variant="contained"
          disabled={isDisabled}
          onClick={() => props.handleOptionsEditButton(props)}
        >
          Edit
        </Button>
      </Box>
    </Tooltip>
  );
}

export function ParameterParamTypeSelect(props: GridRenderEditCellParams) {
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
      <Select
        value={value ? value : ""}
        ref={ref}
        onChange={handleValueChange}
        displayEmpty={true}
        renderValue={(val) => {
          if (val === "") {
            //return <span color={"textDisabled"}>ParamType</span>;
            return <MenuItem disabled>ParamType</MenuItem>;
          }
          return val;
        }}
      >
        <MenuItem disabled value={""}>
          <em>ParamType</em>
        </MenuItem>
        <MenuItem value={"input"}>input</MenuItem>
        {/*<MenuItem value={"result"}>result</MenuItem> only input for now... */}
        {/*<MenuItem value={"flow"}>flow</MenuItem> only input for now... */}
      </Select>
    </FormControl>
  );
}

export function ParameterRangeValueInput(props: GridRenderEditCellParams) {
  const { id, field, hasFocus } = props;
  const apiRef = useGridApiContext();
  const ref = React.useRef();
  const [isHover, setIsHover] = React.useState(false);

  const isDisabled = props.row.type !== "number";
  const disabledTooltipMsg = `${field} is only applicable for parameters of type number.`;

  React.useLayoutEffect(() => {
    if (hasFocus) {
      ref.current.focus();
    }
  }, [hasFocus]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <Tooltip open={isDisabled && isHover} title={disabledTooltipMsg} arrow>
      <GridEditInputCell
        ref={ref}
        disabled={isDisabled}
        onChange={handleValueChange}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        placeholder={field}
        {...props}
      />
    </Tooltip>
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
  };

  return (
    <FormControl fullWidth>
      <Select
        value={value ? value : ""}
        ref={ref}
        onChange={handleValueChange}
        displayEmpty={true}
        endAdornment={<InputAdornment position={"end"}>*</InputAdornment>}
        renderValue={(val) => {
          if (val === "") {
            //return <span color={"textDisabled"}>Type (required)</span>;
            return <MenuItem disabled>Type (required)</MenuItem>;
          }
          return val;
        }}
      >
        <MenuItem disabled value={""}>
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
