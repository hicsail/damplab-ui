import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowModesModel,
  GridRowModes,
  GridRenderEditCellParams,
  GridRowModel,
  GridEventListener,
  GridRowEditStopReasons,
  GridSlots,
  useGridApiRef
} from '@mui/x-data-grid';
import { getActionsColumn } from '../ActionColumn';
import { MutableRefObject, useState } from 'react';
import { GridApiCommunity } from '@mui/x-data-grid/internals';
import { GridToolBar } from '../GridToolBar';
import {
  Alert,
  AlertProps,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Snackbar
} from '@mui/material';
import { EditParameterOptions } from './EditParameterOptions';
import { EditParameterTableData } from './EditParameterTableData';
import {
  ParameterBooleanSelect,
  ParameterDefaultValueInput,
  ParameterDescriptionInput,
  ParameterIdInput,
  ParameterNameInput,
  ParameterOptionsButton,
  ParameterParamTypeSelect,
  ParameterRangeValueInput,
  ParameterTableDataButton,
  ParameterTypeSelect
} from './ParameterFieldEditCells';
import {validateParameter} from './ParameterValidation';

interface EditParametersTableProps {
  viewParams: GridRenderCellParams | null;
  editParams: GridRenderEditCellParams | null;
  gridRef: MutableRefObject<GridApiCommunity>;
}

export const EditParametersTable: React.FC<EditParametersTableProps> = (props) => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const isEdit = !!props.editParams;
  const [rows, setRows] = useState<any[]>(props.viewParams ? props.viewParams.value : props.editParams!.value);
  const [optionDialogOpen, setOptionDialogOpen] = useState<boolean>(false);
  const [optionViewProps, setOptionViewProps] = useState<GridRenderCellParams | null>(null);
  const [optionEditProps, setOptionEditProps] = useState<GridRenderEditCellParams | null>(null);
  const [tableDataDialogOpen, setTableDataDialogOpen] = useState<boolean>(false);
  const [tableDataParams, setTableDataParams] = useState<GridRenderCellParams | GridRenderEditCellParams | null>(null);
  const [snackbar, setSnackbar] = useState<Pick<AlertProps, 'children' | 'severity'> | null>(null);
  const [typeChangeDialog, setTypeChangeDialog] = useState({
    open: false,
    oldType: undefined,
    newType: undefined,
    fieldsToReset: undefined,
    onConfirm: undefined,
    onCancel: undefined
  });
  const gridRef = useGridApiRef();

  const handleOptionsViewButton = (options: GridRenderCellParams) => {
    setOptionViewProps(options);
    setOptionEditProps(null);
    setOptionDialogOpen(true);
  };

  const handleOptionsEditButton = (options: GridRenderEditCellParams) => {
    setOptionViewProps(null);
    setOptionEditProps(options);
    setOptionDialogOpen(true);
  };

  const handleTableDataButton = (params: GridRenderCellParams | GridRenderEditCellParams) => {
    setTableDataParams(params);
    setTableDataDialogOpen(true);
  }

  const handleCloseSnackbar = () => setSnackbar(null);

  const columns: GridColDef[] = [
    {
      field: 'id',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterIdInput {...params} />),
    },
    {
      field: 'name',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterNameInput {...params} />),
    },
    {
      field: 'description',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterDescriptionInput {...params} />),
    },
    {
      field: 'type',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterTypeSelect {...params} setTypeChangeDialog={setTypeChangeDialog} />)
    },
    {
      field: 'paramType',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterParamTypeSelect {...params} />),
    },
    {
      field: 'required',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterBooleanSelect {...params} />),
    },
    {
      field: 'options',
      width: 200,
      editable: isEdit,
      renderCell: (params) => <Button variant="contained" onClick={() => handleOptionsViewButton(params)}>View</Button>,
      renderEditCell: (params : GridRenderEditCellParams) => <ParameterOptionsButton {...params} handleOptionsEditButton={handleOptionsEditButton} />,
    },
    {
      field: 'defaultValue',
      width: 200,
      editable: isEdit,
      valueParser: (value, row, column, apiRef) => {
        // This valueParser makes sure that when the param type is 'number', the input values get serialized as
        // numbers, not strings.

        // In Firefox, if a user types non-numerical characters into an <input> of type 'number', those characters are
        // displayed in the <input>, but the input value gets set to the empty string. Other browsers do not allow the
        // entry of non-numerical characters inside a number input. (see https://bugzil.la/1398528)
        // This makes it impossible to distinguish - either here or during validation on save - between an intentionally
        // empty value (if a user enters a number and then backspaces, the input value ends up being "", not undefined)
        // and a string value (whatever string the Firefox user sees on screen, the value that valueParser gets will
        // be ""). Also, if the string goes from "a" -> "ab", the input element sees "" -> "", so the valueParser does
        // not even run.
        // The upshot is that a Firefox user might enter a string into a number input, hit save, and see the string
        // "disappear" without any error message/feedback. There are ways around this, but I don't think it is worth
        // giving up the benefits of using the native <input type='number'>, which works fine in other browsers.

        const currentEditType = apiRef.current.getRowWithUpdatedValues(row.id).type;
        if (currentEditType === "number") {
          // Don't let undefined/empty string be cast to 0; 0 is not the same as no value.
          // Cast "" to undefined too, so that handleValueChange in ParameterTypeSelect knows to not warn the user about
          // resetting an empty value without needing to check against both undefined and empty string.
          // (It cannot just check for truthiness, because the number 0 is a meaningful value.)
          return (value === undefined || value === "") ? undefined /* not value */: Number(value);
        } else {
          return (value === "") ? undefined : value;
        }
      },
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterDefaultValueInput {...params} />),
    },
    {
      field: 'rangeValueMin',
      width: 200,
      editable: isEdit,
      // comments on valueParser for 'defaultValue' field apply here
      valueParser: (value) => {return (value === undefined || value === "") ? undefined : Number(value);},
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterRangeValueInput {...params} />),
    },
    {
      field: 'rangeValueMax',
      width: 200,
      editable: isEdit,
      // comments on valueParser for 'defaultValue' field apply here
      valueParser: (value) => {return (value === undefined || value === "") ? undefined : Number(value);},
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterRangeValueInput {...params} />),
    },
    /*
    {
      field: 'dynamicAdd',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterBooleanSelect {...params} />),
    },
    {
      field: 'templateFile',
      width: 200,
      editable: isEdit
    },
    */
    {
      field: 'tableData',
      width: 200,
      editable: isEdit,
      renderCell: (params: GridRenderCellParams) => <Button variant="contained" onClick={() => handleTableDataButton(params)}>View</Button>,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterTableDataButton {...params} handleTableDataButton={handleTableDataButton} />),
    }
  ];

  const handleDeletion = async (id: GridRowId) => {
    // Filter out the grid
    const filtered = rows.filter((parameter: any) => parameter.id != id);

    // Update the edit state
    props.gridRef.current.setEditCellValue({ id: props.editParams!.id, field: props.editParams!.field, value: filtered });

    // Update the view
    setRows(filtered);
  };

  const handleSave = async(id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleUpdate = (newRow: GridRowModel) => {
    // Validate new row
    const paramValidationErrors = validateParameter(newRow);
    if (paramValidationErrors.length > 0) {
      const combinedMsg = <ul>{paramValidationErrors.map((err) => <li key={err.field}>{err.field}: {err.errorMsg}</li>)}</ul>

      setSnackbar({ children: combinedMsg, severity: 'error' });
      return; //don't return newRow, don't save
    }

    // Remove the old row
    const filtered = rows.filter((parameter: any) => parameter.id != newRow.id);

    // The new value
    props.gridRef.current.setEditCellValue({ id: props.editParams!.id, field: props.editParams!.field, value: [...filtered, newRow] });

    return newRow;
  };

  if (isEdit) {
    columns.push(
      getActionsColumn({
        handleDelete: (id) => handleDeletion(id),
        handleEdit: (id) => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
        handleCancel: (id) => setRowModesModel({
          ...rowModesModel,
          [id]: { mode: GridRowModes.View, ignoreModifications: true }
        }),
        handleSave: (id) => handleSave(id),
        rowModesModel
      })
    );
  }

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        sx={{ width: '100%' }}
        processRowUpdate={handleUpdate}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
        onRowEditStop={handleRowEditStop}
        slots={{
          toolbar: GridToolBar as GridSlots['toolbar']
        }}
        slotProps={{
          toolbar: { setRowModesModel, setRows }
        }}
        apiRef={gridRef}
      />
      <Dialog open={optionDialogOpen} onClose={() => setOptionDialogOpen(false)} fullWidth PaperProps={{ sx: { maxWidth: '100%' }}}>
        <DialogContent>
          <EditParameterOptions viewParams={optionViewProps} editParams={optionEditProps} gridRef={gridRef} />
        </DialogContent>
      </Dialog>
      <Dialog open={tableDataDialogOpen} onClose={() => setTableDataDialogOpen(false)}>
        <DialogContent>
          <EditParameterTableData tableDataParams={tableDataParams} parametersApiRef={gridRef} />
        </DialogContent>
      </Dialog>
      <Dialog open={typeChangeDialog.open} onClose={typeChangeDialog.onCancel}>
        <DialogContent>
            You are changing the parameter type from <strong>{typeChangeDialog.oldType}</strong> to <strong>{typeChangeDialog.newType}</strong>.
            The following fields are not applicable for the new type and will be reset:
            <ul>{typeChangeDialog.fieldsToReset?.map((f) => <li key={f}>{f}</li>)}</ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={typeChangeDialog.onCancel}>Cancel</Button>
          <Button onClick={typeChangeDialog.onConfirm}>Continue</Button>
        </DialogActions>
      </Dialog>
      {!!snackbar && (
          <Snackbar
              open
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              onClose={handleCloseSnackbar}
          >
            <Alert {...snackbar} onClose={handleCloseSnackbar} />
          </Snackbar>
      )}
    </>
  );
};
