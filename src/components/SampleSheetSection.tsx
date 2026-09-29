import { useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, List, ListItem, ListItemText, Link as MuiLink, Typography } from '@mui/material';
import { useMutation } from '@apollo/client';
import { CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS, REPLACE_SAMPLE_SHEET } from '../gql/mutations';
import { formatSaveError } from '../utils/gqlError';
import { countSampleSheetFile, SAMPLE_SHEET_ACCEPT, sampleCountLabel, SampleSheetError } from '../utils/sampleSheet';
import type { SampleSheetSlot } from './JobWorkflowCards';

interface Props {
  jobId: string;
  slots: SampleSheetSlot[];
  /** Presentation only — the server re-checks the caller and the job's state. */
  canEdit: boolean;
  /** Refetch the job once a sheet has been replaced. */
  onChanged: () => Promise<unknown> | void;
}

/**
 * The samples spreadsheets on a job, on both the customer's and the lab's
 * view. Either side can upload a new version here at any point until the job
 * is closed; the new file is counted in this browser and stored with its count.
 */
/**
 * The replace flow, shared by the section below and the inline button on a
 * workflow card: count in this browser, presign, PUT, then point the node at
 * the new key. The count is what the operation is priced on when the service
 * is priced by parameter, so it is read before anything is uploaded.
 */
export function useSampleSheetUpload(jobId: string, onChanged: () => Promise<unknown> | void) {
  const [createUploadUrls] = useMutation(CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS);
  const [replaceSampleSheet] = useMutation(REPLACE_SAMPLE_SHEET);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (slot: SampleSheetSlot, file: File | undefined) => {
    if (!file) return;
    const slotKey = `${slot.nodeDbId}:${slot.parameterId}`;
    setError(null);
    setBusyKey(slotKey);
    try {
      const sampleCount = await countSampleSheetFile(file);
      const contentType = file.type || 'application/octet-stream';

      const { data } = await createUploadUrls({
        variables: { files: [{ clientToken: slotKey, filename: file.name, contentType, size: file.size }] }
      });
      const presigned = data?.createWorkflowParameterUploadUrls?.[0];
      if (!presigned?.uploadUrl) throw new Error('The server did not return an upload URL.');

      const response = await fetch(presigned.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!response.ok) throw new Error(`The file could not be uploaded (${response.status}).`);

      await replaceSampleSheet({
        variables: {
          input: {
            jobId,
            nodeId: slot.nodeDbId,
            parameterId: slot.parameterId,
            file: { key: presigned.key, filename: file.name, contentType, size: file.size, sampleCount }
          }
        }
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof SampleSheetError ? err.message : formatSaveError(err, 'this spreadsheet'));
    } finally {
      setBusyKey(null);
    }
  };

  return { upload, busyKey, error, clearError: () => setError(null) };
}

function UploadButton({ slot, busy, disabled, onPick }: { slot: SampleSheetSlot; busy: boolean; disabled?: boolean; onPick: (file: File | undefined) => void }) {
  return (
    <Button component='label' size='small' disabled={busy || disabled} startIcon={busy ? <CircularProgress size={14} /> : undefined} sx={{ textTransform: 'none', py: 0, minHeight: 0 }}>
      {busy ? 'Uploading…' : slot.filename ? 'Replace' : 'Upload'}
      <input hidden type='file' accept={SAMPLE_SHEET_ACCEPT} onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ''; }} />
    </Button>
  );
}

/** The Replace/Upload control on one operation's samples line in a workflow card. */
export function SampleSheetReplaceButton({ jobId, slot, onChanged }: { jobId: string; slot: SampleSheetSlot; onChanged: () => Promise<unknown> | void }) {
  const { upload, busyKey, error, clearError } = useSampleSheetUpload(jobId, onChanged);
  return (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      <UploadButton slot={slot} busy={busyKey !== null} onPick={(file) => void upload(slot, file)} />
      {error && (
        <Typography component='span' variant='caption' color='error' onClick={clearError} sx={{ cursor: 'pointer' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The samples spreadsheets on a job, on both the customer's and the lab's
 * view. Either side can upload a new version here at any point until the job
 * is closed; the new file is counted in this browser and stored with its count.
 */
export default function SampleSheetSection({ jobId, slots, canEdit, onChanged }: Props) {
  const { upload, busyKey, error, clearError } = useSampleSheetUpload(jobId, onChanged);

  if (!slots.length) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant='subtitle2' sx={{ mb: 1 }}>Samples Spreadsheets</Typography>
      {error && (
        <Alert severity='error' sx={{ mb: 1 }} onClose={clearError}>{error}</Alert>
      )}
      <List dense>
        {slots.map((slot) => {
          const slotKey = `${slot.nodeDbId}:${slot.parameterId}`;
          const busy = busyKey === slotKey;
          return (
            <ListItem
              key={slotKey}
              sx={{ pl: 0 }}
              secondaryAction={canEdit ? <UploadButton slot={slot} busy={busy} onPick={(file) => void upload(slot, file)} /> : undefined}
            >
              <ListItemText
                primary={
                  <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {slot.filename ? (
                      slot.url ? <MuiLink href={slot.url} target='_blank' rel='noopener noreferrer'>{slot.filename}</MuiLink> : slot.filename
                    ) : (
                      'No spreadsheet uploaded yet'
                    )}
                    {slot.sampleCount !== undefined && <Chip size='small' label={sampleCountLabel(slot.sampleCount)} />}
                  </Box>
                }
                secondary={`${slot.nodeLabel} - ${slot.parameterName}`}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
