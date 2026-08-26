import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GET_UPLOAD_LOG, GET_UPLOAD_LOGS } from '../gql/queries';

export default function InventoryUploadHistory() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(GET_UPLOAD_LOGS, { fetchPolicy: 'cache-and-network' });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const logs: any[] = data?.uploadLogs ?? [];

  const columns: GridColDef[] = [
    {
      field: 'uploadDate',
      headerName: 'Date',
      width: 180,
      valueFormatter: (value: string) => (value ? new Date(value).toLocaleString() : '')
    },
    { field: 'uploaderName', headerName: 'Uploaded by', width: 160 },
    { field: 'fileName', headerName: 'File', width: 220, flex: 1 },
    { field: 'rowCount', headerName: 'Rows', width: 80 },
    {
      field: 'createdCount',
      headerName: 'Created',
      width: 90,
      renderCell: (params) => (params.value > 0 ? <Chip size='small' color='success' label={params.value} /> : '0')
    },
    {
      field: 'updatedCount',
      headerName: 'Updated',
      width: 90,
      renderCell: (params) => (params.value > 0 ? <Chip size='small' color='info' label={params.value} /> : '0')
    },
    {
      field: 'skippedCount',
      headerName: 'Skipped',
      width: 90,
      renderCell: (params) => (params.value > 0 ? <Chip size='small' color='default' label={params.value} /> : '0')
    },
    {
      field: 'failedCount',
      headerName: 'Failed',
      width: 80,
      renderCell: (params) => (params.value > 0 ? <Chip size='small' color='error' label={params.value} /> : '0')
    }
  ];

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <Button
        variant='outlined'
        size='small'
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/edit')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to catalog
      </Button>
      <Typography variant='h2'>Inventory Upload History</Typography>

      {loading && logs.length === 0 && (
        <Typography color='text.secondary'>Loading...</Typography>
      )}

      <Box sx={{ height: 500 }}>
        <DataGrid
          rows={logs}
          columns={columns}
          density='compact'
          disableRowSelectionOnClick
          onRowClick={(params) => setSelectedLogId(params.row.id)}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      {selectedLogId && (
        <UploadLogDetail logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
      )}
    </Stack>
  );
}

function UploadLogDetail({ logId, onClose }: { logId: string; onClose: () => void }) {
  const { data, loading } = useQuery(GET_UPLOAD_LOG, { variables: { id: logId }, fetchPolicy: 'cache-and-network' });
  const log = data?.uploadLog;

  const snapshots: any[] = log?.fieldSnapshots ?? [];

  const columns: GridColDef[] = [
    { field: 'itemId', headerName: 'Item ID', width: 220 },
    {
      field: 'action',
      headerName: 'Action',
      width: 120,
      renderCell: (params) => {
        const color = params.value === 'CREATE' ? 'success' : params.value === 'REACTIVATE' ? 'warning' : 'info';
        return <Chip size='small' color={color} label={params.value} />;
      }
    },
    {
      field: 'before',
      headerName: 'Before',
      width: 300,
      flex: 1,
      renderCell: (params) => (params.value ? <Typography variant='caption'>{JSON.stringify(params.value)}</Typography> : '—')
    },
    {
      field: 'after',
      headerName: 'After',
      width: 300,
      flex: 1,
      renderCell: (params) => (params.value ? <Typography variant='caption'>{JSON.stringify(params.value)}</Typography> : '—')
    }
  ];

  const gridRows = snapshots.map((s: any, i: number) => ({ id: i, ...s }));

  return (
    <Dialog open onClose={onClose} maxWidth='lg' fullWidth>
      <DialogTitle>
        Upload Detail
        {log && (
          <Typography variant='body2' color='text.secondary'>
            {log.fileName} — uploaded by {log.uploaderName} on {new Date(log.uploadDate).toLocaleString()}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {loading && <Typography color='text.secondary'>Loading...</Typography>}
        {log && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`${log.rowCount} rows`} />
              <Chip label={`${log.createdCount} created`} color='success' variant='outlined' />
              <Chip label={`${log.updatedCount} updated`} color='info' variant='outlined' />
              {log.skippedCount > 0 && <Chip label={`${log.skippedCount} skipped`} variant='outlined' />}
              {log.failedCount > 0 && <Chip label={`${log.failedCount} failed`} color='error' variant='outlined' />}
            </Box>

            {snapshots.length === 0 ? (
              <Alert severity='info'>No field snapshots recorded for this upload.</Alert>
            ) : (
              <Box sx={{ height: 400 }}>
                <DataGrid rows={gridRows} columns={columns} density='compact' disableRowSelectionOnClick />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
