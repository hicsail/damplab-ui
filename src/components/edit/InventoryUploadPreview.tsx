import { useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import {
  CREATE_INVENTORY_ITEM,
  CREATE_STATION,
  GET_INVENTORY_ITEMS,
  GET_STATIONS,
  UPDATE_INVENTORY_ITEM
} from '../../gql/queries';
import {
  buildCreateInput,
  buildUpdateChanges,
  matchExistingItems,
  ParsedInventoryRow,
  resolveStations,
  UploadSummary
} from './inventoryUploadUtils';

interface InventoryUploadPreviewProps {
  rows: ParsedInventoryRow[];
  open: boolean;
  onClose: () => void;
  onComplete: (summary: UploadSummary) => void;
}

export const InventoryUploadPreview: React.FC<InventoryUploadPreviewProps> = ({ rows, open, onClose, onComplete }) => {
  const client = useApolloClient();
  const { data: stationData } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const { data: inventoryData } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stations: Array<{ id: string; name: string }> = stationData?.stations ?? [];
  const existingItems: Array<{ id: string; uniqueId?: string }> = inventoryData?.inventoryItems ?? [];

  // Match existing items by uniqueId
  matchExistingItems(rows, existingItems);

  // Count how many will be created vs updated
  const updateCount = rows.filter((r) => !!r.existingItemId).length;
  const createCount = rows.length - updateCount;

  // Find stations that will be auto-created
  const existingStationNames = new Set(stations.map((s) => s.name.trim().toLowerCase()));
  const newStationNames = [
    ...new Set(
      rows
        .map((r) => r.stationName.trim())
        .filter((name) => name && !existingStationNames.has(name.toLowerCase()))
    )
  ];

  const warningRows = rows.filter((r) => r.warnings.length > 0);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 250, flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => <Chip size='small' label={params.value} />
    },
    { field: 'tag', headerName: 'Tag', width: 160 },
    { field: 'stationName', headerName: 'Station', width: 150 },
    { field: 'quantity', headerName: 'Qty', width: 60 },
    { field: 'uniqueId', headerName: 'Unique ID', width: 110 },
    { field: 'modelNumber', headerName: 'Model #', width: 120 },
    {
      field: 'action',
      headerName: 'Action',
      width: 100,
      renderCell: (params) => {
        const row = params.row as ParsedInventoryRow;
        return row.existingItemId ? (
          <Chip size='small' color='info' label='Update' />
        ) : (
          <Chip size='small' color='success' label='Create' />
        );
      }
    },
    {
      field: 'warnings',
      headerName: 'Warnings',
      width: 200,
      renderCell: (params) => {
        const w = params.value as string[];
        return w.length > 0 ? (
          <Typography variant='caption' color='warning.main'>
            {w.join('; ')}
          </Typography>
        ) : null;
      }
    }
  ];

  const gridRows = rows.map((r, i) => ({ id: i, ...r }));

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setProgress(0);

    const summary: UploadSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      // Step 1: Resolve stations (create missing ones)
      await resolveStations(rows, stations, async (name: string) => {
        const result = await client.mutate({
          mutation: CREATE_STATION,
          variables: { input: { name } }
        });
        return result.data.createStation.id;
      });

      // Step 2: Create/update inventory items
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        try {
          if (row.existingItemId) {
            await client.mutate({
              mutation: UPDATE_INVENTORY_ITEM,
              variables: {
                item: row.existingItemId,
                changes: buildUpdateChanges(row)
              }
            });
            summary.updated += 1;
          } else {
            await client.mutate({
              mutation: CREATE_INVENTORY_ITEM,
              variables: { item: buildCreateInput(row) }
            });
            summary.created += 1;
          }
        } catch (e) {
          summary.errors.push(`${row.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setImporting(false);
      return;
    }

    setImporting(false);
    onComplete(summary);
  };

  return (
    <Dialog open={open} onClose={importing ? undefined : onClose} maxWidth='lg' fullWidth>
      <DialogTitle>Import Inventory Preview</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`${rows.length} rows`} />
            <Chip label={`${createCount} to create`} color='success' variant='outlined' />
            <Chip label={`${updateCount} to update`} color='info' variant='outlined' />
          </Box>

          {newStationNames.length > 0 && (
            <Alert severity='info'>
              {newStationNames.length} new station{newStationNames.length > 1 ? 's' : ''} will be created:{' '}
              {newStationNames.join(', ')}
            </Alert>
          )}

          {warningRows.length > 0 && (
            <Alert severity='warning'>
              {warningRows.length} row{warningRows.length > 1 ? 's have' : ' has'} warnings. Review the table below.
            </Alert>
          )}

          {error && <Alert severity='error'>{error}</Alert>}

          {importing && (
            <Box>
              <LinearProgress variant='determinate' value={progress} />
              <Typography variant='caption' color='text.secondary'>
                Importing… {progress}%
              </Typography>
            </Box>
          )}

          <Box sx={{ height: 400 }}>
            <DataGrid rows={gridRows} columns={columns} density='compact' disableRowSelectionOnClick />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleImport} disabled={importing || rows.length === 0}>
          {importing ? 'Importing…' : `Import ${rows.length} items`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
