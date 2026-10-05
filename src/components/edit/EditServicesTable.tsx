import { useApolloClient, useQuery } from '@apollo/client';
import { CREATE_CATEGORY, DELETE_SERVICE, GET_DELETED_SERVICE_IDS, GET_PARAMETER_SETS } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowModesModel,
  GridActionsCellItem,
  GridSlots
} from '@mui/x-data-grid';
import { Box, Button, Snackbar, Alert, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import { Edit, Delete } from '@mui/icons-material';
import { ServiceList } from './ServiceList';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { GridToolBar } from './GridToolBar';
import ConfirmDeleteDialog, { PendingDelete } from './ConfirmDeleteDialog';

import { useNavigate } from 'react-router';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import { formatSaveError } from '../../utils/gqlError';
import * as XLSX from 'xlsx';
import { FieldPickerDialog } from './FieldPickerDialog';
import { offeredFields } from './exportFields';
import { buildOperationsWorkbook, operationExportFields, OPERATIONS_FILE_NAME } from './operationsSheet';
import { setRefsFrom } from '../../utils/serviceParameters';
import { isExcelFileName } from './inventoryUploadUtils';
import { parseOperationsSheet, ParsedOperationsSheet, readOperationsFile } from './operationsUploadUtils';
import { OperationsUploadPreview, OperationsUploadSummary } from './OperationsUploadPreview';
import { withoutHidden } from '../../utils/paletteVisibility';
import { useShowHiddenOperations } from '../../hooks/useShowHiddenOperations';
import { ShowHiddenOperationsToggle } from './ShowHiddenOperationsToggle';
import { HiddenFromClientsChip } from './HiddenFromClientsChip';

type ServiceRow = Record<string, unknown> & { id: GridRowId; hiddenFromClients?: boolean | null };

/**
 * Fix round 1: Upload (`disabled={!setsData || !deletedData}`) was going stuck
 * with no explanation whenever either query errored — the only message on
 * screen talked about Download. Names which list is missing; null when both
 * queries are fine (pure, so it's tested directly rather than through the DOM).
 */
export function uploadUnavailableMessage(setsError: unknown, deletedError: unknown): string | null {
  const missing: string[] = [];
  if (setsError) missing.push('parameter sets');
  if (deletedError) missing.push('deleted operations');
  if (missing.length === 0) return null;
  return `Upload is unavailable: couldn't load ${missing.join(' and ')}.`;
}

function formatPricingSummary(row: Record<string, unknown>): string {
  const pricing = (row as any).pricing ?? {};
  const parts: string[] = [];
  const intVal = pricing.internal ?? (row as any).internalPrice;
  if (intVal != null && intVal !== '') parts.push(`Int ${intVal}`);
  const acad = pricing.externalAcademic ?? (row as any).externalAcademicPrice;
  if (acad != null && acad !== '') parts.push(`Acad ${acad}`);
  const mkt =
    pricing.externalMarket ?? pricing.external ?? (row as any).externalMarketPrice ?? (row as any).externalPrice;
  if (mkt != null && mkt !== '') parts.push(`Mkt ${mkt}`);
  const nosal = pricing.externalNoSalary ?? (row as any).externalNoSalaryPrice;
  if (nosal != null && nosal !== '') parts.push(`No sal ${nosal}`);
  const leg = pricing.legacy ?? (row as any).price;
  if (leg != null && leg !== '') parts.push(`Legacy ${leg}`);
  return parts.length ? parts.join(' · ') : '—';
}

export interface EditServicesTableProps {
  searchString?: string;
}

export const EditServicesTable: React.FC<EditServicesTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const canSeeInternal = can(PERMISSIONS.InternalFieldsRead);
  const { canSeeHidden, showHidden, setShowHidden } = useShowHiddenOperations();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const { services, refreshCatalog } = useContext(AppContext);
  const client = useApolloClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [, setRowModesModel] = useState<GridRowModesModel>({});

  const { data: setsData, error: setsError } = useQuery(GET_PARAMETER_SETS, { fetchPolicy: 'cache-and-network' });
  const setNameById = useMemo(() => new Map(setRefsFrom(setsData).map((s) => [s.id, s.name])), [setsData]);
  const exportFields = useMemo(() => offeredFields(operationExportFields(setNameById), canSeeInternal), [setNameById, canSeeInternal]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: deletedData, error: deletedError } = useQuery(GET_DELETED_SERVICE_IDS, { fetchPolicy: 'network-only', skip: !canWrite });
  const [parsedUpload, setParsedUpload] = useState<ParsedOperationsSheet | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  // Ruling D3: sets→refs is setRefsFrom (utils/serviceParameters.ts), not an inline map.
  const setRefs = useMemo(() => setRefsFrom(setsData), [setsData]);

  useEffect(() => {
    setRows(services as ServiceRow[]);
  }, [services]);

  useEffect(() => {
    // Parameter sets failed to load: the parameterSets column falls back to raw
    // set ids (see operationExportFields), so the download stays usable — just
    // tell the user why the names look wrong. Task 10's behaviour, unchanged.
    const parts: string[] = [];
    if (setsError) parts.push('Failed to load parameter sets; the download will show set ids instead of names.');
    // Fix round 1: Upload needs both lists to classify rows, so a failure here
    // must name Upload specifically rather than leaving it stuck with no
    // explanation (the message above only ever talked about Download).
    if (canWrite) {
      const uploadMessage = uploadUnavailableMessage(setsError, deletedError);
      if (uploadMessage) parts.push(uploadMessage);
    }
    if (parts.length > 0) setErrorMessage(parts.join(' '));
  }, [setsError, deletedError, canWrite]);

  const filteredRows = useMemo(() => {
    const visible = withoutHidden(rows, showHidden);
    const q = searchString.trim().toLowerCase();
    if (!q) return visible;

    return visible.filter((row) => {
      const name = String((row as any).name ?? '').toLowerCase();
      if (name.includes(q)) return true;

      const params = (row as any).parameters;
      if (Array.isArray(params)) {
        return params.some((p: any) => {
          const pid = String(p?.id ?? '').toLowerCase();
          const pname = String(p?.name ?? '').toLowerCase();
          return pid.includes(q) || pname.includes(q);
        });
      }

      return false;
    });
  }, [rows, searchString, showHidden]);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete<GridRowId> | null>(null);

  const handleDeletion = async (id: GridRowId) => {
    // Previously had no try/catch at all, so a refusal surfaced as an unhandled
    // rejection and the row simply stayed put with no explanation.
    try {
      await client.mutate({
        mutation: DELETE_SERVICE,
        variables: {
          service: id
        }
      });
      await refreshCatalog();
    } catch (error) {
      console.error('Delete service failed:', error);
      setErrorMessage(formatSaveError(error, 'this service'));
    }
  };

  const handleDownloadOperations = (keys: string[]) => {
    setPickerOpen(false);
    try {
      XLSX.writeFile(buildOperationsWorkbook(rows as any, exportFields, new Set(keys)), OPERATIONS_FILE_NAME);
    } catch (error) {
      console.error('Error generating operations spreadsheet:', error);
      setErrorMessage('Failed to generate operations spreadsheet.');
    }
  };

  const handleUploadOperations = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isExcelFileName(file.name)) {
      setErrorMessage('Please upload an .xlsx or .xls file.');
      return;
    }
    try {
      const aoa = await readOperationsFile(file);
      const parsed = parseOperationsSheet(aoa, {
        existing: services as any,
        deletedIds: new Set<string>(deletedData?.deletedServiceIds ?? []),
        sets: setRefs,
        allowPricing: canSeeInternal
      });
      if (parsed.rows.length === 0) {
        setErrorMessage('No rows found in the Operations sheet.');
        return;
      }
      setUploadFileName(file.name);
      setParsedUpload(parsed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to read the spreadsheet.');
    }
  };

  const handleUploadComplete = async (summary: OperationsUploadSummary) => {
    setParsedUpload(null);
    await refreshCatalog();
    const failed = summary.errors.length ? ` ${summary.errors.length} failed: ${summary.errors.join(' ')}` : '';
    setErrorMessage(`Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped.${failed}`);
  };

  const columns: GridColDef[] = [
    // Read tier keeps the table; it just loses the Actions column rather than
    // getting an Edit that opens a form it cannot save and a Delete that 403s.
    ...(canWrite
      ? [
          {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }: { id: GridRowId }) => [
              <GridActionsCellItem
                key="edit"
                icon={<Edit />}
                label="Edit"
                onClick={() => navigate(`/edit/services/${id}`)}
                color="inherit"
              />,
              <GridActionsCellItem
                key="delete"
                icon={<Delete />}
                label="Delete"
                onClick={() => setPendingDelete({ id, name: String(rows.find((row: any) => row.id === id)?.name ?? '') })}
                color="inherit"
              />
            ]
          } as GridColDef
        ]
      : []),
    {
      field: 'name',
      headerName: 'Name',
      width: 500,
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <>
          {params.row.name}
          {(params.row as any).hiddenFromClients && <HiddenFromClientsChip sx={{ ml: 1 }} />}
        </>
      )
    },
    {
      field: 'pricing',
      headerName: 'Pricing',
      width: 240,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {formatPricingSummary(params.row)}
        </Typography>
      )
    },
    {
      field: 'pricingMode',
      headerName: 'How Price Is Calculated',
      width: 220,
      valueGetter: (_value, row) => (row as any).pricingMode ?? 'SERVICE',
      valueFormatter: (value) => {
        if (value === 'PARAMETER') return 'Based on selected options';
        return 'Service price';
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 400,
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {(params.row as any).description ?? '—'}
        </Typography>
      )
    },
    {
      field: 'allowedConnections',
      headerName: 'Can Be Combined With',
      width: 320,
      renderCell: (params) => <ServiceList services={(params.row as any).allowedConnections} />
    },
    {
      field: 'parameters',
      headerName: 'Parameters',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(`/edit/services/${params.row.id}/parameters`)}
        >
          Configure ({(params.row as any).parameters?.length ?? 0})
        </Button>
      )
    },
    {
      field: 'deliverables',
      headerName: 'Deliverables',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const n = (params.row as any).deliverables?.length ?? 0;
        return (
          <Typography variant="body2" color="text.secondary">
            {n} item{n !== 1 ? 's' : ''} — edit service
          </Typography>
        );
      }
    }
  ];

  return (
    <>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Download is a read of data already on screen; upload is a bulk
              create/update, so only that half is gated. */}
          {/* Task 10 fix (a9b5698..5363d79): a sets-query error must not leave Download
              stuck disabled forever — the export falls back to raw set ids. */}
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!setsData && !setsError} onClick={() => setPickerOpen(true)}>Download</Button>
          {canSeeHidden && <ShowHiddenOperationsToggle showHidden={showHidden} setShowHidden={setShowHidden} />}
          {canWrite && (
            <>
              {/* Needs the set names and deleted ids to classify rows; never parse against empty lists. */}
              <Button variant="contained" startIcon={<UploadIcon />} disabled={!setsData || !deletedData} onClick={() => fileInputRef.current?.click()}>Upload</Button>
              <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate('/edit/inventory/upload-history?type=OPERATION')}>Upload history</Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleUploadOperations} />
            </>
          )}
        </Box>
        {parsedUpload && (
          <OperationsUploadPreview
            parsed={parsedUpload}
            fileName={uploadFileName}
            existing={services as any}
            sets={setRefs}
            open
            onClose={() => setParsedUpload(null)}
            onComplete={handleUploadComplete}
          />
        )}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          slots={{
            toolbar: GridToolBar as GridSlots['toolbar']
          }}
          slotProps={{
            toolbar: {
              canWrite,
              setRowModesModel,
              addButtonLabel: 'Add new service',
              onAdd: () => navigate('/edit/services/new'),
              showEditModeHint: false
            }
          }}
        />
      </Stack>
      <ConfirmDeleteDialog
        target={pendingDelete}
        noun='operation'
        detail='This removes the operation from the catalog, so it can no longer be added to jobs. Jobs that already use it keep it.'
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void handleDeletion(target.id);
        }}
      />
      <FieldPickerDialog
        open={pickerOpen}
        title="Download operations"
        note="A read-only Parameters sheet is always included."
        fields={exportFields}
        onCancel={() => setPickerOpen(false)}
        onConfirm={handleDownloadOperations}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity={errorMessage?.includes('complete') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
