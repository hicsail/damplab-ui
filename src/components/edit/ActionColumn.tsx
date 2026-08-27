import { GridColDef, GridActionsCellItem, GridRowModesModel, GridRowModes, GridRowId } from '@mui/x-data-grid';
import { Save, Cancel, Edit, Delete } from '@mui/icons-material';

export interface GetActionsColumnProps {
  /**
   * Whether the caller may edit or delete rows. **Required, with no default** — see
   * `GridToolBarProps.canWrite`. When false the column renders no actions at all,
   * so a read-tier user sees the table without a dead Actions column full of
   * controls that 403.
   */
  canWrite: boolean;
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
      if (!params.canWrite) {
        return [];
      }

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
