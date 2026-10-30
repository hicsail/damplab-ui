import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useCallback, useRef, useState } from 'react';
import { GET_INVENTORY_ITEMS, UPDATE_INVENTORY_ITEM } from '../../gql/queries';
import { CREATE_INVENTORY_IMAGE_UPLOAD_URL } from '../../gql/mutations';

interface InventoryOption {
  id: string;
  label: string;
  uniqueId?: string;
}

interface ImageEntry {
  file: File;
  previewUrl: string;
  /** Auto-matched or manually assigned item ID. */
  assignedItemId: string | null;
  /** How it was matched. */
  matchMethod: 'uniqueId' | 'name' | 'manual' | null;
  /** Upload status. */
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}

interface InventoryBatchImageDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (uploaded: number, failed: number) => void;
}

const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

function matchFileName(baseName: string, items: InventoryOption[]): { itemId: string; method: 'uniqueId' | 'name' } | null {
  const key = baseName.trim().toLowerCase();
  // Match by uniqueId first
  for (const item of items) {
    if (item.uniqueId && item.uniqueId.trim().toLowerCase() === key) {
      return { itemId: item.id, method: 'uniqueId' };
    }
  }
  // Match by name
  for (const item of items) {
    if (item.label.trim().toLowerCase() === key) {
      return { itemId: item.id, method: 'name' };
    }
  }
  return null;
}

export default function InventoryBatchImageDialog({ open, onClose, onComplete }: InventoryBatchImageDialogProps) {
  const client = useApolloClient();
  const { data: inventoryData } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const [createUploadUrl] = useMutation(CREATE_INVENTORY_IMAGE_UPLOAD_URL);
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items: InventoryOption[] = (inventoryData?.inventoryItems ?? [])
    .filter((item: any) => !item.isDeleted)
    .map((item: any) => ({
      id: item.id,
      label: item.name,
      uniqueId: item.uniqueId
    }));

  // Items already assigned to an entry (to prevent double-assignment)
  const assignedItemIds = new Set(entries.map((e) => e.assignedItemId).filter(Boolean));

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => IMAGE_ACCEPT.includes(f.type));
    if (imageFiles.length === 0) return;

    const newEntries: ImageEntry[] = imageFiles.map((file) => {
      const dotIdx = file.name.lastIndexOf('.');
      const baseName = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name;
      const match = matchFileName(baseName, items);

      return {
        file,
        previewUrl: URL.createObjectURL(file),
        assignedItemId: match?.itemId ?? null,
        matchMethod: match?.method ?? null,
        status: 'pending' as const
      };
    });

    setEntries((prev) => [...prev, ...newEntries]);
  }, [items]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    addFiles(files);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const assignItem = (index: number, itemId: string | null) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, assignedItemId: itemId, matchMethod: itemId ? 'manual' : null } : entry
      )
    );
  };

  const assignedCount = entries.filter((e) => e.assignedItemId).length;
  const unassignedCount = entries.length - assignedCount;

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    let uploaded = 0;
    let failed = 0;

    const toUpload = entries.filter((e) => e.assignedItemId);

    for (let i = 0; i < toUpload.length; i++) {
      const entry = toUpload[i];
      const entryIdx = entries.indexOf(entry);
      setProgress(Math.round(((i + 1) / toUpload.length) * 100));

      setEntries((prev) =>
        prev.map((e, idx) => (idx === entryIdx ? { ...e, status: 'uploading' } : e))
      );

      try {
        const result = await createUploadUrl({
          variables: {
            itemId: entry.assignedItemId,
            file: {
              filename: entry.file.name,
              contentType: entry.file.type || 'application/octet-stream',
              size: entry.file.size
            }
          }
        });
        const upload = result.data?.createInventoryImageUploadUrl;
        if (!upload) throw new Error('Failed to get upload URL');

        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': upload.contentType },
          body: entry.file
        });
        if (!response.ok) throw new Error(`S3 upload failed: ${response.statusText}`);

        await client.mutate({
          mutation: UPDATE_INVENTORY_ITEM,
          variables: { item: entry.assignedItemId, changes: { imageKey: upload.key } }
        });

        setEntries((prev) =>
          prev.map((e, idx) => (idx === entryIdx ? { ...e, status: 'done' } : e))
        );
        uploaded++;
      } catch (e) {
        console.error(`Image upload failed for ${entry.file.name}:`, e);
        setEntries((prev) =>
          prev.map((en, idx) =>
            idx === entryIdx ? { ...en, status: 'error', errorMessage: e instanceof Error ? e.message : String(e) } : en
          )
        );
        failed++;
      }
    }

    setIsUploading(false);
    onComplete(uploaded, failed);
  };

  const handleClose = () => {
    if (isUploading) return;
    // Clean up object URLs
    for (const entry of entries) URL.revokeObjectURL(entry.previewUrl);
    setEntries([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={isUploading ? undefined : handleClose} maxWidth='md' fullWidth>
      <DialogTitle>Batch Upload Equipment Images</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Drag and drop images or click to browse. Images named by Unique ID (e.g. <code>INV-0042.jpg</code>)
            or equipment name (e.g. <code>Thermocycler.png</code>) are auto-matched. You can also assign them manually.
          </Typography>

          {/* Drop zone */}
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: isDragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: isUploading ? 'default' : 'pointer',
              bgcolor: isDragOver ? 'action.hover' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: 'action.active', mb: 1 }} />
            <Typography variant='body1' color='text.secondary'>
              {isDragOver ? 'Drop images here' : 'Drag & drop images here, or click to browse'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Accepts JPEG, PNG, WebP
            </Typography>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              multiple
              hidden
              onChange={handleFileInput}
            />
          </Box>

          {/* Stats */}
          {entries.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${entries.length} image${entries.length !== 1 ? 's' : ''}`} />
              <Chip label={`${assignedCount} matched`} color='success' variant='outlined' />
              {unassignedCount > 0 && (
                <Chip label={`${unassignedCount} unassigned`} color='warning' variant='outlined' />
              )}
            </Box>
          )}

          {error && <Alert severity='error'>{error}</Alert>}

          {isUploading && (
            <Box>
              <LinearProgress variant='determinate' value={progress} />
              <Typography variant='caption' color='text.secondary'>
                Uploading… {progress}%
              </Typography>
            </Box>
          )}

          {/* Image list */}
          {entries.length > 0 && (
            <Stack spacing={1.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {entries.map((entry, index) => (
                <Stack
                  key={`${entry.file.name}-${index}`}
                  direction='row'
                  spacing={1.5}
                  alignItems='center'
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: entry.status === 'done' ? 'success.50' : entry.status === 'error' ? 'error.50' : 'grey.50',
                    border: '1px solid',
                    borderColor: entry.status === 'done' ? 'success.200' : entry.status === 'error' ? 'error.200' : 'divider'
                  }}
                >
                  {/* Thumbnail */}
                  <Box
                    component='img'
                    src={entry.previewUrl}
                    alt={entry.file.name}
                    sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                  />

                  {/* Filename */}
                  <Box sx={{ minWidth: 120, flexShrink: 0 }}>
                    <Typography variant='body2' noWrap sx={{ maxWidth: 140 }}>
                      {entry.file.name}
                    </Typography>
                    {entry.matchMethod && entry.matchMethod !== 'manual' && (
                      <Typography variant='caption' color='success.main'>
                        auto-matched by {entry.matchMethod === 'uniqueId' ? 'ID' : 'name'}
                      </Typography>
                    )}
                  </Box>

                  {/* Assignment dropdown */}
                  <Autocomplete
                    size='small'
                    options={items.filter((item) => !assignedItemIds.has(item.id) || item.id === entry.assignedItemId)}
                    getOptionLabel={(opt) => `${opt.label}${opt.uniqueId ? ` (${opt.uniqueId})` : ''}`}
                    value={items.find((item) => item.id === entry.assignedItemId) ?? null}
                    onChange={(_, newVal) => assignItem(index, newVal?.id ?? null)}
                    renderInput={(params) => <TextField {...params} placeholder='Assign to equipment…' variant='outlined' />}
                    disabled={isUploading || entry.status === 'done'}
                    sx={{ flex: 1, minWidth: 200 }}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  />

                  {/* Status indicator */}
                  {entry.status === 'uploading' && <CircularProgress size={20} />}
                  {entry.status === 'done' && <CheckCircleIcon color='success' />}
                  {entry.status === 'error' && (
                    <Tooltip title={entry.errorMessage ?? 'Upload failed'}>
                      <WarningIcon color='error' />
                    </Tooltip>
                  )}

                  {/* Remove button */}
                  {entry.status === 'pending' && !isUploading && (
                    <Tooltip title='Remove'>
                      <IconButton size='small' onClick={() => removeEntry(index)}>
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          {entries.some((e) => e.status === 'done') ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant='contained'
          onClick={handleUpload}
          disabled={isUploading || assignedCount === 0}
        >
          {isUploading ? 'Uploading…' : `Upload ${assignedCount} image${assignedCount !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
