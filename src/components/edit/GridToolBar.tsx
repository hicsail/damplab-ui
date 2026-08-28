import { Add } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { GridRowModes, GridRowModesModel, GridRowsProp, GridToolbarColumnsButton, GridToolbarContainer } from '@mui/x-data-grid';
import { v4 as uuid } from 'uuid';
import { EditRowModeHint } from './EditRowModeHint';

export interface GridToolBarProps {
  /**
   * Whether the caller may add rows. **Required, with no default**: this toolbar is
   * shared by tables gated on different permissions (`catalog-editor:write`,
   * `inventory:write`), so it takes the answer as a prop rather than calling `can()`
   * itself — and a default of `true` would let a table that was never wired up keep
   * its Add button silently. Making it required means TypeScript names every
   * unwired call site.
   */
  canWrite: boolean;
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
      {/* Add is gated on `canWrite`; the column picker is not. Choosing which
          columns to look at is a view control, and a read-only viewer wants it as
          much as an editor does — so the row renders either way, and only the
          button inside it is conditional. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        {props.canWrite && (
          <Button color="primary" startIcon={<Add />} onClick={handleNewRecord}>
            {props.addButtonLabel ?? 'Add new item'}
          </Button>
        )}
        <GridToolbarColumnsButton />
      </Box>
      {props.canWrite && props.showEditModeHint !== false ? <EditRowModeHint /> : null}
    </GridToolbarContainer>
  );
};
