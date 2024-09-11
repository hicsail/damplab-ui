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
  GridRowEditStopReasons
} from '@mui/x-data-grid';
import { Parameter } from '../../../types/Parameter';
import { Box } from '@mui/material';
import { getActionsColumn } from '../ActionColumn';
import { MutableRefObject, useState } from 'react';
import { GridApiCommunity } from '@mui/x-data-grid/internals';

interface EditParametersTableProps {
  viewParams: GridRenderCellParams | null;
  editParams: GridRenderEditCellParams | null;
  gridRef: MutableRefObject<GridApiCommunity>;
}

export const EditParametersTable: React.FC<EditParametersTableProps> = (props) => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const value = props.viewParams ? props.viewParams.value : props.editParams!.value;
  const isEdit = !!props.editParams;

  const columns: GridColDef[] = [
    {
      field: 'id',
      width: 500,
      editable: isEdit
    },
    {
      field: 'name',
      width: 500,
      editable: isEdit
    },
    {
      field: 'type',
      width: 500,
      editable: isEdit
    },
    {
      field: 'flowId',
      width: 500,
      editable: isEdit
    },
    {
      field: 'paramType',
      width: 500,
      editable: isEdit
    }
  ];

  const handleDeletion = async (id: GridRowId) => {

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
    const filtered = value.filter((parameter: any) => parameter.id != newRow.id);
    console.log(filtered);
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
    <Box width={'100%'}>
    <DataGrid
      rows={value || []}
      columns={columns}
      sx={{ width: '100%' }}
      processRowUpdate={handleUpdate}
      editMode="row"
      rowModesModel={rowModesModel}
      onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
      onRowEditStop={handleRowEditStop}
    />
    </Box>
  );
};
