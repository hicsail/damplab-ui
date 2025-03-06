import * as React from "react";
import { v4 as uuid } from "uuid";
import { Box, Button, TextField } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridValidRowModel,
} from "@mui/x-data-grid";

export function EditParameterTableData(props) {
  const gridCellParams: GridRenderEditCellParams | GridRenderCellParams =
    props.tableDataParams;
  const isEditMode: boolean = gridCellParams.cellMode === "edit";

  // In Edit mode, must read the editing value, not the value in props.
  const tableData = props.parametersApiRef.current.getRowWithUpdatedValues(
    gridCellParams.id,
    gridCellParams.field,
  ).tableData;
  // Rows and columns are "controlled" from the Grid API rather than with state; on the other hand, calling
  // setEditCellValue does not re-render this component, because this component is "outside" the parameter grid.
  // So, use state and Grid API in tandem. Similar to the pattern here
  // https://mui.com/x/react-data-grid/editing/#with-debounce, but unidirectional (no need for debounce-and-sync).
  // TODO: Can we make it so 'editable' column field is not saved to DB and only used internally?
  // TODO: The 'editable' field is not saved to the db, so add it internally on render.
  const [columns, setColumns] = React.useState<GridColDef[]>(
    tableData?.columns.map((c) => ({ ...c, editable: isEditMode })) || [],
  );
  const [rows, setRows] = React.useState<GridRowsProp>(tableData?.rows || []);

  const [newColumnField, setNewColumnField] = React.useState<string>("");
  const [newColumnFieldErrorMsg, setNewColumnFieldErrorMsg] =
    React.useState<string>("");
  const [newColumnHeaderName, setNewColumnHeaderName] =
    React.useState<string>("");

  function updateColumns(newColumns: GridColDef[]) {
    //columns.forEach(column => delete column.editable); //TODO
    props.parametersApiRef.current.setEditCellValue({
      id: gridCellParams.id,
      field: gridCellParams.field,
      value: { columns: newColumns, rows: rows },
    });
    setColumns(newColumns);
  }
  function updateRows(newRows: GridRowsProp) {
    props.parametersApiRef.current.setEditCellValue({
      id: gridCellParams.id,
      field: gridCellParams.field,
      value: { columns: columns, rows: newRows },
    });
    setRows(newRows);
  }

  function addNewColumn() {
    const fieldAlreadyInUse = (col) => col.field === newColumnField;
    if (columns.some(fieldAlreadyInUse)) {
      setNewColumnFieldErrorMsg(
        `Column field '${newColumnField}' is already in use.`,
      );
    } else if (!newColumnField) {
      setNewColumnFieldErrorMsg(`Column field is required.`);
    } else {
      setNewColumnFieldErrorMsg("");
      updateColumns([
        ...columns,
        {
          field: newColumnField,
          headerName: newColumnHeaderName ? newColumnHeaderName : undefined,
          // "headerName" in Mui Data Grid is "header" in the canvas/ParamTableDisplay code
          header: newColumnHeaderName ? newColumnHeaderName : undefined,
          editable: isEditMode,
        },
      ]);
      setNewColumnField("");
      setNewColumnHeaderName("");
    }
  }
  function addNewRow() {
    updateRows([...rows, { id: uuid() }]);
  }

  function handleRowUpdate(updatedRow: GridValidRowModel) {
    const indexToUpdate = rows.findIndex((row) => row.id === updatedRow.id);
    updateRows(
      rows.map((row, index) => (index === indexToUpdate ? updatedRow : row)),
    );
    return updatedRow;
  }

  // TODO: At each stage, re-test whole flow & edit from Canvas & make sure it saves into workflowNode formdata
  // todo: DELETE columns and rows.....
  // TODO: UI layout
  return (
    <>
      <Box component="form" hidden={!isEditMode}>
        <TextField
          label="Field id"
          variant="outlined"
          required
          value={newColumnField}
          onChange={(event) => setNewColumnField(event.target.value)}
          error={!!newColumnFieldErrorMsg}
          helperText={newColumnFieldErrorMsg}
        />
        <TextField
          label="Display name"
          variant="outlined"
          value={newColumnHeaderName}
          onChange={(event) => setNewColumnHeaderName(event.target.value)}
        />
        <Button variant="contained" onClick={addNewColumn}>
          Add new column
        </Button>
        <Button variant="contained" onClick={addNewRow}>
          Add new ROW
        </Button>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        processRowUpdate={handleRowUpdate}
        onProcessRowUpdateError={(e) => console.log(e)}
      />
    </>
  );
}
