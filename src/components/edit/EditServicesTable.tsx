import { useApolloClient } from '@apollo/client';
import { CREATE_CATEGORY, CREATE_SERVICE, DELETE_SERVICE, UPDATE_SERVICE } from '../../gql/queries';
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
import { Button, Dialog, DialogContent, Tooltip } from '@mui/material';
import { EditParametersTable } from './parameters/EditParametersTable';

type ServiceRow = GridRowModel & {
  error?: string;
};


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
      mutation: DELETE_SERVICE,
      variables: {
        service: id
      }
    });
    setRows(rows.filter((row: any) => row.id != id));
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleUpdate = async (newRow: GridRowModel) => {
    console.log(newRow);
    // The services need to be a list of IDs
    const changes = {
      name: newRow.name,
      price: Number(newRow.price) || null,
      description: newRow.description,
      allowedConnections: newRow.allowedConnections.map((service: any) => service.id),
      parameters: newRow.parameters
    };

    if (changes.price !== null && changes.price < 0) {
      throw new Error("Price must be non-negative");
    }


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
    const newService = {
      name: newRow.name || '',
      icon: '',
      price: Number(newRow.price) || null,
      parameters: newRow.parameters || [],
      paramGroups: [],
      allowedConnections: newRow.allowedConnections ? newRow.allowedConnections.map((service: any) => service.id) : [],
      description: newRow.description || ''
    };

    if (newService.price !== null && newService.price < 0) {
      throw new Error("Warning! Price is negative");
}


    const row = await client.mutate({
      mutation: CREATE_SERVICE,
      variables: {
        service: newService
      }
    });

    // TODO: Should refetch data


    return { ...row.data.createService, isNew: false };
  }

  const processRowUpdate = async (newRow: ServiceRow) => {
    const price = Number(newRow.price);
    if (!isNaN(price) && price < 0) {
      return { ...newRow, error: "Warning! Price is negative."};
    }
      
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
      field: 'price',
      headerName: 'Price',
      editable: true,
      renderCell: (params) => {
        const hasError = !!params.row.error;
        return (
          <Tooltip title={hasError ? params.row.error :''} arrow>
            <span
              style={{
                border: hasError ? '1px solid red' :undefined,
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: hasError ? '#ffe6e6' :undefined,
                display: 'inline-block',
                width: '100%',
              }}
            >
              ${params.value}
            </span>
          </Tooltip>
        );
      },
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
