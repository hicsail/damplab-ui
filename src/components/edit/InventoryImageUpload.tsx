import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CREATE_INVENTORY_IMAGE_UPLOAD_URL } from '../../gql/mutations';

export interface InventoryImageUploadProps {
  /** Item ID — undefined for new items (image upload deferred until after create). */
  itemId?: string;
  /** Existing pre-signed download URL from the query. */
  currentImageUrl?: string | null;
  /** Current S3 key (so parent knows if an image already exists). */
  currentImageKey?: string | null;
  /** Called with new imageKey after upload, or null when removed. */
  onImageKeyChange: (key: string | null) => void;
  /** Called with the staged file when no itemId yet (create form). */
  onFileStaged?: (file: File | null) => void;
}

export default function InventoryImageUpload({
  itemId,
  currentImageUrl,
  currentImageKey,
  onImageKeyChange,
  onFileStaged
}: InventoryImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createUploadUrl] = useMutation(CREATE_INVENTORY_IMAGE_UPLOAD_URL);

  const hasImage = !!(localPreview || currentImageUrl);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    if (!itemId) {
      // No item yet (create form) — stage the file for later upload
      onFileStaged?.(file);
      return;
    }

    // Upload immediately for existing items
    await uploadFile(file, itemId);
  };

  const uploadFile = async (file: File, targetItemId: string) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await createUploadUrl({
        variables: {
          itemId: targetItemId,
          file: {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size
          }
        }
      });

      const upload = result.data?.createInventoryImageUploadUrl;
      if (!upload) throw new Error('Failed to get upload URL');

      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': upload.contentType },
        body: file
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      onImageKeyChange(upload.key);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload image. Please try again.');
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    setError(null);
    onImageKeyChange(null);
    onFileStaged?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayUrl = localPreview || currentImageUrl;

  return (
    <Box>
      <Typography variant='subtitle1' sx={{ mb: 0.5 }}>Equipment Image</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
        Upload a photo of this equipment. Accepted formats: JPEG, PNG, WebP.
      </Typography>

      {error && <Alert severity='error' sx={{ mb: 1.5 }}>{error}</Alert>}

      {hasImage && displayUrl && (
        <Stack direction='row' spacing={1} alignItems='flex-start' sx={{ mb: 1.5 }}>
          <Box
            component='img'
            src={displayUrl}
            alt='Equipment image'
            sx={{
              maxWidth: 240,
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          />
          <Tooltip title='Remove image'>
            <IconButton size='small' onClick={handleRemove} disabled={isUploading}>
              <DeleteOutlineIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      <Stack direction='row' spacing={1} alignItems='center'>
        <Button
          component='label'
          variant='outlined'
          size='small'
          startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          disabled={isUploading}
        >
          {hasImage ? 'Replace image' : 'Upload image'}
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            hidden
            onChange={handleFileSelect}
          />
        </Button>
        {isUploading && (
          <Typography variant='caption' color='text.secondary'>Uploading…</Typography>
        )}
      </Stack>
    </Box>
  );
}

/**
 * Helper to upload a staged file after item creation.
 * Call this from the create form after the item is created.
 *
 * @param createUploadUrlFn - The Apollo mutate function for `CREATE_INVENTORY_IMAGE_UPLOAD_URL`
 * @param updateItemFn - A function that accepts `{ variables }` and updates the item (e.g. `client.mutate` wrapper)
 */
export async function uploadStagedImage(
  file: File,
  itemId: string,
  createUploadUrlFn: (opts: { variables: Record<string, unknown> }) => Promise<{ data?: Record<string, any> }>,
  updateItemFn: (opts: { variables: Record<string, unknown> }) => Promise<unknown>
): Promise<void> {
  const result = await createUploadUrlFn({
    variables: {
      itemId,
      file: {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size
      }
    }
  });

  const upload = result.data?.createInventoryImageUploadUrl;
  if (!upload) throw new Error('Failed to get upload URL');

  const response = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': upload.contentType },
    body: file
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

  await updateItemFn({
    variables: {
      item: itemId,
      changes: { imageKey: upload.key }
    }
  });
}
