import { useApolloClient, useQuery } from '@apollo/client';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowId, GridRowModesModel, GridSlots } from '@mui/x-data-grid';
import { Alert, Box, Button, Chip, Snackbar, Stack } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import HistoryIcon from '@mui/icons-material/History';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { GridToolBar } from './GridToolBar';
import { DELETE_INVENTORY_ITEM, GET_INVENTORY_ITEMS, GET_STATIONS } from '../../gql/queries';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import { formatSaveError } from '../../utils/gqlError';
import { validateFileType } from '../data-translation/utils';
import { parseInventoryFile, ParsedInventoryRow, UploadSummary } from './inventoryUploadUtils';
import { InventoryUploadPreview } from './InventoryUploadPreview';
import * as XLSX from 'xlsx';

export interface EditInventoryTableProps {
  searchString?: string;
}

export const EditInventoryTable: React.FC<EditInventoryTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const client = useApolloClient();
  // Was `isDamplabStaff` on main. Two permissions rather than one boolean, because
  // the two things it gated are different questions: `inventory:write` decides
  // whether you may change anything, `internal-fields:read` whether you may see the
  // internal columns. A technician holds the second and not the first, and would
  // otherwise lose columns the server is perfectly willing to send them.
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.InventoryWrite);
  const canSeeInternalFields = can(PERMISSIONS.InternalFieldsRead);
  // The inventory list isn't on AppContext yet (unlike services/bundles), so we
  // query directly and refetch after mutations. If the catalog grows enough
  // that this gets called a lot, lift to AppContext.
  const { data, refetch } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const { data: stationsData } = useQuery(GET_STATIONS);
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stationsData?.stations ?? []) map.set(s.id, s.name);
    return map;
  }, [stationsData]);
  const [rows, setRows] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRowModesModel] = useState<GridRowModesModel>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<ParsedInventoryRow[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');

  useEffect(() => {
    setRows(data?.inventoryItems ?? []);
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchString.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row?.name, row?.type, row?.description, row?.location, ...(row?.tags ?? []), row?.modelNumber, row?.uniqueId]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [rows, searchString]);

  const handleDelete = async (id: GridRowId) => {
    try {
      await client.mutate({ mutation: DELETE_INVENTORY_ITEM, variables: { item: id } });
      await refetch();
    } catch (error) {
      // "Please try again" is wrong for a 403 — retrying never works. Show what
      // the server actually said.
      console.error('Delete inventory item failed:', error);
      setErrorMessage(formatSaveError(error, 'this inventory item'));
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    if (!validateFileType(file.name)) {
      setErrorMessage('Please upload an .xlsx or .xls file.');
      return;
    }

    try {
      const { rows: parsed } = await parseInventoryFile(file);
      if (parsed.length === 0) {
        setErrorMessage('No valid rows found in the spreadsheet.');
        return;
      }
      setUploadFileName(file.name);
      setPreviewRows(parsed);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to parse file.');
    }
  };

  const handleUploadComplete = (summary: UploadSummary) => {
    setPreviewRows(null);
    refetch();
    const parts = [];
    if (summary.created > 0) parts.push(`${summary.created} created`);
    if (summary.updated > 0) parts.push(`${summary.updated} updated`);
    if (summary.errors.length > 0) parts.push(`${summary.errors.length} failed`);
    setErrorMessage(`Import complete: ${parts.join(', ')}.`);
  };

  const handleDownloadInventory = () => {
    try {
      const headers = ['Name', 'Type', 'Tag', 'Station', 'Quantity', 'Unique ID', 'Model #', 'Serial #', 'Service Contract Y/N', 'Service contract (expiration date)'];
      const dataRows = rows.map((row: any) => {
        const placement = row.placements?.[0];
        return [
          row.name ?? '',
          row.type ?? '',
          (row.tags ?? []).join(', '),
          '', // Station name not resolved here — just leave blank for re-upload matching by uniqueId
          placement?.quantity ?? '',
          row.uniqueId ?? '',
          row.modelNumber ?? '',
          row.serialNumber ?? '',
          row.hasServiceContract ? 'Y' : '',
          row.serviceContractExpiration ? String(row.serviceContractExpiration).slice(0, 10) : ''
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      ws['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      XLSX.writeFile(wb, 'damplab-inventory.xlsx');
    } catch (e) {
      console.error('Download failed:', e);
      setErrorMessage('Failed to generate inventory spreadsheet.');
    }
  };

  const allColumns: GridColDef[] = [
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) => [
        <GridActionsCellItem key='edit' icon={<Edit />} label='Edit' onClick={() => navigate(`/edit/inventory/${id}`)} color='inherit' />,
        <GridActionsCellItem key='delete' icon={<Delete />} label='Delete' onClick={() => handleDelete(id)} color='inherit' />
      ]
    },
    { field: 'uniqueId', headerName: 'ID', width: 110 },
    { field: 'name', headerName: 'Name', width: 240, flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (params.row.type ? <Chip size='small' label={String(params.row.type)} /> : null)
    },
    {
      field: 'tags',
      headerName: 'Tags',
      width: 200,
      renderCell: (params) => (
        <>{(params.row.tags ?? []).map((t: string, i: number) => <Chip key={i} size='small' label={t} sx={{ mr: 0.5 }} />)}</>
      )
    },
    {
      field: 'placements',
      headerName: 'Station',
      width: 200,
      renderCell: (params) => {
        const placements: any[] = params.row.placements ?? [];
        if (placements.length === 0) return null;
        return (
          <>
            {placements.map((p: any, i: number) => {
              const name = stationMap.get(p.stationId) ?? p.stationId;
              return <Chip key={i} size='small' label={p.quantity > 1 ? `${name} (×${p.quantity})` : name} sx={{ mr: 0.5 }} />;
            })}
          </>
        );
      }
    },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'description', headerName: 'Description', width: 240, flex: 1 },
    { field: 'modelNumber', headerName: 'Model #', width: 130 },
    { field: 'serialNumber', headerName: 'Serial #', width: 130 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    {
      field: 'dimensionL',
      headerName: 'L (m)',
      width: 80,
      valueGetter: (_value: any, row: any) => row.dimensionL?.value ?? ''
    },
    {
      field: 'dimensionW',
      headerName: 'W (m)',
      width: 80,
      valueGetter: (_value: any, row: any) => row.dimensionW?.value ?? ''
    },
    {
      field: 'dimensionH',
      headerName: 'H (m)',
      width: 80,
      valueGetter: (_value: any, row: any) => row.dimensionH?.value ?? ''
    },
    {
      field: 'hasServiceContract',
      headerName: 'Contract',
      width: 100,
      renderCell: (params) => (params.row.hasServiceContract ? <Chip size='small' color='info' label='Yes' /> : null)
    },
    {
      field: 'serviceContractExpiration',
      headerName: 'Contract Exp.',
      width: 130,
      valueFormatter: (value: string) => (value ? new Date(value).toLocaleDateString() : '')
    },
    {
      field: 'bookable',
      headerName: 'Bookable',
      width: 100,
      renderCell: (params) => (params.row.bookable ? <Chip size='small' color='success' label='Yes' /> : null)
    },
    { field: 'rateType', headerName: 'Rate Type', width: 110 },
    { field: 'lastModifiedBy', headerName: 'Modified By', width: 140 },
    {
      field: 'isDeleted',
      headerName: 'Status',
      width: 110,
      renderCell: (params) =>
        params.row.isDeleted ? (
          <Chip size='small' color='default' label='Deleted' />
        ) : (
          <Chip size='small' color='success' label='Active' />
        )
    }
  ];

  /** Columns hidden by default — users can toggle via the column menu. */
  const defaultHiddenColumns: Record<string, boolean> = {
    dimensionL: false,
    dimensionW: false,
    dimensionH: false,
    hasServiceContract: false,
    serviceContractExpiration: false,
    bookable: false,
    rateType: false,
    lastModifiedBy: false
  };

  /** Row actions are a write affordance; the read tier keeps the table without them. */
  const WRITE_ONLY_FIELDS = new Set(['actions']);
  /**
   * Internal columns. The server already nulls `serialNumber` for anyone without
   * `internal-fields:read`, so leaving the column in would render a permanently
   * empty strip — hiding it is presentation catching up with what enforcement
   * already decided. `uniqueId` rides along as the other internal identifier.
   */
  const INTERNAL_FIELDS = new Set(['uniqueId', 'serialNumber']);
  const columns = allColumns.filter(
    (col) => (canWrite || !WRITE_ONLY_FIELDS.has(col.field)) && (canSeeInternalFields || !INTERNAL_FIELDS.has(col.field))
  );

  return (
    <Stack spacing={1}>
      {canWrite && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant='outlined' startIcon={<DownloadIcon />} onClick={handleDownloadInventory}>
            Download inventory
          </Button>
          <Button variant='contained' startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
            Upload inventory
          </Button>
          <Button variant='outlined' startIcon={<HistoryIcon />} onClick={() => navigate('/edit/inventory/upload-history')}>
            Upload history
          </Button>
          <input ref={fileInputRef} type='file' accept='.xlsx,.xls' style={{ display: 'none' }} onChange={handleUploadFile} />
        </Box>
      )}
      {previewRows && (
        <InventoryUploadPreview
          rows={previewRows}
          fileName={uploadFileName}
          open={!!previewRows}
          onClose={() => setPreviewRows(null)}
          onComplete={handleUploadComplete}
        />
      )}
      <DataGrid
        rows={filteredRows}
        columns={columns}
        initialState={{
          columns: { columnVisibilityModel: defaultHiddenColumns }
        }}
        slots={{ toolbar: GridToolBar as GridSlots['toolbar'] }}
        slotProps={{
          toolbar: {
            canWrite,
            setRowModesModel,
            addButtonLabel: 'Add new inventory item',
            onAdd: () => navigate('/edit/inventory/new'),
            showEditModeHint: false
          }
        }}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity={errorMessage?.startsWith('Import complete') ? 'success' : 'error'} sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
};
