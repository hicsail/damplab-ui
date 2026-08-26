import { useApolloClient, useQuery } from '@apollo/client';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowId, GridRowModesModel, GridSlots } from '@mui/x-data-grid';
import { Alert, Box, Button, Chip, Snackbar, Stack } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import HistoryIcon from '@mui/icons-material/History';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserContext } from '../../contexts/UserContext';
import { GridToolBar } from './GridToolBar';
import { DELETE_INVENTORY_ITEM, GET_INVENTORY_ITEMS, GET_STATIONS } from '../../gql/queries';
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
  const { userProps } = useContext(UserContext);
  const isStaff = !!userProps?.isDamplabStaff;
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
    } catch (_error) {
      setErrorMessage('Unable to delete inventory item. Please try again.');
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

  const STAFF_ONLY_FIELDS = new Set(['actions', 'uniqueId', 'serialNumber']);
  const columns = isStaff ? allColumns : allColumns.filter((col) => !STAFF_ONLY_FIELDS.has(col.field));

  return (
    <Stack spacing={1}>
      {isStaff && (
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
        slots={{ toolbar: GridToolBar as GridSlots['toolbar'] }}
        slotProps={{
          toolbar: {
            setRowModesModel,
            ...(isStaff ? { addButtonLabel: 'Add new inventory item', onAdd: () => navigate('/edit/inventory/new') } : {}),
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
