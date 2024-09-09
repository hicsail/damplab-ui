import { Add } from '@mui/icons-material';
import { Button } from '@mui/material';
import { GridRowModes, GridRowModesModel, GridRowsProp, GridToolbarContainer } from '@mui/x-data-grid';
import { v4 as uuid } from 'uuid';

export interface GridToolBarProps {
  setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
  setRowModesModel: (
    newModel: (oldModel: GridRowModesModel) => GridRowModesModel
  ) => void;
}

export const GridToolBar: React.FC<GridToolBarProps> = (props) => {
  const handleNewRecord = () => {
    // Needed by the grid view, later will be replaced with real UUID
    const id = uuid();

    // Make an empty place for the rows
    props.setRows((oldRows) => [...oldRows, { id }]);

    // Make the new row editable
    props.setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit },
    }));

  };

  return (
    <GridToolbarContainer>
      <Button color='primary' startIcon={<Add />} onClick={handleNewRecord}>Add Record</Button>
    </GridToolbarContainer>
  );
};
