import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Autocomplete,
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
  TextField,
  Typography
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useContext, useRef, useState } from 'react';
import { UserContext } from '../../contexts/UserContext';
import {
  CREATE_INVENTORY_ITEM,
  CREATE_UPLOAD_LOG,
  GET_INVENTORY_ITEMS,
  GET_STATIONS,
  UPDATE_INVENTORY_ITEM
} from '../../gql/queries';
import { CREATE_INVENTORY_IMAGE_UPLOAD_URL } from '../../gql/mutations';
import {
  buildCreateInput,
  buildUpdateChanges,
  matchExistingItems,
  ParsedInventoryRow,
  resolveStations,
  SUGGESTED_TYPES,
  UPLOAD_COLUMNS,
  UploadColumnKey,
  UploadSummary,
  validateUploadRows,
  ValidationSummary
} from './inventoryUploadUtils';
import { extractImagesFromZip, ImageMatch, matchImagesToRows, ZipImage } from './inventoryImageZip';

interface InventoryUploadPreviewProps {
  rows: ParsedInventoryRow[];
  fileName: string;
  open: boolean;
  onClose: () => void;
  onComplete: (summary: UploadSummary) => void;
}

export const InventoryUploadPreview: React.FC<InventoryUploadPreviewProps> = ({ rows, fileName, open, onClose, onComplete }) => {
  const client = useApolloClient();
  const { userProps } = useContext(UserContext);
  const { data: stationData } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const { data: inventoryData } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<UploadColumnKey>>(
    () => new Set(UPLOAD_COLUMNS.map((c) => c.key))
  );
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipImages, setZipImages] = useState<ZipImage[]>([]);
  const [imageMatches, setImageMatches] = useState<ImageMatch[]>([]);
  const [unmatchedImages, setUnmatchedImages] = useState<string[]>([]);
  const [zipFileName, setZipFileName] = useState<string>('');
  const [createUploadUrl] = useMutation(CREATE_INVENTORY_IMAGE_UPLOAD_URL);

  const toggleColumn = (key: UploadColumnKey) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleZipFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    try {
      const images = await extractImagesFromZip(file);
      setZipImages(images);
      setZipFileName(file.name);
      const { matches, unmatched } = matchImagesToRows(images, rows);
      setImageMatches(matches);
      setUnmatchedImages(unmatched);
    } catch (e) {
      console.error('Failed to read ZIP file:', e);
      setError('Failed to read ZIP file. Make sure it is a valid .zip archive.');
    }
  };

  const stations: Array<{ id: string; name: string }> = stationData?.stations ?? [];
  const existingItems: Array<{ id: string; uniqueId?: string; isDeleted?: boolean }> = inventoryData?.inventoryItems ?? [];
  const [reactivateSet, setReactivateSet] = useState<Set<number>>(() => new Set());

  // Match existing items by uniqueId
  matchExistingItems(rows, existingItems);

  // Count how many will be created vs updated vs skipped
  const updateCount = rows.filter((r) => !!r.existingItemId).length;
  const skipCount = rows.filter((r) => !r.existingItemId && !r.name).length;
  const createCount = rows.length - updateCount - skipCount;

  // Count rows matching soft-deleted items
  const deletedMatchCount = rows.filter((r) => r.matchedIsDeleted).length;

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

  // Re-match ZIP images whenever rows change (e.g. after station resolution)
  if (zipImages.length > 0 && imageMatches.length === 0 && unmatchedImages.length === 0) {
    const { matches, unmatched } = matchImagesToRows(zipImages, rows);
    if (matches.length > 0 || unmatched.length > 0) {
      setImageMatches(matches);
      setUnmatchedImages(unmatched);
    }
  }

  // Run pre-upload validation
  const validation: ValidationSummary = validateUploadRows(rows);

  const warningRows = rows.filter((r) => r.warnings.length > 0);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 250, flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 180,
      renderCell: (params) => {
        const val = params.value as string;
        const isUnknown = val && !SUGGESTED_TYPES.includes(val.toUpperCase());
        if (isUnknown) {
          return (
            <Autocomplete
              size='small'
              freeSolo
              options={SUGGESTED_TYPES}
              value={val}
              onChange={(_, newVal) => {
                if (newVal) (rows[params.row.id as number] as ParsedInventoryRow).type = newVal;
              }}
              renderInput={(inputParams) => <TextField {...inputParams} variant='standard' sx={{ minWidth: 120 }} />}
              disableClearable
            />
          );
        }
        return <Chip size='small' label={val || '—'} />;
      }
    },
    { field: 'tag', headerName: 'Tag', width: 160 },
    { field: 'stationName', headerName: 'Station', width: 150 },
    { field: 'quantity', headerName: 'Qty', width: 60 },
    { field: 'uniqueId', headerName: 'Unique ID', width: 110 },
    { field: 'modelNumber', headerName: 'Model #', width: 120 },
    { field: 'imageUrl', headerName: 'Image URL', width: 200 },
    {
      field: 'zipImage',
      headerName: 'ZIP Image',
      width: 130,
      renderCell: (params) => {
        const match = imageMatches.find((m) => m.rowIndex === (params.row.id as number));
        if (!match) return null;
        return <Chip size='small' color='success' icon={<ImageIcon />} label={match.matchedBy === 'uniqueId' ? 'by ID' : 'by name'} />;
      }
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 180,
      renderCell: (params) => {
        const row = params.row as ParsedInventoryRow;
        const idx = params.row.id as number;
        if (row.existingItemId && row.matchedIsDeleted) {
          return (
            <FormControlLabel
              control={
                <Checkbox
                  size='small'
                  checked={reactivateSet.has(idx)}
                  onChange={() => {
                    setReactivateSet((prev) => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    });
                  }}
                  disabled={importing}
                />
              }
              label={<Chip size='small' color='warning' label='Deleted — Reactivate?' />}
            />
          );
        }
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

    const uploaderName = userProps?.idTokenParsed?.name || userProps?.idTokenParsed?.preferred_username || 'unknown';
    const uploaderSub = userProps?.subject;
    const summary: UploadSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
    const affectedItemIds: string[] = [];
    const fieldSnapshots: Array<{ itemId: string; action: string; before?: Record<string, unknown>; after?: Record<string, unknown> }> = [];
    /** Map row index → item ID for ZIP image uploads after import. */
    const rowToItemId = new Map<number, string>();

    // Build a lookup of existing items for before-snapshots
    const existingById = new Map<string, Record<string, unknown>>();
    for (const item of existingItems as any[]) {
      existingById.set(String(item.id), item);
    }

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(Math.round(((i + 1) / rows.length) * 100));

        try {
          if (row.existingItemId) {
            if (row.matchedIsDeleted && !reactivateSet.has(i)) {
              summary.skipped += 1;
              continue;
            }
            const beforeItem = existingById.get(row.existingItemId);
            const changes = buildUpdateChanges(row, selectedColumns, beforeItem as any);
            changes.lastModifiedBy = uploaderName;
            if (row.matchedIsDeleted && reactivateSet.has(i)) {
              changes.isDeleted = false;
            }
            const result = await client.mutate({
              mutation: UPDATE_INVENTORY_ITEM,
              variables: { item: row.existingItemId, changes }
            });
            const afterItem = result.data?.updateInventoryItem;
            const action = row.matchedIsDeleted && reactivateSet.has(i) ? 'REACTIVATE' : 'UPDATE';
            affectedItemIds.push(row.existingItemId);
            rowToItemId.set(i, row.existingItemId);
            fieldSnapshots.push({
              itemId: row.existingItemId,
              action,
              before: beforeItem ? { name: beforeItem.name, type: beforeItem.type, tags: beforeItem.tags } : undefined,
              after: afterItem ? { name: afterItem.name, type: afterItem.type, tags: afterItem.tags } : undefined
            });
            summary.updated += 1;
          } else {
            const input = buildCreateInput(row, selectedColumns);
            if (!input) {
              summary.skipped += 1;
              continue;
            }
            input.lastModifiedBy = uploaderName;
            const result = await client.mutate({
              mutation: CREATE_INVENTORY_ITEM,
              variables: { item: input }
            });
            const created = result.data?.createInventoryItem;
            if (created?.id) {
              affectedItemIds.push(created.id);
              rowToItemId.set(i, created.id);
              fieldSnapshots.push({
                itemId: created.id,
                action: 'CREATE',
                after: { name: created.name, type: created.type, tags: created.tags }
              });
            }
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

    // Record upload log
    try {
      await client.mutate({
        mutation: CREATE_UPLOAD_LOG,
        variables: {
          input: {
            uploaderName,
            uploaderSub,
            fileName,
            rowCount: rows.length,
            createdCount: summary.created,
            updatedCount: summary.updated,
            skippedCount: summary.skipped,
            failedCount: summary.errors.length,
            affectedItemIds,
            fieldSnapshots
          }
        }
      });
    } catch (e) {
      console.error('Failed to create upload log:', e);
    }

    // Upload matched ZIP images to S3 and set imageKey on items
    if (imageMatches.length > 0) {
      for (const match of imageMatches) {
        const itemId = rowToItemId.get(match.rowIndex);
        if (!itemId) continue;
        try {
          const uploadResult = await createUploadUrl({
            variables: {
              itemId,
              file: {
                filename: match.image.filename,
                contentType: match.image.contentType,
                size: match.image.blob.size
              }
            }
          });
          const upload = uploadResult.data?.createInventoryImageUploadUrl;
          if (!upload) continue;

          const response = await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': upload.contentType },
            body: match.image.blob
          });
          if (!response.ok) throw new Error(`S3 upload failed: ${response.statusText}`);

          await client.mutate({
            mutation: UPDATE_INVENTORY_ITEM,
            variables: { item: itemId, changes: { imageKey: upload.key } }
          });
        } catch (e) {
          console.error(`Failed to upload image for row ${match.rowIndex}:`, e);
          summary.errors.push(`Image "${match.image.filename}": ${e instanceof Error ? e.message : String(e)}`);
        }
      }
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

          {deletedMatchCount > 0 && (
            <Alert severity='warning'>
              {deletedMatchCount} row{deletedMatchCount > 1 ? 's match' : ' matches'} soft-deleted items. Check the
              ones you want to reactivate in the Action column.
            </Alert>
          )}

          {unknownStationNames.length > 0 && (
            <Alert severity='warning'>
              {unknownStationNames.length} station name{unknownStationNames.length > 1 ? 's were' : ' was'} not found
              and will be skipped: {unknownStationNames.join(', ')}
            </Alert>
          )}

          {(validation.errors > 0 || validation.warnings > 0) && (
            <Alert severity={validation.errors > 0 ? 'error' : 'warning'}>
              Validation: {validation.errors > 0 && `${validation.errors} error${validation.errors > 1 ? 's' : ''}`}
              {validation.errors > 0 && validation.warnings > 0 && ', '}
              {validation.warnings > 0 && `${validation.warnings} warning${validation.warnings > 1 ? 's' : ''}`}.
              Review the table below.
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

          <Box>
            <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
              Attach images (optional):
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              Upload a .zip of images named by Unique ID or equipment name (e.g. <code>INV-0042.jpg</code> or <code>Thermocycler.png</code>).
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Button
                variant='outlined'
                size='small'
                startIcon={<ImageIcon />}
                onClick={() => zipInputRef.current?.click()}
                disabled={importing}
              >
                {zipFileName ? 'Replace ZIP' : 'Attach image ZIP'}
              </Button>
              <input ref={zipInputRef} type='file' accept='.zip' style={{ display: 'none' }} onChange={handleZipFile} />
              {zipFileName && (
                <Typography variant='body2' color='text.secondary'>
                  {zipFileName}: {zipImages.length} image{zipImages.length !== 1 ? 's' : ''} found, {imageMatches.length} matched
                </Typography>
              )}
            </Stack>
            {unmatchedImages.length > 0 && (
              <Alert severity='warning' sx={{ mt: 1 }}>
                {unmatchedImages.length} image{unmatchedImages.length !== 1 ? 's' : ''} could not be matched to any row:{' '}
                {unmatchedImages.slice(0, 10).join(', ')}{unmatchedImages.length > 10 ? `, … and ${unmatchedImages.length - 10} more` : ''}
              </Alert>
            )}
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
