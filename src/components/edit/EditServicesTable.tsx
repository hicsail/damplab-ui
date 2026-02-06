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
import { Button, Dialog, DialogContent, Alert, Snackbar } from '@mui/material';
import { EditParametersTable } from './parameters/EditParametersTable';
import { DeliverablesEditor } from './DeliverablesEditor';

type ServiceRow = GridRowModel & {
  error?: string;
};


export const EditServicesTable: React.FC = () => {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const gridRef = useGridApiRef();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  const [serviceDialogOpen, setServiceDialogOpen] = useState<boolean>(false);
  const [deliverablesDialogOpen, setDeliverablesDialogOpen] = useState<boolean>(false);
  const [deliverablesEditProps, setDeliverablesEditProps] = useState<GridRenderCellParams | GridRenderEditCellParams | null>(null);

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
    setRows(rows.filter((row: ServiceRow) => row.id != id));
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleUpdate = async (newRow: GridRowModel) => {
    console.log(newRow);
    // The services need to be a list of IDs
    const changes = {
      name: newRow.name,
      price: newRow.price == null ? null : Number(newRow.price),
      pricingMode: newRow.pricingMode ?? 'SERVICE',
      description: newRow.description,
      allowedConnections: newRow.allowedConnections.map((service: any) => service.id),
      parameters: newRow.parameters,
      deliverables: newRow.deliverables || []
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
    const newService = {
      name: newRow.name || '',
      icon: '',
      price: newRow.price == null ? null : Number(newRow.price),
      pricingMode: newRow.pricingMode ?? 'SERVICE',
      parameters: newRow.parameters || [],
      paramGroups: [],
      allowedConnections: newRow.allowedConnections ? newRow.allowedConnections.map((service: any) => service.id) : [],
      description: newRow.description || '',
      deliverables: newRow.deliverables || []
    };

    const result = await client.mutate({
      mutation: CREATE_SERVICE,
      variables: {
        service: newService
      }
    });

    // GridToolBar.tsx creates a temporary row id, but since the backend issues a different id, 
    // This code, setRows, replaces the temp id with the real id.
    setRows(prevRows => 
      prevRows.map(row =>
        row.id === newRow.id ? { ...result.data.createService, isNew: false } : row
    ));

    return { ...result.data.createService, isNew: false };
  }

  const processRowUpdate = async (newRow: ServiceRow) => {
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
      width: 200,
      editable: true,
      type: 'number',
      preProcessEditCellProps: (params) => {
        const raw = params.props.value;
        // Allow empty / untouched values
        if (raw === undefined || raw === null || raw === '') {
          setErrorMessage(null); // clear the previous warnings
          return { ...params.props, error: false };
        }

        const value = Number(params.props.value);
        const hasError = isNaN(value) || value < 0;

        if (hasError && value < 0) {
          setErrorMessage("Warning! Price is negative.");
        } else if (!hasError) {
          setErrorMessage(null);
        }
        return { ...params.props, error: hasError };
      }
    },
    {
      field: 'pricingMode',
      headerName: 'Pricing Mode',
      width: 220,
      editable: true,
      type: 'singleSelect',
      valueGetter: (_value, row) => row.pricingMode ?? 'SERVICE',
      valueOptions: [
        { value: 'SERVICE', label: 'Service price' },
        { value: 'PARAMETER', label: 'Parameter-based' }
      ],
      valueFormatter: (value) => {
        if (value === 'PARAMETER') return 'Parameter-based';
        return 'Service price';
      }
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
    {
      field: 'deliverables',
      headerName: 'Deliverables',
      width: 200,
      editable: true,
      renderCell: (params) => (
        <Button 
          variant="outlined" 
          onClick={() => {
            setDeliverablesEditProps(params);
            setDeliverablesDialogOpen(true);
          }}
        >
          {params.row.deliverables?.length || 0} item{(params.row.deliverables?.length || 0) !== 1 ? 's' : ''}
        </Button>
      ),
      renderEditCell: (params) => (
        <Button 
          variant="contained" 
          onClick={() => {
            setDeliverablesEditProps(params);
            setDeliverablesDialogOpen(true);
          }}
        >
          Edit ({params.row.deliverables?.length || 0})
        </Button>
      )
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
        onProcessRowUpdateError={(error) => {
          console.error("Row update error:", error);
          if (error instanceof Error) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage("An unexpected error occurred.");
          }
        }}
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
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} fullWidth PaperProps={{ sx: { maxWidth: '100%' }}}>
        <DialogContent>
          <EditParametersTable viewParams={paramsViewProps} editParams={paramsEditProps} gridRef={gridRef} />
        </DialogContent>
      </Dialog>
      <Dialog 
        open={deliverablesDialogOpen} 
        onClose={() => {
          setDeliverablesDialogOpen(false);
          setDeliverablesEditProps(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogContent>
          {deliverablesEditProps && (
            <DeliverablesEditor
              deliverables={deliverablesEditProps.row.deliverables || []}
              onSave={(updatedDeliverables) => {
                // Update the row in the grid
                const updatedRow = {
                  ...deliverablesEditProps.row,
                  deliverables: updatedDeliverables
                };
                gridRef.current.updateRows([updatedRow]);
                setDeliverablesDialogOpen(false);
                setDeliverablesEditProps(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
