import { useApolloClient } from '@apollo/client';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppContext } from '../contexts/App';
import { UPDATE_BUNDLE } from '../gql/queries';
import { ReadOnlyFieldset } from '../components/ReadOnlyFieldset';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';
import BundleStepsEditor from '../components/edit/BundleStepsEditor';
import { BundleStep, firstEmptyStepIndex, serviceIdsFromSteps, stepsFromServiceIds } from '../components/edit/bundleSteps';

export default function AdminEditBundle() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { bundles, services, refreshCatalog } = useContext(AppContext);

  const bundle = useMemo(
    () => bundles.find((entry: any) => String(entry.id) === String(bundleId)),
    [bundleId, bundles]
  );

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [steps, setSteps] = useState<BundleStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);

  const availableServices = useMemo(
    () => services.map((service: any) => ({ id: String(service.id), name: String(service.name) })),
    [services]
  );

  useEffect(() => {
    if (!bundle) return;
    setLabel(bundle.label ?? '');
    setIcon(bundle.icon ?? '');
    // The resolver returns one entry per stored id, in order, repeats included —
    // so a bundle that runs an operation twice hydrates as two steps.
    setSteps(stepsFromServiceIds((bundle.services ?? []).map((service: any) => String(service.id))));
  }, [bundle]);

  const handleSave = async () => {
    if (!bundle) return;
    setErrorMessage(null);
    if (!label.trim()) {
      setErrorMessage('Bundle name is required.');
      return;
    }
    // An unfilled step would otherwise be dropped silently on save, leaving a
    // bundle shorter than the one on screen.
    const emptyStep = firstEmptyStepIndex(steps);
    if (emptyStep !== -1) {
      setErrorMessage(`Step ${emptyStep + 1} has no operation selected.`);
      return;
    }
    try {
      setIsSaving(true);
      await client.mutate({
        mutation: UPDATE_BUNDLE,
        variables: {
          bundle: bundle.id,
          changes: {
            label: label.trim(),
            icon: icon.trim(),
            services: serviceIdsFromSteps(steps)
          }
        }
      });
      await refreshCatalog();
      navigate('/edit');
    } catch (error) {
      console.error('Save bundle failed:', error);
      setErrorMessage(formatSaveError(error, 'this bundle'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!bundle) {
    return <Alert severity='error'>Bundle not found.</Alert>;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Typography variant='h2'>Edit bundle</Typography>
      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <ReadOnlyFieldset canWrite={canWrite} noun='the service catalog'>

      <TextField label='Bundle name' value={label} onChange={(event) => setLabel(event.target.value)} required />
      <TextField
        label='Icon (optional)'
        value={icon}
        onChange={(event) => setIcon(event.target.value)}
        helperText='Keep blank unless you use bundle icons.'
      />

      <BundleStepsEditor steps={steps} onChange={setSteps} availableServices={availableServices} disabled={isSaving || !canWrite} />

      </ReadOnlyFieldset>

      <Box>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
            {canWrite ? 'Cancel' : 'Back to catalog'}
          </Button>
          {canWrite && (
            <Button variant='contained' onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
