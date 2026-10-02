import { useState } from 'react';
import { Alert, Button, Link as MuiLink, Stack, Typography } from '@mui/material';
import { useApolloClient, useMutation } from '@apollo/client';
import { SAMPLE_SHEET_TEMPLATE_UPLOAD_URL } from '../../gql/mutations';
import { GET_PARAMETER_SET_SAMPLE_SHEET_TEMPLATE_URL, GET_SAMPLE_SHEET_TEMPLATE_URL } from '../../gql/queries';
import { formatSaveError } from '../../utils/gqlError';
import { SAMPLE_SHEET_ACCEPT } from '../../utils/sampleSheet';

/**
 * Where the parameter is saved, which is where its stored template is read
 * back from. A Parameter Set that has not been saved yet has no id.
 */
export type SampleSheetTemplateOwner = { serviceId: string } | { parameterSetId: string | undefined };

interface Props {
  owner: SampleSheetTemplateOwner;
  parameter: any;
  canWrite: boolean;
  /** Patches the parameter being edited; saved with the rest on Save. */
  onChange: (patch: Record<string, any>) => void;
}

/**
 * The blank template on a samples-spreadsheet parameter. The file is uploaded
 * as soon as it is chosen, but the reference is only patched onto the
 * parameter, so nothing is live until the parameters are saved.
 */
export default function SampleSheetTemplateField({ owner, parameter, canWrite, onChange }: Props) {
  const client = useApolloClient();
  const [templateUploadUrl] = useMutation(SAMPLE_SHEET_TEMPLATE_UPLOAD_URL);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const template = parameter?.templateFile;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const contentType = file.type || 'application/octet-stream';
      const { data } = await templateUploadUrl({ variables: { input: { filename: file.name, contentType, size: file.size } } });
      const upload = data?.sampleSheetTemplateUploadUrl;
      if (!upload?.uploadUrl) throw new Error('The server did not return an upload URL.');

      const response = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!response.ok) throw new Error(`The template could not be uploaded (${response.status}).`);

      onChange({ templateFile: { key: upload.key, filename: file.name, contentType, size: file.size } });
    } catch (err) {
      setError(formatSaveError(err, 'this template'));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setError(null);
    const notSaved = 'That template is not available yet. Save the parameters first.';
    try {
      let url: string | null | undefined;
      if ('serviceId' in owner) {
        const { data } = await client.query({
          query: GET_SAMPLE_SHEET_TEMPLATE_URL,
          variables: { serviceId: owner.serviceId, parameterId: parameter?.id },
          fetchPolicy: 'network-only'
        });
        url = data?.sampleSheetTemplateUrl;
      } else if (owner.parameterSetId) {
        const { data } = await client.query({
          query: GET_PARAMETER_SET_SAMPLE_SHEET_TEMPLATE_URL,
          variables: { parameterSetId: owner.parameterSetId, parameterId: parameter?.id },
          fetchPolicy: 'network-only'
        });
        url = data?.parameterSetSampleSheetTemplateUrl;
      }
      if (url) window.open(url, '_blank', 'noopener');
      else setError(notSaved);
    } catch (err) {
      setError(formatSaveError(err, 'this template'));
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant='body2' color='text.secondary'>
        Customers download this blank template, fill in one row per sample, and attach it to the operation. The number of rows below the header is the sample
        count, so keep the column headings in the first row with nothing above them. When the operation's pricing is “Based on selected options”, this
        parameter's price is charged once per sample row, at the customer's category.
      </Typography>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
        <Button variant='outlined' component='label' size='small' disabled={!canWrite || busy} sx={{ textTransform: 'none' }}>
          {busy ? 'Uploading…' : template ? 'Replace template' : 'Upload template'}
          <input hidden type='file' accept={SAMPLE_SHEET_ACCEPT} onChange={(e) => { void pick(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </Button>
        {template?.filename ? (
          <Typography variant='body2'>
            {template.filename}{' '}
            <MuiLink component='button' type='button' variant='body2' onClick={() => void download()}>(download)</MuiLink>
          </Typography>
        ) : (
          <Typography variant='body2' color='text.secondary'>No template attached yet.</Typography>
        )}
      </Stack>
    </Stack>
  );
}
