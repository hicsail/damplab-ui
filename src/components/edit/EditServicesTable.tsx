import { useApolloClient, useQuery } from '@apollo/client';
import { CREATE_CATEGORY, DELETE_CATEGORY, UPDATE_SERVICE } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowModel,
  GridSlots,
  GridRenderCellParams,
  GridRenderEditCellParams,
  useGridApiRef
} from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { GridToolBar } from './GridToolBar';
import { Button, Dialog, DialogContent } from '@mui/material';
import { EditParametersTable } from './parameters/EditParametersTable';


export const EditServicesTable: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const gridRef = useGridApiRef();


  const [serviceDialogOpen, setServiceDialogOpen] = useState<boolean>(false);

  // Params when in view mode for the parameters
  const [paramsViewProps, setParamsViewProps] = useState<GridRenderCellParams | null>(null);

  // Params when in edit mode for the parameters
  const [paramsEditProps, setParamsEditProps] = useState<GridRenderEditCellParams | null>(null);


  useEffect(() => {
    setRows(services);
  }, [services]);

  const handleDeletion = async (id: GridRowId) => {
    await client.mutate({
      mutation: DELETE_CATEGORY,
      variables: {
        category: id
      }
    });
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleUpdate = async (newRow: GridRowModel) => {
    console.log(newRow);
    // The services need to be a list of IDs
    const changes = {
      name: newRow.name,
      allowedConnections: newRow.allowedConnections.map((service: any) => service.id),
      parameters: newRow.parameters
    };

    await client.mutate({
      mutation: UPDATE_SERVICE,
      variables: {
        service: newRow.id,
        changes
      }
    });

    return newRow;
  };

  const handleCreate = async (newRow: GridRowModel) => {
    const newCateogry = {
      label: newRow.label || '',
      services: newRow.services ? newRow.services.map((service: any) => service.id) : []
    };

    await client.mutate({
      mutation: CREATE_CATEGORY,
      variables: {
        category: newCateogry
      }
    });

    // refetch();

    return { ...newRow, isNew: false };
  }

  const processRowUpdate = async (newRow: GridRowModel) => {
    if (!newRow.isNew) {
      return handleUpdate(newRow);
    } else {
      return handleCreate(newRow);
    }
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleParamViewButton = (params: GridRenderCellParams) => {
    setParamsViewProps(params);
    setParamsEditProps(null);
    setServiceDialogOpen(true);
  }

  const handleParamEditButton = (params: GridRenderCellParams) => {
    setParamsViewProps(null);
    setParamsEditProps(params);
    setServiceDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      width: 500,
      editable: true
    },
    {
      field: 'description',
      width: 500,
      editable: true
    },
    {
      field: 'allowedConnections',
      headerName: 'Allowed Connections',
      width: 500,
      editable: true,
      renderCell: (params) => <ServiceList services={params.row.allowedConnections} />,
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.allowedConnections} {...params} />
    },
    {
      field: 'parameters',
      width: 200,
      editable: true,
      renderCell: (params) => <Button variant="contained" onClick={() => handleParamViewButton(params)}>View</Button>,
      renderEditCell: (params) => <Button variant="contained" onClick={() => handleParamEditButton(params)}>Edit</Button>
    },
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
  ];

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
        onRowEditStop={handleRowEditStop}
        onProcessRowUpdateError={(error) => console.log(error)}
        editMode="row"
        processRowUpdate={processRowUpdate}
        slots={{
          toolbar: GridToolBar as GridSlots['toolbar']
        }}
        slotProps={{
          toolbar: { setRowModesModel, setRows },
        }}
        apiRef={gridRef}
      />
      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} fullWidth PaperProps={{ sx: { maxWidth: '100%' }}}>
        <DialogContent>
          <EditParametersTable viewParams={paramsViewProps} editParams={paramsEditProps} gridRef={gridRef} />
        </DialogContent>
      </Dialog>
    </>
  );
};
