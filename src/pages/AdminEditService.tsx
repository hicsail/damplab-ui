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
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { UPDATE_SERVICE } from '../gql/queries';
import { AppContext } from '../contexts/App';
import { DeliverablesEditor } from '../components/edit/DeliverablesEditor';

const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 320,
      width: 300
    }
  }
};

export default function AdminEditService() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services, refreshCatalog } = useContext(AppContext);

  const service = useMemo(
    () => services.find((entry: any) => String(entry.id) === String(serviceId)),
    [serviceId, services]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<'SERVICE' | 'PARAMETER'>('SERVICE');
  const [internalPrice, setInternalPrice] = useState('');
  const [externalAcademicPrice, setExternalAcademicPrice] = useState('');
  const [externalMarketPrice, setExternalMarketPrice] = useState('');
  const [externalNoSalaryPrice, setExternalNoSalaryPrice] = useState('');
  const [fallbackPrice, setFallbackPrice] = useState('');
  const [allowedConnectionIds, setAllowedConnectionIds] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const availableServices = useMemo(
    () =>
      services
        .filter((s: any) => String(s.id) !== String(serviceId))
        .map((s: any) => ({ id: String(s.id), name: String(s.name) })),
    [services, serviceId]
  );

  useEffect(() => {
    if (!service) return;
    const row: any = service;
    const pricing = row.pricing ?? {};
    setName(row.name ?? '');
    setDescription(row.description ?? '');
    setPricingMode(row.pricingMode ?? 'SERVICE');
    setInternalPrice(
      pricing.internal != null ? String(pricing.internal) : row.internalPrice != null ? String(row.internalPrice) : ''
    );
    setExternalAcademicPrice(
      pricing.externalAcademic != null
        ? String(pricing.externalAcademic)
        : row.externalAcademicPrice != null
          ? String(row.externalAcademicPrice)
          : ''
    );
    setExternalMarketPrice(
      pricing.externalMarket != null
        ? String(pricing.externalMarket)
        : pricing.external != null
          ? String(pricing.external)
          : row.externalMarketPrice != null
            ? String(row.externalMarketPrice)
            : row.externalPrice != null
              ? String(row.externalPrice)
              : ''
    );
    setExternalNoSalaryPrice(
      pricing.externalNoSalary != null
        ? String(pricing.externalNoSalary)
        : row.externalNoSalaryPrice != null
          ? String(row.externalNoSalaryPrice)
          : ''
    );
    setFallbackPrice(
      pricing.legacy != null ? String(pricing.legacy) : row.price != null ? String(row.price) : ''
    );
    setAllowedConnectionIds((row.allowedConnections || []).map((s: any) => String(s.id)));
    setDeliverables(Array.isArray(row.deliverables) ? [...row.deliverables] : []);
  }, [service]);

  const parsePrice = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0) return null;
    return parsed;
  };

  const handleSave = async () => {
    if (!service) return;
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

    const row: any = service;
    const changes = {
      name: name.trim(),
      icon: row.icon ?? '',
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
      parameters: row.parameters ?? [],
      paramGroups: row.paramGroups ?? [],
      allowedConnections: allowedConnectionIds,
      description: description.trim(),
      deliverables
    };

    try {
      setIsSaving(true);
      await client.mutate({
        mutation: UPDATE_SERVICE,
        variables: {
          service: row.id,
          changes
        }
      });
      await refreshCatalog();
      navigate('/edit');
    } catch (_error) {
      setErrorMessage('Unable to save service. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!service) {
    return <Alert severity="error">Service not found.</Alert>;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Typography variant="h2">Edit service</Typography>
      <Typography variant="body1" color="text.secondary">
        Update service details, pricing, connections, and deliverables on this page. Use{' '}
        <strong>Configure parameters</strong> for the full parameter editor.
      </Typography>

      {!!errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <TextField
        label="Service name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />

      <TextField
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        multiline
        minRows={4}
      />

      <FormControl>
        <InputLabel id="edit-service-pricing-mode-label">How price is calculated</InputLabel>
        <Select
          labelId="edit-service-pricing-mode-label"
          value={pricingMode}
          label="How price is calculated"
          onChange={(event) => setPricingMode(event.target.value as 'SERVICE' | 'PARAMETER')}
        >
          <MenuItem value="SERVICE">Service price</MenuItem>
          <MenuItem value="PARAMETER">Based on selected options</MenuItem>
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
          label="Internal price"
          value={internalPrice}
          onChange={(event) => setInternalPrice(event.target.value)}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="External customer (academic)"
          value={externalAcademicPrice}
          onChange={(event) => setExternalAcademicPrice(event.target.value)}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="External customer (market)"
          value={externalMarketPrice}
          onChange={(event) => setExternalMarketPrice(event.target.value)}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="External customer (no salary)"
          value={externalNoSalaryPrice}
          onChange={(event) => setExternalNoSalaryPrice(event.target.value)}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="Fallback price"
          value={fallbackPrice}
          onChange={(event) => setFallbackPrice(event.target.value)}
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
          helperText="Used only if internal and external prices are empty."
        />
      </Box>

      <FormControl>
        <InputLabel id="edit-service-connections-label">Can be combined with</InputLabel>
        <Select
          labelId="edit-service-connections-label"
          multiple
          value={allowedConnectionIds}
          label="Can be combined with"
          onChange={(event) => setAllowedConnectionIds(event.target.value as string[])}
          input={<OutlinedInput label="Can be combined with" />}
          renderValue={(selected) => {
            const selectedIds = selected as string[];
            return availableServices
              .filter((s) => selectedIds.includes(s.id))
              .map((s) => s.name)
              .join(', ');
          }}
          MenuProps={MENU_PROPS}
        >
          {availableServices.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              <Checkbox checked={allowedConnectionIds.includes(s.id)} />
              <ListItemText primary={s.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" onClick={() => navigate(`/edit/services/${serviceId}/parameters`)}>
          Configure parameters
        </Button>
      </Stack>

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Deliverables
        </Typography>
        <DeliverablesEditor deliverables={deliverables} onSave={setDeliverables} />
      </Box>

      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={() => navigate('/edit')} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </Stack>
    </Stack>
  );
}
