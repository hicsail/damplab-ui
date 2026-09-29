import { useState } from 'react';
import { Box, Button, Chip, FormHelperText, IconButton, Link as MuiLink, Stack } from '@mui/material';
import { DeleteForeverSharp } from '@mui/icons-material';
import { useApolloClient } from '@apollo/client';
import { GET_SAMPLE_SHEET_TEMPLATE_URL } from '../gql/queries';
import { formatGqlError } from '../utils/gqlError';
import { countSampleSheetFile, parseSampleSheetValue, SAMPLE_SHEET_ACCEPT, sampleCountLabel, SampleSheetError } from '../utils/sampleSheet';

interface Props {
  param: any;
  value: unknown;
  /** The operation's service, for fetching the blank template. */
  serviceId?: string;
  readOnly?: boolean;
  /**
   * Whether a file can be picked here. True on the canvas, where files are
   * uploaded at submission; false in the job editor, which has no upload step —
   * there the sheet is replaced from the job page instead.
   */
  uploadable?: boolean;
  onChange: (next: unknown) => void;
}

/**
 * The samples spreadsheet parameter on the canvas: download the template, pick
 * the filled-in file, see how many rows it has.
 */
export default function SampleSheetField({ param, value, serviceId, readOnly, uploadable = true, onChange }: Props) {
  const client = useApolloClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stored = parseSampleSheetValue(value);
  const hasTemplate = !!param?.templateFile?.key;
  const canPick = !readOnly && uploadable;

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const sampleCount = await countSampleSheetFile(file);
      onChange({
        __kind: 'pending-file',
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        sampleCount
      });
    } catch (err) {
      setError(err instanceof SampleSheetError ? err.message : 'That file could not be read as a spreadsheet.');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    if (!serviceId) return;
    setError(null);
    try {
      const { data } = await client.query({
        query: GET_SAMPLE_SHEET_TEMPLATE_URL,
        variables: { serviceId, parameterId: param.id },
        fetchPolicy: 'network-only'
      });
      const url = data?.sampleSheetTemplateUrl;
      if (url) window.open(url, '_blank', 'noopener');
      else setError('The template is not available right now.');
    } catch (err) {
      setError(formatGqlError(err, 'The template could not be fetched.'));
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
        {canPick ? (
          <Button variant='outlined' component='label' size='small' disabled={busy} sx={{ textTransform: 'none' }}>
            {busy ? 'Reading…' : stored ? `Replace ${param.name}` : param.name}
            <input hidden type='file' accept={SAMPLE_SHEET_ACCEPT} onChange={(e) => { void handlePick(e.target.files?.[0]); e.currentTarget.value = ''; }} />
          </Button>
        ) : (
          <FormHelperText sx={{ m: 0, fontWeight: 600 }}>{param.name}</FormHelperText>
        )}
        {hasTemplate && serviceId && (
          <MuiLink component='button' type='button' variant='body2' onClick={() => void downloadTemplate()}>
            Download template
          </MuiLink>
        )}
      </Stack>

      {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}

      {stored ? (
        <Box display='flex' alignItems='center' gap={0.75} sx={{ mt: 0.5 }} flexWrap='wrap'>
          <FormHelperText sx={{ m: 0 }}>
            {stored.url ? <MuiLink href={stored.url} target='_blank' rel='noopener noreferrer'>{stored.filename}</MuiLink> : stored.filename}
          </FormHelperText>
          {stored.sampleCount !== undefined && <Chip size='small' label={sampleCountLabel(stored.sampleCount)} />}
          {canPick && (
            <IconButton size='small' onClick={() => { setError(null); onChange(null); }} aria-label='Remove spreadsheet'>
              <DeleteForeverSharp fontSize='small' />
            </IconButton>
          )}
        </Box>
      ) : (
        <FormHelperText sx={{ mt: 0.5 }}>No spreadsheet attached yet.</FormHelperText>
      )}

      {!uploadable && !readOnly && <FormHelperText>Upload or replace the spreadsheet from the job page.</FormHelperText>}
      {error && <FormHelperText error>{error}</FormHelperText>}
    </div>
  );
}
