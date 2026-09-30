import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import ParameterSetEditor from '../components/edit/ParameterSetEditor';
import { usedByLabel } from '../components/edit/parameterSetForm';
import { Can } from '../components/PermissionGate';
import { DELETE_PARAMETER_SET, UPDATE_PARAMETER_SET } from '../gql/mutations';
import { GET_PARAMETER_SET } from '../gql/queries';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatGqlError, formatSaveError } from '../utils/gqlError';

export default function AdminEditParameterSet() {
  const { id } = useParams<{ id: string }>();
  const client = useApolloClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const { data, loading, error: queryError, refetch } = useQuery(GET_PARAMETER_SET, { variables: { id }, fetchPolicy: 'network-only' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = data?.parameterSet;

  if (loading && !set) return <CircularProgress />;
  // A failed query and a not-found id both leave `set` undefined; distinguish
  // them so a network/permission failure doesn't read as "does not exist".
  if (!set) return <Alert severity='error'>{queryError ? formatGqlError(queryError) : 'Parameter set not found.'}</Alert>;

  const handleSave = async (payload: { name: string; description: string | null; parameters: any[] }) => {
    setSaving(true);
    setSaved(false);
    try {
      await client.mutate({ mutation: UPDATE_PARAMETER_SET, variables: { id, changes: payload } });
      await refetch();
      setError(null);
      setSaved(true);
    } catch (e) {
      setError(formatSaveError(e, 'this parameter set'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${set.name}"? This cannot be undone.`)) return;
    try {
      await client.mutate({ mutation: DELETE_PARAMETER_SET, variables: { id } });
      navigate('/edit', { state: { editType: 'Parameter Sets' } });
    } catch (e) {
      // Pin 8: an in-use set is refused server-side, naming the operations still using it.
      setError(formatSaveError(e, 'this parameter set'));
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>{set.name}</Typography>
      <Box>
        <Typography variant='subtitle2'>{usedByLabel(set.usedBy.length)}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {set.usedBy.map((op: { id: string; name: string }) => (
            <Chip key={op.id} label={op.name} onClick={() => navigate(`/edit/services/${op.id}`)} clickable size='small' />
          ))}
        </Box>
      </Box>
      {saved && <Alert severity='success'>Parameter set saved. Operations using it now show these parameters.</Alert>}
      <ParameterSetEditor
        key={set.updatedAt}
        initial={set}
        lockSavedIds
        canWrite={canWrite}
        saving={saving}
        saveLabel='Save parameter set'
        onSave={handleSave}
        errorMessage={error}
        extraActions={
          <Can permission={PERMISSIONS.CatalogEditorWrite}>
            <Button color='error' variant='outlined' onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          </Can>
        }
      />
    </Stack>
  );
}
