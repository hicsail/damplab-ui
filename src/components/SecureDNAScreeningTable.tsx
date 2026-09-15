import { useMemo, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Button,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  ScreeningBatch,
} from '../securedna/types';
import { ApolloError } from '@apollo/client/index.js';
import ScreeningBatchDetailsModal from './ScreeningBatchDetailsModal';

interface ScreeningBatchRow {
  id: string;
  providerReference: string | null;
  batchRunId: string;
  created_at: Date;
  region: ScreeningBatch['region'];
  sequenceCount: number;
  batchStatus: 'granted' | 'denied';
  batch: ScreeningBatch;
}

interface BatchGridRow extends ScreeningBatchRow {
  onViewDetails: () => void;
}

interface SecureDNAScreeningTableProps {
  screenings?: ScreeningBatch[];
  loading?: boolean;
  error?: ApolloError;
}

function batchToRow(batch: ScreeningBatch): ScreeningBatchRow {
  return {
    id: batch.id,
    providerReference: batch.providerReference?.trim() || null,
    batchRunId: batch.batchRunId,
    created_at: new Date(batch.created_at),
    region: batch.region,
    sequenceCount: batch.sequences.length,
    batchStatus: batch.synthesisPermission,
    batch,
  };
}

function sortBatches(rows: ScreeningBatchRow[]): ScreeningBatchRow[] {
  return [...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}

const columns: GridColDef<BatchGridRow>[] = [
  {
    field: 'providerReference',
    headerName: 'Batch',
    flex: 1.2,
    sortable: false,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => {
      const ref = params.row.providerReference;
      const runId = params.row.batchRunId;
      const display = ref || runId;
      if (!display) {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      const short = display.length > 40 ? `${display.slice(0, 38)}…` : display;
      return (
        <Tooltip title={display}>
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
            {short}
          </Typography>
        </Tooltip>
      );
    },
  },
  {
    field: 'sequenceCount',
    headerName: 'Sequences',
    flex: 0.55,
    type: 'number',
    align: 'left',
    headerAlign: 'left',
  },
  {
    field: 'batchStatus',
    headerName: 'Batch status',
    flex: 0.85,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => {
      const status = params.row.batchStatus.toUpperCase();
      const color =
        status === 'GRANTED' ? 'success.main' : 'error.main';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography color={color}>{status}</Typography>
        </Box>
      );
    },
  },
  {
    field: 'created_at',
    headerName: 'Created',
    flex: 1,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) =>
      new Date(params.row.created_at).toLocaleString(),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    flex: 0.85,
    sortable: false,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => (
      <Button
        variant="contained"
        size="small"
        onClick={() => params.row?.onViewDetails()}
        sx={{
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        View batch
      </Button>
    ),
  },
];

export default function SecureDNAScreeningTable({
  screenings = [],
  loading = false,
  error,
}: SecureDNAScreeningTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<ScreeningBatch | null>(null);

  const batches = useMemo(
    () => sortBatches(screenings.map(batchToRow)),
    [screenings]
  );

  const rows: BatchGridRow[] = useMemo(
    () =>
      batches.map((b) => ({
        ...b,
        onViewDetails: () => setSelectedBatch(b.batch),
      })),
    [batches]
  );

  if (loading) return <div>Loading...</div>;
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('no authorization header')) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Please sign in to DAMPLab to view SecureDNA screening results
          </Typography>
        </Box>
      );
    }
    return <div>Error: {error.message}</div>;
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
        autoHeight
        sx={{
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid rgba(224, 224, 224, 1)',
            marginTop: 0,
          },
          '& .MuiDataGrid-virtualScroller': {
            overflow: 'hidden',
          },
        }}
      />
      <ScreeningBatchDetailsModal
        open={Boolean(selectedBatch)}
        batch={selectedBatch}
        onClose={() => setSelectedBatch(null)}
      />
    </Box>
  );
}
