import { useApolloClient } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CREATE_SERVICE } from '../gql/queries';
import { AppContext } from '../contexts/App';

const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 320,
      width: 300
    }
  }
};

export default function AdminNewService() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services, refreshCatalog } = useContext(AppContext);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<'SERVICE' | 'PARAMETER'>('SERVICE');
  const [internalPrice, setInternalPrice] = useState('');
  const [externalAcademicPrice, setExternalAcademicPrice] = useState('');
  const [externalMarketPrice, setExternalMarketPrice] = useState('');
  const [externalNoSalaryPrice, setExternalNoSalaryPrice] = useState('');
  const [fallbackPrice, setFallbackPrice] = useState('');
  const [allowedConnectionIds, setAllowedConnectionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableServices = useMemo(
    () => services.map((service: any) => ({ id: String(service.id), name: String(service.name) })),
    [services]
  );

  const parsePrice = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0) return null;
    return parsed;
  };

  const handleSave = async () => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Service name is required.');
      return;
    }

    const internal = parsePrice(internalPrice);
    const externalAcademic = parsePrice(externalAcademicPrice);
    const externalMarket = parsePrice(externalMarketPrice);
    const externalNoSalary = parsePrice(externalNoSalaryPrice);
    const legacy = parsePrice(fallbackPrice);
    const hasInvalidPrice =
      (internalPrice.trim() && internal === null) ||
      (externalAcademicPrice.trim() && externalAcademic === null) ||
      (externalMarketPrice.trim() && externalMarket === null) ||
      (externalNoSalaryPrice.trim() && externalNoSalary === null) ||
      (fallbackPrice.trim() && legacy === null);

    if (hasInvalidPrice) {
      setErrorMessage('Prices must be valid non-negative numbers.');
      return;
    }

    const newService = {
      name: name.trim(),
      icon: '',
      price: legacy,
      internalPrice: internal,
      externalPrice: externalMarket,
      externalAcademicPrice: externalAcademic,
      externalMarketPrice: externalMarket,
      externalNoSalaryPrice: externalNoSalary,
      pricing: {
        internal,
        external: externalMarket,
        externalAcademic,
        externalMarket,
        externalNoSalary,
        legacy
      },
      pricingMode,
      parameters: [],
      paramGroups: [],
      allowedConnections: allowedConnectionIds,
      description: description.trim(),
      deliverables: []
    };

    try {
      setIsSaving(true);
      await client.mutate({
        mutation: CREATE_SERVICE,
        variables: {
          service: newService
        }
      });
      await refreshCatalog();
      navigate('/edit');
    } catch (error) {
      setErrorMessage('Unable to create service. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Typography variant='h2'>Add new service</Typography>
      <Typography variant='body1' color='text.secondary'>
        Create a service in a full-page editor. You can add parameters, deliverables, and detailed pricing after saving.
      </Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <TextField
        label='Service name'
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <TextField
        label='Description'
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        multiline
        minRows={4}
      />

      <FormControl>
        <InputLabel id='new-service-pricing-mode-label'>How price is calculated</InputLabel>
        <Select
          labelId='new-service-pricing-mode-label'
          value={pricingMode}
          label='How price is calculated'
          onChange={(event) => setPricingMode(event.target.value as 'SERVICE' | 'PARAMETER')}
        >
          <MenuItem value='SERVICE'>Service price</MenuItem>
          <MenuItem value='PARAMETER'>Based on selected options</MenuItem>
        </Select>
      </FormControl>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2
        }}
      >
        <TextField
          label='Internal price'
          value={internalPrice}
          onChange={(event) => setInternalPrice(event.target.value)}
          type='number'
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label='External customer (academic)'
          value={externalAcademicPrice}
          onChange={(event) => setExternalAcademicPrice(event.target.value)}
          type='number'
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label='External customer (market)'
          value={externalMarketPrice}
          onChange={(event) => setExternalMarketPrice(event.target.value)}
          type='number'
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label='External customer (no salary)'
          value={externalNoSalaryPrice}
          onChange={(event) => setExternalNoSalaryPrice(event.target.value)}
          type='number'
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label='Fallback price'
          value={fallbackPrice}
          onChange={(event) => setFallbackPrice(event.target.value)}
          type='number'
          inputProps={{ min: 0, step: '0.01' }}
          helperText='Used only if internal and external prices are empty.'
        />
      </Box>

      <FormControl>
        <InputLabel id='new-service-connections-label'>Can be combined with</InputLabel>
        <Select
          labelId='new-service-connections-label'
          multiple
          value={allowedConnectionIds}
          label='Can be combined with'
          onChange={(event) => setAllowedConnectionIds(event.target.value as string[])}
          input={<OutlinedInput label='Can be combined with' />}
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
              <Checkbox checked={allowedConnectionIds.includes(service.id)} />
              <ListItemText primary={service.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save service'}
        </Button>
      </Stack>
    </Stack>
  );
}
