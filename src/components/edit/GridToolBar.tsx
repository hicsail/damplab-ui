import { Add } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { GridRowModes, GridRowModesModel, GridRowsProp, GridToolbarContainer } from '@mui/x-data-grid';
import { v4 as uuid } from 'uuid';
import { EditRowModeHint } from './EditRowModeHint';

export interface GridToolBarProps {
  setRows?: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
  setRowModesModel: (
    newModel: (oldModel: GridRowModesModel) => GridRowModesModel
  ) => void;
  addButtonLabel?: string;
  onAdd?: () => void;
  /** When false, hide the row-edit hint (e.g. view-only catalog grids). */
  showEditModeHint?: boolean;
}

export const GridToolBar: React.FC<GridToolBarProps> = (props) => {
  const handleNewRecord = () => {
    if (props.onAdd) {
      props.onAdd();
      return;
    }

    if (!props.setRows) {
      return;
    }

    // Needed by the grid view, later will be replaced with real UUID
    const id = uuid();

    // Make an empty place for the rows
    props.setRows((oldRows) => {
      if (oldRows) {
        return [...oldRows, { id, isNew: true }];
      } else {
        return [{ id, isNew: true }];
      }
    });

    // Make the new row editable
    props.setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit },
    }));

  };

  return (
    <GridToolbarContainer
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1.5,
        py: 1,
        px: 0,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Button color="primary" startIcon={<Add />} onClick={handleNewRecord}>
          {props.addButtonLabel ?? 'Add new item'}
        </Button>
      </Box>
      {props.showEditModeHint !== false ? <EditRowModeHint /> : null}
    </GridToolbarContainer>
  );
};
