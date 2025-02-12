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
  DialogContentText,
  Snackbar
} from '@mui/material';
import { EditParameterOptions } from './EditParameterOptions';
import {
  ParameterDefaultValueInput,
  ParameterNameInput,
  ParameterOptionsButton,
  ParameterRangeValueInput,
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

  const handleCloseSnackbar = () => setSnackbar(null);

  const columns: GridColDef[] = [
    {
      field: 'id',
      width: 200,
      editable: isEdit
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
      editable: isEdit
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
      type: 'singleSelect',
      valueOptions: ['input'], //['input', 'result', 'flow'], //Only input for now...
    },
    {
      field: 'required',
      width: 200,
      editable: isEdit,
      type: 'singleSelect',
      valueOptions: [true, false],
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
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterDefaultValueInput {...params} />),
    },
    {
      field: 'rangeValueMin',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterRangeValueInput {...params} />),
    },
    {
      field: 'rangeValueMax',
      width: 200,
      editable: isEdit,
      renderEditCell: (params: GridRenderEditCellParams) => (<ParameterRangeValueInput {...params} />),
    },
    {
      field: 'dynamicAdd',
      width: 200,
      editable: isEdit,
      type: 'singleSelect',
      valueOptions: [true, false],
    },
    {
      field: 'templateFile',
      width: 200,
      editable: isEdit
    },
    {
      field: 'tableData',
      width: 200,
      editable: isEdit
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
      <Dialog open={typeChangeDialog.open} onClose={typeChangeDialog.onCancel}>
        <DialogContent>
          <DialogContentText>
            You are changing the parameter type from <strong>{typeChangeDialog.oldType}</strong> to <strong>{typeChangeDialog.newType}</strong>.
            The following fields are not applicable for the new type and will be reset:
            {/* FIXME: ul cannot appear as a descendant of p */}
            <ul>{typeChangeDialog.fieldsToReset?.map((f) => <li key={f}>{f}</li>)}</ul>
          </DialogContentText>
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
