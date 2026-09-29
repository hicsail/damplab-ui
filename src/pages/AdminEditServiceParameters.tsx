import { useApolloClient } from '@apollo/client';
import {
  Alert,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppContext } from '../contexts/App';
import { UPDATE_SERVICE } from '../gql/queries';
import { ownParametersOf } from '../utils/serviceParameters';
import { ReadOnlyFieldset } from '../components/ReadOnlyFieldset';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';
import { EQUIPMENT_PARAM_DEFS } from '../controllers/ReactFlowEvents';
import ParameterListEditor from '../components/edit/parameters/ParameterListEditor';
import { EditableParameter, prepareParametersForSave, withDragKeys } from '../components/edit/parameters/parameterSave';

export default function AdminEditServiceParameters() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services, refreshCatalog } = useContext(AppContext);

  const service = useMemo(
    () => services.find((entry: any) => String(entry.id) === String(serviceId)),
    [serviceId, services]
  );

  const [parameters, setParameters] = useState<EditableParameter[]>([]);
  const [tableDataText, setTableDataText] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);

  useEffect(() => {
    if (!service) return;
    setParameters((prev) => (prev.length ? prev : withDragKeys(ownParametersOf(service))));
  }, [service]);

  // The five reserved equipment parameters, shown read-only above the service's
  // own list when the service is flagged for equipment use. Never added to
  // `parameters` state — they are injected at node creation (Task 7), not stored
  // on the service — so `handleSave` below needs no change to keep them off the
  // write-back payload. A def the service already declares itself is left alone,
  // mirroring withEquipmentParams's own rule.
  const reservedParameters = useMemo(
    () =>
      service?.equipmentUse === true
        ? EQUIPMENT_PARAM_DEFS.filter((def) => !parameters.some((p: any) => p?.id === def.id))
        : [],
    [service, parameters]
  );

  if (!service) {
    return (
      <Stack spacing={2}>
        <Button
          variant='outlined'
          size='small'
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/edit')}
          sx={{ alignSelf: 'flex-start' }}
        >
          Back to catalog
        </Button>
        <Alert severity='error'>Service not found.</Alert>
      </Stack>
    );
  }

  const handleSave = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const { parameters: prepared, errors } = prepareParametersForSave(parameters, tableDataText);
      if (errors.length) {
        setErrorMessage(errors.join(' '));
        return;
      }

      setIsSaving(true);
      await client.mutate({
        mutation: UPDATE_SERVICE,
        variables: {
          service: service.id,
          changes: {
            parameters: prepared
          }
        }
      });
      await refreshCatalog();
      setSuccessMessage('Parameters updated.');
    } catch (error) {
      console.error('Save parameters failed:', error);
      setErrorMessage(formatSaveError(error, 'these parameters'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Button
        variant='outlined'
        size='small'
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/edit')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to catalog
      </Button>
      <Typography variant='h2'>Full parameter editor</Typography>
      <Typography variant='h5'>{service.name}</Typography>
      <Typography variant='body1' color='text.secondary'>
        Edit each parameter using a form layout with clear fields.
      </Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity='success' sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <ReadOnlyFieldset canWrite={canWrite} noun='the service catalog'>
        <ParameterListEditor
          parameters={parameters}
          setParameters={setParameters}
          tableDataText={tableDataText}
          setTableDataText={setTableDataText}
          canWrite={canWrite}
          sampleSheetServiceId={String(service.id)}
          listHeader={
            reservedParameters.length > 0 ? (
              <>
                <Typography variant='subtitle2' sx={{ px: 1, pt: 1, color: 'text.secondary' }}>
                  Reserved (equipment use)
                </Typography>
                <List dense disablePadding>
                  {reservedParameters.map((def) => (
                    <ListItemButton key={def.id} disabled sx={{ pl: 2 }}>
                      <ListItemText primary={def.name} />
                    </ListItemButton>
                  ))}
                </List>
                <Divider />
              </>
            ) : null
          }
        />
      </ReadOnlyFieldset>

      {/* Outside the fieldset — see ReadOnlyFieldset. */}
      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
          {canWrite ? 'Cancel' : 'Back to catalog'}
        </Button>
        {canWrite && (
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save parameter changes'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
