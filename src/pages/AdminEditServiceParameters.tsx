import { useApolloClient } from '@apollo/client';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { GridRenderEditCellParams } from '@mui/x-data-grid';
import { MutableRefObject, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { EditParametersTable } from '../components/edit/parameters/EditParametersTable';
import { AppContext } from '../contexts/App';
import { UPDATE_SERVICE } from '../gql/queries';

export default function AdminEditServiceParameters() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services } = useContext(AppContext);

  const service = useMemo(
    () => services.find((entry: any) => String(entry.id) === String(serviceId)),
    [serviceId, services]
  );

  const [parameters, setParameters] = useState<any[]>(service?.parameters ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mockParentGridRef = useRef({
    setEditCellValue: ({ value }: { value: any[] }) => {
      setParameters(value ?? []);
    }
  }) as MutableRefObject<any>;

  const editParams = useMemo(
    () =>
      ({
        id: serviceId ?? '',
        field: 'parameters',
        value: parameters
      }) as GridRenderEditCellParams,
    [parameters, serviceId]
  );

  if (!service) {
    return <Alert severity='error'>Service not found.</Alert>;
  }

  const handleSave = async () => {
    try {
      setErrorMessage(null);
      setIsSaving(true);
      await client.mutate({
        mutation: UPDATE_SERVICE,
        variables: {
          service: service.id,
          changes: {
            parameters
          }
        }
      });
      await client.resetStore();
      navigate('/edit');
    } catch (error) {
      setErrorMessage('Unable to save parameter changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>Full parameter editor</Typography>
      <Typography variant='h5'>{service.name}</Typography>
      <Typography variant='body1' color='text.secondary'>
        Use this page for a larger workspace when updating parameter details.
      </Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <EditParametersTable
        viewParams={null}
        editParams={editParams}
        gridRef={mockParentGridRef}
      />

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save parameter changes'}
        </Button>
      </Stack>
    </Stack>
  );
}
