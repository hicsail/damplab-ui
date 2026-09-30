import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import ParameterSetEditor from '../components/edit/ParameterSetEditor';
import { RequirePermissionOrRedirect } from '../components/PermissionGate';
import { CREATE_PARAMETER_SET } from '../gql/mutations';
import { PERMISSIONS } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

function AdminNewParameterSetForm() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (payload: { name: string; description: string | null; parameters: any[] }) => {
    setSaving(true);
    try {
      const result = await client.mutate({ mutation: CREATE_PARAMETER_SET, variables: { parameterSet: payload } });
      navigate(`/edit/parameter-sets/${result.data.createParameterSet.id}`);
    } catch (e) {
      setError(formatSaveError(e, 'this parameter set'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>New parameter set</Typography>
      <Typography color='text.secondary'>Operations that use this set get all of its parameters, and stay in step when you edit it.</Typography>
      <ParameterSetEditor lockSavedIds={false} canWrite saving={saving} saveLabel='Create parameter set' onSave={handleSave} errorMessage={error} />
    </Stack>
  );
}

/**
 * A creation page has nothing to render read-only — it is an empty form whose only
 * purpose is a mutation. So this bounces rather than disabling, same as
 * AdminNewService / AdminNewBundle. The Add button that leads here is already
 * hidden by `canWrite` on the grid toolbar; this is what a typed URL hits.
 */
export default function AdminNewParameterSet() {
  return (
    <RequirePermissionOrRedirect permission={PERMISSIONS.CatalogEditorWrite}>
      <AdminNewParameterSetForm />
    </RequirePermissionOrRedirect>
  );
}
