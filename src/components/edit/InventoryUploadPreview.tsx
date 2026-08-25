import { useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import {
  CREATE_INVENTORY_ITEM,
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
  UPLOAD_COLUMNS,
  UploadColumnKey,
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
  const [selectedColumns, setSelectedColumns] = useState<Set<UploadColumnKey>>(
    () => new Set(UPLOAD_COLUMNS.map((c) => c.key))
  );

  const toggleColumn = (key: UploadColumnKey) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const stations: Array<{ id: string; name: string }> = stationData?.stations ?? [];
  const existingItems: Array<{ id: string; uniqueId?: string }> = inventoryData?.inventoryItems ?? [];

  // Match existing items by uniqueId
  matchExistingItems(rows, existingItems);

  // Count how many will be created vs updated vs skipped
  const updateCount = rows.filter((r) => !!r.existingItemId).length;
  const skipCount = rows.filter((r) => !r.existingItemId && !r.name).length;
  const createCount = rows.length - updateCount - skipCount;

  // Resolve stations (synchronous — no auto-creation)
  resolveStations(rows, stations);

  // Find unknown station names
  const existingStationNames = new Set(stations.map((s) => s.name.trim().toLowerCase()));
  const unknownStationNames = [
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
        if (row.existingItemId) return <Chip size='small' color='info' label='Update' />;
        if (!row.name) return <Chip size='small' color='default' label='Skip' />;
        return <Chip size='small' color='success' label='Create' />;
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
      // Create/update inventory items
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        try {
          if (row.existingItemId) {
            await client.mutate({
              mutation: UPDATE_INVENTORY_ITEM,
              variables: {
                item: row.existingItemId,
                changes: buildUpdateChanges(row, selectedColumns)
              }
            });
            summary.updated += 1;
          } else {
            const input = buildCreateInput(row, selectedColumns);
            if (!input) {
              summary.skipped += 1;
              continue;
            }
            await client.mutate({
              mutation: CREATE_INVENTORY_ITEM,
              variables: { item: input }
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
            {skipCount > 0 && <Chip label={`${skipCount} to skip`} color='default' variant='outlined' />}
          </Box>

          {unknownStationNames.length > 0 && (
            <Alert severity='warning'>
              {unknownStationNames.length} station name{unknownStationNames.length > 1 ? 's were' : ' was'} not found
              and will be skipped: {unknownStationNames.join(', ')}
            </Alert>
          )}

          {warningRows.length > 0 && (
            <Alert severity='warning'>
              {warningRows.length} row{warningRows.length > 1 ? 's have' : ' has'} warnings. Review the table below.
            </Alert>
          )}

          <Box>
            <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
              Columns to import (unchecked columns will be skipped for updates):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
              {UPLOAD_COLUMNS.map((col) => (
                <FormControlLabel
                  key={col.key}
                  control={
                    <Checkbox
                      size='small'
                      checked={selectedColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      disabled={importing}
                    />
                  }
                  label={col.label}
                />
              ))}
            </Box>
          </Box>

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
