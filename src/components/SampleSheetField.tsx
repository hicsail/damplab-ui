import { useState } from 'react';
import { Box, Button, Chip, FormHelperText, IconButton, Link as MuiLink, Stack } from '@mui/material';
import { DeleteForeverSharp } from '@mui/icons-material';
import { useApolloClient } from '@apollo/client';
import { GET_SAMPLE_SHEET_TEMPLATE_URL } from '../gql/queries';
import { formatGqlError } from '../utils/gqlError';
import { buildTableTemplate, checkTableFile, SAMPLE_SHEET_ACCEPT, SampleSheetError, TABLE_FILE_UNREADABLE_MESSAGE, TABLE_NOT_SET_UP_MESSAGE, tableTemplateFilename } from '../utils/sampleSheet';
import { expectedColumnsOf, hasStaffTemplate, sampleCountLabel, tableFileOf, tableIsSetUp } from '../utils/sampleSheetValue';

interface Props {
  /**
   * The Table parameter. Must carry the definition's `tableData` (its columns)
   * and `templateFile` (a legacy staff template), not only what a form entry copies.
   */
  param: any;
  value: unknown;
  /** The operation's service, for fetching a staff template. */
  serviceId?: string;
  readOnly?: boolean;
  /**
   * Whether a file can be picked here. True on the canvas and in the job editor
   * whenever it is not read-only; the editor uploads the file when it saves.
   */
  uploadable?: boolean;
  onChange: (next: unknown) => void;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Hands the browser a file to save, the way the catalog workbook download does. */
const saveBytes = (bytes: Uint8Array, filename: string): void => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * The staff-uploaded blank file, where one is stored. The only part of this
 * field that needs the Apollo client, so it is its own component: a Table
 * defined by columns renders with no provider at all.
 */
function StaffTemplateLink({ serviceId, parameterId, onError }: { serviceId: string; parameterId: string; onError: (message: string | null) => void }) {
  const client = useApolloClient();
  const download = async () => {
    onError(null);
    try {
      const { data } = await client.query({ query: GET_SAMPLE_SHEET_TEMPLATE_URL, variables: { serviceId, parameterId }, fetchPolicy: 'network-only' });
      const url = data?.sampleSheetTemplateUrl;
      if (url) window.open(url, '_blank', 'noopener');
      else onError('The template is not available right now.');
    } catch (err) {
      onError(formatGqlError(err, 'The template could not be fetched.'));
    }
  };
  return (
    <MuiLink component='button' type='button' variant='body2' onClick={() => void download()}>
      Download template
    </MuiLink>
  );
}

/**
 * A Table parameter on the form: download the template, pick the filled-in
 * file, see how many rows it has. The check made when a file is picked is a
 * preview of the one the server makes when the file is stored.
 */
export default function SampleSheetField({ param, value, serviceId, readOnly, uploadable = true, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The one file a Table holds — also when it arrives wrapped in an array (see tableFileOf).
  const stored = tableFileOf(value);
  const columns = expectedColumnsOf(param);
  const setUp = tableIsSetUp(param);
  const canPick = !readOnly && uploadable && setUp;

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const sampleCount = await checkTableFile(file, columns);
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
      setError(err instanceof SampleSheetError ? err.message : TABLE_FILE_UNREADABLE_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  // A staff-uploaded file, where one is stored, is served instead of the generated one.
  const templateLink =
    hasStaffTemplate(param) && serviceId ? (
      <StaffTemplateLink serviceId={serviceId} parameterId={param.id} onError={setError} />
    ) : columns.length > 0 ? (
      <MuiLink component='button' type='button' variant='body2' onClick={() => saveBytes(buildTableTemplate(columns), tableTemplateFilename(param.name))}>
        Download template
      </MuiLink>
    ) : null;

  const storedLine = stored ? (
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
  ) : null;

  // No columns and no staff template: it cannot be answered. A file already stored on it is still listed.
  if (!setUp) {
    return (
      <div style={{ marginTop: 12 }}>
        <FormHelperText sx={{ m: 0, fontWeight: 600 }}>{param.name}</FormHelperText>
        {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}
        <FormHelperText>{TABLE_NOT_SET_UP_MESSAGE}</FormHelperText>
        {storedLine}
      </div>
    );
  }

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
        {templateLink}
      </Stack>

      {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}

      {storedLine ?? <FormHelperText sx={{ mt: 0.5 }}>No spreadsheet attached yet.</FormHelperText>}

      {error && <FormHelperText error>{error}</FormHelperText>}
    </div>
  );
}
