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
import { Box, Button, Dialog, DialogContent, Alert, Snackbar, Stack } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { GridToolBar } from './GridToolBar';
import { EditParametersTable } from './parameters/EditParametersTable';
import { DeliverablesEditor } from './DeliverablesEditor';
import { processCSVFile, processExcelFile, validateFileType } from '../data-translation/utils';

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);


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
      protocolsIoId: newRow.protocolsIoId || null,
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
      protocolsIoId: newRow.protocolsIoId || null,
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

  const handleDownloadPricingSheet = () => {
    try {
      const headers = ['id', 'name', 'price'];
      const dataLines = rows.map((row) => {
        const id = row.id ?? '';
        const name = row.name ?? '';
        const price = row.price ?? '';
        return [id, name, price].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = [headers.join(','), ...dataLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'services-pricing.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating pricing CSV:', error);
      setErrorMessage('Failed to generate pricing spreadsheet.');
    }
  };

  const handleUploadPricingSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset input so the same file can be selected again if needed
    event.target.value = '';

    if (!validateFileType(file.name)) {
      setErrorMessage('Please upload a .csv, .xlsx or .xls file.');
      return;
    }

    try {
      let data: any[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = await processCSVFile(file);
      } else {
        data = await processExcelFile(file);
      }

      if (!data || data.length < 2) {
        setErrorMessage('Spreadsheet appears to be empty or missing data rows.');
        return;
      }

      const [headerRow, ...dataRows] = data;
      const normalizedHeaders = headerRow.map((h) => String(h || '').trim().toLowerCase());

      const idIndex = normalizedHeaders.findIndex((h) => h === 'id' || h === 'service id');
      const nameIndex = normalizedHeaders.findIndex((h) => h === 'name' || h === 'service name');
      const priceIndex = normalizedHeaders.findIndex((h) => h === 'price' || h === 'service price');

      if (idIndex === -1 || nameIndex === -1 || priceIndex === -1) {
        setErrorMessage('Spreadsheet must have columns for id, name, and price.');
        return;
      }

      let updateCount = 0;
      let createCount = 0;

      for (const row of dataRows) {
        const rawId = row[idIndex];
        const rawName = row[nameIndex];
        const rawPrice = row[priceIndex];

        const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
        const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
        const priceStr = rawPrice !== undefined && rawPrice !== null ? String(rawPrice).trim() : '';

        if (!id && !name && !priceStr) {
          continue;
        }

        const price =
          priceStr === ''
            ? null
            : Number(priceStr.replace(/[^0-9.\-]/g, ''));

        if (price !== null && (isNaN(price) || price < 0)) {
          console.warn('Skipping row with invalid price:', row);
          continue;
        }

        if (id) {
          const existingRow = rows.find((r) => String(r.id) === id);

          if (existingRow) {
            const changes: any = {};
            if (name && name !== existingRow.name) {
              changes.name = name;
            }
            if (priceStr !== '') {
              changes.price = price;
            }

            if (Object.keys(changes).length === 0) {
              continue;
            }

            await client.mutate({
              mutation: UPDATE_SERVICE,
              variables: {
                service: id,
                changes
              }
            });
            updateCount += 1;
            continue;
          }
        }

        if (!name) {
          console.warn('Skipping row without name for new service:', row);
          continue;
        }

        const newService = {
          name,
          icon: '',
          price,
          pricingMode: 'SERVICE',
          parameters: [],
          paramGroups: [],
          allowedConnections: [],
          description: '',
          deliverables: []
        };

        await client.mutate({
          mutation: CREATE_SERVICE,
          variables: {
            service: newService
          }
        });
        createCount += 1;
      }

      await client.resetStore();

      setErrorMessage(
        `Pricing upload complete: updated ${updateCount} service(s), created ${createCount} new service(s).`
      );
    } catch (error) {
      console.error('Error processing pricing spreadsheet:', error);
      setErrorMessage('Failed to process pricing spreadsheet.');
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
      field: 'protocolsIoId',
      headerName: 'Protocols.io ID',
      width: 180,
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
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPricingSheet}
          >
            Download pricing sheet
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload pricing sheet
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleUploadPricingSheet}
          />
        </Box>
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
      </Stack>
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
