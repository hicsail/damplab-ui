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
import { Box, Button, Dialog, DialogActions, DialogContent, Alert, Snackbar, Stack, TextField, Typography } from '@mui/material';
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
import { useNavigate } from 'react-router';

type ServiceRow = GridRowModel & {
  error?: string;
};


export const EditServicesTable: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const gridRef = useGridApiRef();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  const [serviceDialogOpen, setServiceDialogOpen] = useState<boolean>(false);
  const [deliverablesDialogOpen, setDeliverablesDialogOpen] = useState<boolean>(false);
  const [deliverablesEditProps, setDeliverablesEditProps] = useState<GridRenderCellParams | GridRenderEditCellParams | null>(null);

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingEditProps, setPricingEditProps] = useState<GridRenderCellParams | GridRenderEditCellParams | null>(null);
  const [pricingForm, setPricingForm] = useState<{
    internal: string;
    externalAcademic: string;
    externalMarket: string;
    externalNoSalary: string;
    legacy: string;
  }>({
    internal: '',
    externalAcademic: '',
    externalMarket: '',
    externalNoSalary: '',
    legacy: ''
  });

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
    const pricingObj = (newRow as any).pricing ?? {};
    const internal = (newRow as any).internalPrice ?? pricingObj.internal ?? null;
    const externalAcademic = (newRow as any).externalAcademicPrice ?? pricingObj.externalAcademic ?? null;
    const externalMarket = (newRow as any).externalMarketPrice ?? pricingObj.externalMarket ?? null;
    const externalNoSalary = (newRow as any).externalNoSalaryPrice ?? pricingObj.externalNoSalary ?? null;
    const external = (newRow as any).externalPrice ?? pricingObj.external ?? externalMarket ?? null;
    const legacy = newRow.price ?? pricingObj.legacy ?? null;
    // The services need to be a list of IDs
    const changes = {
      name: newRow.name,
      price: legacy == null ? null : Number(legacy),
      internalPrice: internal == null ? null : Number(internal),
      externalPrice: external == null ? null : Number(external),
      externalAcademicPrice: externalAcademic == null ? null : Number(externalAcademic),
      externalMarketPrice: externalMarket == null ? null : Number(externalMarket),
      externalNoSalaryPrice: externalNoSalary == null ? null : Number(externalNoSalary),
      pricing: {
        internal: internal == null ? null : Number(internal),
        external: external == null ? null : Number(external),
        externalAcademic: externalAcademic == null ? null : Number(externalAcademic),
        externalMarket: externalMarket == null ? null : Number(externalMarket),
        externalNoSalary: externalNoSalary == null ? null : Number(externalNoSalary),
        legacy: legacy == null ? null : Number(legacy),
      },
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

  const processRowUpdate = async (newRow: ServiceRow) => handleUpdate(newRow);


  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleDownloadPricingSheet = () => {
    try {
      const headers = [
        'id',
        'name',
        'pricingInternal',
        'pricingExternalAcademic',
        'pricingExternalMarket',
        'pricingExternalNoSalary',
        'pricingLegacy'
      ];
      const dataLines = rows.map((row) => {
        const id = row.id ?? '';
        const name = row.name ?? '';
        const pricing = (row as any).pricing ?? {};
        const internalPrice = pricing.internal ?? (row as any).internalPrice ?? '';
        const externalAcademicPrice =
          pricing.externalAcademic ?? (row as any).externalAcademicPrice ?? '';
        const externalMarketPrice =
          pricing.externalMarket ?? pricing.external ?? (row as any).externalMarketPrice ?? (row as any).externalPrice ?? '';
        const externalNoSalaryPrice =
          pricing.externalNoSalary ?? (row as any).externalNoSalaryPrice ?? '';
        const legacyPrice = pricing.legacy ?? (row as any).price ?? '';
        return [
          id,
          name,
          internalPrice,
          externalAcademicPrice,
          externalMarketPrice,
          externalNoSalaryPrice,
          legacyPrice
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',');
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
      const internalPriceIndex =
        normalizedHeaders.findIndex((h) => h === 'pricinginternal' || h === 'internalprice' || h === 'internal price');
      const externalAcademicPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalacademic' ||
            h === 'externalacademicprice' ||
            h === 'external academic price' ||
            h === 'external customer academic' ||
            h === 'external customer (academic)'
        );
      const externalMarketPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalmarket' ||
            h === 'externalmarketprice' ||
            h === 'external market price' ||
            h === 'pricingexternal' ||
            h === 'externalprice' ||
            h === 'external price' ||
            h === 'external customer market' ||
            h === 'external customer (market)'
        );
      const externalNoSalaryPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalnosalary' ||
            h === 'externalnosalaryprice' ||
            h === 'external no salary price' ||
            h === 'external customer no salary' ||
            h === 'external customer (no salary)'
        );
      const priceIndex =
        normalizedHeaders.findIndex((h) => h === 'pricinglegacy' || h === 'price' || h === 'service price' || h === 'legacy price');

      if (
        idIndex === -1 ||
        nameIndex === -1 ||
        (
          internalPriceIndex === -1 &&
          externalAcademicPriceIndex === -1 &&
          externalMarketPriceIndex === -1 &&
          externalNoSalaryPriceIndex === -1 &&
          priceIndex === -1
        )
      ) {
        setErrorMessage(
          'Spreadsheet must have columns for id, name, and at least one price column (internal, external academic, external market, external no salary, or fallback/legacy).'
        );
        return;
      }

      let updateCount = 0;
      let createCount = 0;

      for (const row of dataRows) {
        const rawId = row[idIndex];
        const rawName = row[nameIndex];
        const rawInternalPrice = internalPriceIndex !== -1 ? row[internalPriceIndex] : undefined;
        const rawExternalAcademicPrice = externalAcademicPriceIndex !== -1 ? row[externalAcademicPriceIndex] : undefined;
        const rawExternalMarketPrice = externalMarketPriceIndex !== -1 ? row[externalMarketPriceIndex] : undefined;
        const rawExternalNoSalaryPrice = externalNoSalaryPriceIndex !== -1 ? row[externalNoSalaryPriceIndex] : undefined;
        const rawPrice = priceIndex !== -1 ? row[priceIndex] : undefined;

        const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
        const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
        const internalPriceStr =
          rawInternalPrice !== undefined && rawInternalPrice !== null ? String(rawInternalPrice).trim() : '';
        const externalAcademicPriceStr =
          rawExternalAcademicPrice !== undefined && rawExternalAcademicPrice !== null ? String(rawExternalAcademicPrice).trim() : '';
        const externalMarketPriceStr =
          rawExternalMarketPrice !== undefined && rawExternalMarketPrice !== null ? String(rawExternalMarketPrice).trim() : '';
        const externalNoSalaryPriceStr =
          rawExternalNoSalaryPrice !== undefined && rawExternalNoSalaryPrice !== null ? String(rawExternalNoSalaryPrice).trim() : '';
        const priceStr = rawPrice !== undefined && rawPrice !== null ? String(rawPrice).trim() : '';

        if (!id && !name && !priceStr) {
          continue;
        }

        const parseMoney = (s: string): number | null => {
          if (s === '') return null;
          const n = Number(s.replace(/[^0-9.\-]/g, ''));
          return Number.isFinite(n) ? n : null;
        };

        const internalPrice = parseMoney(internalPriceStr);
        const externalAcademicPrice = parseMoney(externalAcademicPriceStr);
        const externalMarketPrice = parseMoney(externalMarketPriceStr);
        const externalNoSalaryPrice = parseMoney(externalNoSalaryPriceStr);
        const price = parseMoney(priceStr);

        const hasInvalid =
          (internalPriceStr !== '' && (internalPrice === null || internalPrice < 0)) ||
          (externalAcademicPriceStr !== '' && (externalAcademicPrice === null || externalAcademicPrice < 0)) ||
          (externalMarketPriceStr !== '' && (externalMarketPrice === null || externalMarketPrice < 0)) ||
          (externalNoSalaryPriceStr !== '' && (externalNoSalaryPrice === null || externalNoSalaryPrice < 0)) ||
          (priceStr !== '' && (price === null || price < 0));
        if (hasInvalid) {
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
            if (internalPriceStr !== '') {
              changes.internalPrice = internalPrice;
            }
            if (externalAcademicPriceStr !== '') {
              changes.externalAcademicPrice = externalAcademicPrice;
            }
            if (externalMarketPriceStr !== '') {
              changes.externalMarketPrice = externalMarketPrice;
              changes.externalPrice = externalMarketPrice;
            }
            if (externalNoSalaryPriceStr !== '') {
              changes.externalNoSalaryPrice = externalNoSalaryPrice;
            }
            if (priceStr !== '') {
              changes.price = price;
            }
            if (
              internalPriceStr !== '' ||
              externalAcademicPriceStr !== '' ||
              externalMarketPriceStr !== '' ||
              externalNoSalaryPriceStr !== '' ||
              priceStr !== ''
            ) {
              changes.pricing = {
                internal: internalPrice,
                external: externalMarketPrice,
                externalAcademic: externalAcademicPrice,
                externalMarket: externalMarketPrice,
                externalNoSalary: externalNoSalaryPrice,
                legacy: price,
              };
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
          internalPrice,
          externalPrice: externalMarketPrice,
          externalAcademicPrice,
          externalMarketPrice,
          externalNoSalaryPrice,
          pricing: {
            internal: internalPrice,
            external: externalMarketPrice,
            externalAcademic: externalAcademicPrice,
            externalMarket: externalMarketPrice,
            externalNoSalary: externalNoSalaryPrice,
            legacy: price,
          },
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

  const openPricingDialog = (params: GridRenderCellParams | GridRenderEditCellParams) => {
    const row: any = params.row ?? {};
    const pricing = row.pricing ?? {};
    setPricingEditProps(params);
    setPricingForm({
      internal: pricing.internal ?? row.internalPrice ?? '',
      externalAcademic: pricing.externalAcademic ?? row.externalAcademicPrice ?? '',
      externalMarket: pricing.externalMarket ?? row.externalMarketPrice ?? pricing.external ?? row.externalPrice ?? '',
      externalNoSalary: pricing.externalNoSalary ?? row.externalNoSalaryPrice ?? '',
      legacy: pricing.legacy ?? row.price ?? '',
    });
    setPricingDialogOpen(true);
  };

  const commitPricingDialog = () => {
    if (!pricingEditProps) return;
    const parse = (s: string): number | null => {
      if (s == null) return null;
      const t = String(s).trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const internal = parse(pricingForm.internal);
    const externalAcademic = parse(pricingForm.externalAcademic);
    const externalMarket = parse(pricingForm.externalMarket);
    const externalNoSalary = parse(pricingForm.externalNoSalary);
    const legacy = parse(pricingForm.legacy);

    const updatedRow: any = {
      ...pricingEditProps.row,
      pricing: {
        internal,
        external: externalMarket,
        externalAcademic,
        externalMarket,
        externalNoSalary,
        legacy
      },
      // keep legacy scalar fields for now (backward compat)
      internalPrice: internal,
      externalPrice: externalMarket,
      externalAcademicPrice: externalAcademic,
      externalMarketPrice: externalMarket,
      externalNoSalaryPrice: externalNoSalary,
      price: legacy,
    };
    gridRef.current.updateRows([updatedRow]);
    setPricingDialogOpen(false);
    setPricingEditProps(null);
  };

  const columns: GridColDef[] = [
    getActionsColumn({
      handleDelete: (id) => handleDeletion(id),
      handleEdit: (id) => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) => setRowModesModel({
        ...rowModesModel,
        [id]: { mode: GridRowModes.View, ignoreModifications: true }
      }),
      handleSave: (id) => handleSave(id),
      rowModesModel
    }),
    {
      field: 'name',
      headerName: 'Name',
      width: 500,
      editable: true
    },
    {
      field: 'pricing',
      headerName: 'Pricing',
      width: 160,
      editable: true,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => openPricingDialog(params)}>
          View
        </Button>
      ),
      renderEditCell: (params) => (
        <Button variant="contained" size="small" onClick={() => openPricingDialog(params)}>
          Edit
        </Button>
      )
    },
    {
      field: 'pricingMode',
      headerName: 'How Price Is Calculated',
      width: 220,
      editable: true,
      type: 'singleSelect',
      valueGetter: (_value, row) => row.pricingMode ?? 'SERVICE',
      valueOptions: [
        { value: 'SERVICE', label: 'Service price' },
        { value: 'PARAMETER', label: 'Based on selected options' }
      ],
      valueFormatter: (value) => {
        if (value === 'PARAMETER') return 'Based on selected options';
        return 'Service price';
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 500,
      editable: true
    },
    {
      field: 'allowedConnections',
      headerName: 'Can Be Combined With',
      width: 500,
      editable: true,
      renderCell: (params) => <ServiceList services={params.row.allowedConnections} />,
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.allowedConnections} {...params} />
    },
    {
      field: 'parameters',
      headerName: 'Parameters',
      width: 340,
      editable: true,
      renderCell: (params) => <Button variant="contained" onClick={() => handleParamViewButton(params)}>View</Button>,
      renderEditCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => handleParamEditButton(params)}>
            Quick edit
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/edit/services/${params.row.id}/parameters`)}
          >
            Full edit
          </Button>
        </Stack>
      )
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
    }
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
            toolbar: {
              setRowModesModel,
              addButtonLabel: 'Add new service',
              onAdd: () => navigate('/edit/services/new')
            },
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
        open={pricingDialogOpen}
        onClose={() => {
          setPricingDialogOpen(false);
          setPricingEditProps(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Service pricing
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Internal price"
              value={pricingForm.internal}
              onChange={(e) => setPricingForm((p) => ({ ...p, internal: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="External customer (academic)"
              value={pricingForm.externalAcademic}
              onChange={(e) => setPricingForm((p) => ({ ...p, externalAcademic: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="External customer (market)"
              value={pricingForm.externalMarket}
              onChange={(e) => setPricingForm((p) => ({ ...p, externalMarket: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="External customer (no salary)"
              value={pricingForm.externalNoSalary}
              onChange={(e) => setPricingForm((p) => ({ ...p, externalNoSalary: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="Fallback price"
              value={pricingForm.legacy}
              onChange={(e) => setPricingForm((p) => ({ ...p, legacy: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              helperText="Used only if internal/external are not set."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPricingDialogOpen(false);
              setPricingEditProps(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={commitPricingDialog}>
            Save
          </Button>
        </DialogActions>
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
