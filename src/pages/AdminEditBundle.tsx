import { useApolloClient } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppContext } from '../contexts/App';
import { UPDATE_BUNDLE } from '../gql/queries';

const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 320,
      width: 300
    }
  }
};

export default function AdminEditBundle() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { bundles, services } = useContext(AppContext);

  const bundle = useMemo(
    () => bundles.find((entry: any) => String(entry.id) === String(bundleId)),
    [bundleId, bundles]
  );

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableServices = useMemo(
    () => services.map((service: any) => ({ id: String(service.id), name: String(service.name) })),
    [services]
  );
  const serviceNameById = useMemo(
    () => new Map(availableServices.map((service) => [service.id, service.name] as const)),
    [availableServices]
  );

  const handleServiceSelectionChange = (selected: string[]) => {
    setServiceIds((old) => {
      const kept = old.filter((id) => selected.includes(id));
      const added = selected.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  };

  const moveService = (index: number, direction: -1 | 1) => {
    setServiceIds((old) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= old.length) return old;
      const next = [...old];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const removeService = (id: string) => {
    setServiceIds((old) => old.filter((serviceId) => serviceId !== id));
  };

  useEffect(() => {
    if (!bundle) return;
    setLabel(bundle.label ?? '');
    setIcon(bundle.icon ?? '');
    setServiceIds((bundle.services ?? []).map((service: any) => String(service.id)));
  }, [bundle]);

  const handleSave = async () => {
    if (!bundle) return;
    setErrorMessage(null);
    if (!label.trim()) {
      setErrorMessage('Bundle name is required.');
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
            services: serviceIds
          }
        }
      });
      await client.resetStore();
      navigate('/edit');
    } catch (_error) {
      setErrorMessage('Unable to update bundle. Please try again.');
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

      <TextField label='Bundle name' value={label} onChange={(event) => setLabel(event.target.value)} required />
      <TextField
        label='Icon (optional)'
        value={icon}
        onChange={(event) => setIcon(event.target.value)}
        helperText='Keep blank unless you use bundle icons.'
      />

      <FormControl>
        <InputLabel id='edit-bundle-services-label'>Services in this bundle</InputLabel>
        <Select
          labelId='edit-bundle-services-label'
          multiple
          value={serviceIds}
          label='Services in this bundle'
          onChange={(event) => handleServiceSelectionChange(event.target.value as string[])}
          input={<OutlinedInput label='Services in this bundle' />}
          renderValue={(selected) => {
            const selectedIds = selected as string[];
            return availableServices
              .filter((service) => selectedIds.includes(service.id))
              .map((service) => service.name)
              .join(', ');
          }}
          MenuProps={MENU_PROPS}
        >
          {availableServices.map((service) => (
            <MenuItem key={service.id} value={service.id}>
              <Checkbox checked={serviceIds.includes(service.id)} />
              <ListItemText primary={service.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography variant='subtitle1' sx={{ mb: 1 }}>
          Service order in this bundle
        </Typography>
        <Paper variant='outlined' sx={{ p: 1.5 }}>
          {serviceIds.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              Select services first, then order them here.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {serviceIds.map((id, index) => (
                <Box
                  key={id}
                  sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 1, alignItems: 'center' }}
                >
                  <Typography variant='body2'>
                    {index + 1}. {serviceNameById.get(id) ?? id}
                  </Typography>
                  <IconButton size='small' onClick={() => moveService(index, -1)} disabled={index === 0}>
                    <ArrowUpwardIcon fontSize='small' />
                  </IconButton>
                  <IconButton
                    size='small'
                    onClick={() => moveService(index, 1)}
                    disabled={index === serviceIds.length - 1}
                  >
                    <ArrowDownwardIcon fontSize='small' />
                  </IconButton>
                  <IconButton size='small' color='error' onClick={() => removeService(id)}>
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      <Box>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
