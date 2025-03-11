import * as React from "react";
import { v4 as uuid } from "uuid";
import { Box, Button, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  DataGrid,
  GridColDef,
  GridColumnHeaderParams,
  GridRowsProp,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridRowModes,
  GridRowModesModel,
  GridValidRowModel,
} from "@mui/x-data-grid";
import { getActionsColumn } from "../ActionColumn";

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
  const [columns, setColumns] = React.useState<GridColDef[]>(
    tableData?.columns || [],
  );
  const [rows, setRows] = React.useState<GridRowsProp>(tableData?.rows || []);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );

  const [newColumnField, setNewColumnField] = React.useState<string>("");
  const [newColumnFieldErrorMsg, setNewColumnFieldErrorMsg] =
    React.useState<string>("");
  const [newColumnHeaderName, setNewColumnHeaderName] =
    React.useState<string>("");

  // the actions column and the 'editable' field on each column are used by the grid internally,
  // but shouldn't be saved to DB. Add them here
  let renderColumns: GridColDef[];
  if (!isEditMode) {
    renderColumns = columns;
  } else {
    renderColumns = columns.map((c) => ({
      ...c,
      editable: isEditMode,
      renderHeader: (params: GridColumnHeaderParams) => (
        <>
          {params.colDef.headerName || params.colDef.field}
          <DeleteIcon
            onClick={() => {
              updateColumns(
                columns.filter((col) => col.field !== params.colDef.field),
              );
            }}
          />
        </>
      ),
    }));
    renderColumns.push(
      getActionsColumn({
        rowModesModel: rowModesModel,
        handleDelete: (id) => updateRows(rows.filter((row) => row.id !== id)),
        handleEdit: (id) =>
          setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.Edit },
          }),
        handleCancel: (id) =>
          setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
          }),
        handleSave: (id) =>
          setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View },
          }),
      }),
    );
  }

  function updateColumns(newColumns: GridColDef[]) {
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
        },
      ]);
      setNewColumnField("");
      setNewColumnHeaderName("");
    }
  }
  function addNewRow() {
    const newId = uuid();
    updateRows([...rows, { id: newId }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [newId]: { mode: GridRowModes.Edit },
    }));
  }

  function handleRowUpdate(updatedRow: GridValidRowModel) {
    updateRows(
      rows.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
    );
    return updatedRow;
  }

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
        columns={renderColumns}
        editMode="row"
        rowModesModel={rowModesModel}
        processRowUpdate={handleRowUpdate}
        onProcessRowUpdateError={(e) => console.log(e)}
        disableColumnMenu
        disableColumnSorting
      />
    </>
  );
}
