/*
    Custom renderEditCells for parameter fields.
 */

import * as React from "react";
import {
  GridEditInputCell,
  GridRenderEditCellParams,
  GridState,
  useGridApiContext,
  useGridSelector,
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

/*
   Some fields (e.g. options, rangeValueMin/Max) render in edit mode as enabled/disabled depending on parameter type.
   A change in the *edit* cell value of the 'type' field must therefore trigger a re-render in those dependent fields.
   This is not achievable with props.row.type, since props.row.type is the "last saved" value, not the current edit value.
   (It *is* probably achievable by keeping some sort of 'editModeTypeValue' state in the parent DataGrid, but since
   multiple rows can be in edit mode simultaneously, that approach would probably become more complex than this one.)
   To trigger the necessary re-renders, this selector is used in renderEditCell components with useGridSelector
   like so: useGridSelector(apiRef, editingTypeSelector(id)); where apiRef is the Grid API and id is the row id from props.
   See also: https://github.com/mui/mui-x/issues/9489#issuecomment-1610299768
*/
const editingTypeSelector = (rowId) => (state: GridState) =>
  state.editRows[rowId]?.type.value;

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

  useGridSelector(apiRef, editingTypeSelector(id));
  const currentEditType = apiRef.current.getRowWithUpdatedValues(id).type;

  const isDisabled = !(
    currentEditType === "string" || currentEditType === "number"
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
  const { id } = props;
  const [isHover, setIsHover] = React.useState(false);
  const apiRef = useGridApiContext();

  useGridSelector(apiRef, editingTypeSelector(id));
  const currentEditType = apiRef.current.getRowWithUpdatedValues(id).type;

  const isDisabled = currentEditType !== "enum";
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

  useGridSelector(apiRef, editingTypeSelector(id));
  const currentEditType = apiRef.current.getRowWithUpdatedValues(id).type;

  const isDisabled = currentEditType !== "number";
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
