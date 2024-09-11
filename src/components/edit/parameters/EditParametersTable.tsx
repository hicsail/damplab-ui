import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowModesModel,
  GridRowModes,
  GridRenderEditCellParams
} from '@mui/x-data-grid';
import { Parameter } from '../../../types/Parameter';
import { Box } from '@mui/material';
import { getActionsColumn } from '../ActionColumn';
import { useState } from 'react';

interface EditParametersTableProps {
  viewParams: GridRenderCellParams | null;
  editParams: GridRenderEditCellParams | null;
}

export const EditParametersTable: React.FC<EditParametersTableProps> = (props) => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const value = props.viewParams ? props.viewParams.value : props.editParams!.value;
  const isEdit = !!props.editParams;

  const handleDeletion = async (id: GridRowId) => {

  };

  const handleSave = async(id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };


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
    />
    </Box>
  );
};
