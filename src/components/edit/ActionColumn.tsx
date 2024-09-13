import { GridColDef, GridActionsCellItem, GridRowModesModel, GridRowModes, GridRowId } from '@mui/x-data-grid';
import { Save, Cancel, Edit, Delete } from '@mui/icons-material';

export interface GetActionsColumnProps {
  rowModesModel: GridRowModesModel;
  handleSave: (id: GridRowId) => void;
  handleCancel: (id: GridRowId) => void;
  handleEdit: (id: GridRowId) => void;
  handleDelete: (id: GridRowId) => void;
}

export const getActionsColumn: (params: GetActionsColumnProps) => GridColDef = (params) => {
  return {
    field: 'actions',
    type: 'actions',
    headerName: 'Actions',
    width: 100,
    cellClassName: 'actions',
    getActions: ({ id }) => {
      const isInEditMode = params.rowModesModel[id]?.mode === GridRowModes.Edit;

      if (isInEditMode) {
        return [
          <GridActionsCellItem
            icon={<Save />}
            label="Save"
            sx={{
              color: 'primary.main',
            }}
            onClick={() => params.handleSave(id)}
          />,
          <GridActionsCellItem
            icon={<Cancel />}
            label="Cancel"
            className="textPrimary"
            onClick={() => params.handleCancel(id)}
            color="inherit"
          />,
        ];
      }
      return [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          className="textPrimary"
          onClick={() => params.handleEdit(id)}
          color="inherit"
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => params.handleDelete(id)}
          color="inherit"
        />,
      ];
    }
  }
}
