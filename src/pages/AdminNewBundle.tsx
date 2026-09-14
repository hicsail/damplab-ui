import { useApolloClient } from '@apollo/client';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppContext } from '../contexts/App';
import { CREATE_BUNDLE } from '../gql/queries';
import { RequirePermissionOrRedirect } from '../components/PermissionGate';
import { PERMISSIONS } from '../hooks/usePermissions';
import BundleStepsEditor from '../components/edit/BundleStepsEditor';
import { BundleStep, firstEmptyStepIndex, serviceIdsFromSteps } from '../components/edit/bundleSteps';

function AdminNewBundleForm() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services, refreshCatalog } = useContext(AppContext);

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [steps, setSteps] = useState<BundleStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableServices = useMemo(
    () => services.map((service: any) => ({ id: String(service.id), name: String(service.name) })),
    [services]
  );

  const handleSave = async () => {
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
        mutation: CREATE_BUNDLE,
        variables: {
          bundle: {
            label: label.trim(),
            icon: icon.trim(),
            services: serviceIdsFromSteps(steps)
          }
        }
      });
      await refreshCatalog();
      navigate('/edit');
    } catch (_error) {
      setErrorMessage('Unable to create bundle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Typography variant='h2'>Add new bundle</Typography>
      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <TextField label='Bundle name' value={label} onChange={(event) => setLabel(event.target.value)} required />
      <TextField
        label='Icon (optional)'
        value={icon}
        onChange={(event) => setIcon(event.target.value)}
        helperText='Keep blank unless you use bundle icons.'
      />

      <BundleStepsEditor steps={steps} onChange={setSteps} availableServices={availableServices} disabled={isSaving} />

      <Box>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save bundle'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}

/**
 * A creation page has nothing to render read-only — it is an empty form whose only
 * purpose is a mutation. So this bounces rather than disabling. The Add button that
 * leads here is already hidden; this is what a typed URL hits.
 */
export default function AdminNewBundle() {
  return (
    <RequirePermissionOrRedirect permission={PERMISSIONS.CatalogEditorWrite}>
      <AdminNewBundleForm />
    </RequirePermissionOrRedirect>
  );
}
