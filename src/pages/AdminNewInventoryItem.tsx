import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CREATE_INVENTORY_ITEM, GET_STATIONS } from '../gql/queries';
import { EMPTY_RATE_PRICING, InventoryRateFields, RatePricing, ratePricingToInput } from '../components/edit/InventoryRateFields';

const SUGGESTED_TYPES = ['EQUIPMENT', 'HOOD', 'STORAGE', 'CONSUMABLE'];

const TAG_SUGGESTIONS = [
  'Analytical Equipment', 'CLIA Equipment', 'Centrifuge', 'Cold Storage',
  'General Equipment', 'Imaging', 'Incubator', 'Liquid Handler', 'Sequencer', 'Vortexer'
];

/** One editable row of the placement editor: where the item lives and how many are there. */
interface PlacementRow {
  stationId: string;
  quantity: string;
}

const parsePlacementQuantity = (raw: string): number => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 1;
};

function formatGqlError(error: unknown): string {
  const fallback = 'Unable to save inventory item. Please try again.';
  if (error instanceof ApolloError) {
    const gqlMessage = error.graphQLErrors?.[0]?.message;
    if (gqlMessage) return `Save failed: ${gqlMessage}`;
    if (error.networkError) {
      const ne = error.networkError as { statusCode?: number; message?: string };
      return `Network error${ne.statusCode ? ` (HTTP ${ne.statusCode})` : ''}: ${ne.message ?? 'request failed'}`;
    }
    return error.message ? `Save failed: ${error.message}` : fallback;
  }
  return fallback;
}

export default function AdminNewInventoryItem() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('EQUIPMENT');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const { data: stationData } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const stations: any[] = stationData?.stations ?? [];
  const [bookable, setBookable] = useState(false);
  const [rateType, setRateType] = useState<'HOURLY' | 'PER_UNIT'>('HOURLY');
  const [pricing, setPricing] = useState<RatePricing>(EMPTY_RATE_PRICING);
  const [tags, setTags] = useState<string[]>([]);
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hasServiceContract, setHasServiceContract] = useState(false);
  const [serviceContractExpiration, setServiceContractExpiration] = useState('');
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const chosenStationIds = placements.map((p) => p.stationId).filter(Boolean);
  const hasDuplicateStation = new Set(chosenStationIds).size !== chosenStationIds.length;
  const totalUnits = placements
    .filter((p) => !!p.stationId)
    .reduce((sum, p) => sum + parsePlacementQuantity(p.quantity), 0);

  const setPlacementRow = (index: number, patch: Partial<PlacementRow>) =>
    setPlacements((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addPlacementRow = () => setPlacements((prev) => [...prev, { stationId: '', quantity: '1' }]);
  const removePlacementRow = (index: number) =>
    setPlacements((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }
    if (hasDuplicateStation) {
      setErrorMessage('Each station can only appear once — combine the duplicate rows instead.');
      return;
    }
    const placementsInput = placements
      .filter((p) => !!p.stationId)
      .map((p) => ({ stationId: p.stationId, quantity: parsePlacementQuantity(p.quantity) }));
    try {
      setIsSaving(true);
      await client.mutate({
        mutation: CREATE_INVENTORY_ITEM,
        variables: {
          item: {
            name: name.trim(),
            type,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            placements: placementsInput,
            bookable,
            rateType: bookable ? rateType : undefined,
            pricing: bookable ? ratePricingToInput(pricing) : undefined,
            tags,
            modelNumber: modelNumber.trim() || undefined,
            serialNumber: serialNumber.trim() || undefined,
            hasServiceContract,
            serviceContractExpiration: serviceContractExpiration || undefined,
            dimensionL: dimL ? { value: Number(dimL), unit: 'm' } : undefined,
            dimensionW: dimW ? { value: Number(dimW), unit: 'm' } : undefined,
            dimensionH: dimH ? { value: Number(dimH), unit: 'm' } : undefined
          }
        }
      });
      navigate('/edit');
    } catch (error) {
      console.error('Create inventory item failed:', error);
      setErrorMessage(formatGqlError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <Button
        variant='outlined'
        size='small'
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/edit')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to catalog
      </Button>
      <Typography variant='h2'>Add inventory item</Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <TextField
        label='Name'
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Autocomplete
          freeSolo
          options={SUGGESTED_TYPES}
          value={type}
          onChange={(_, newVal) => setType(typeof newVal === 'string' ? newVal : '')}
          onInputChange={(_, newVal) => setType(newVal)}
          renderInput={(params) => <TextField {...params} label='Type' />}
        />
        <TextField label='Location (free text)' value={location} onChange={(e) => setLocation(e.target.value)} placeholder='Bench A, room 304…' />
      </Box>

      <Box>
        <Typography variant='subtitle1' sx={{ mb: 0.5 }}>Stations</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
          This item can live at several stations. Add one row per station and set how many units are
          there.
        </Typography>
        <Stack spacing={1.5}>
          {placements.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              Not placed at any station yet.
            </Typography>
          )}
          {placements.map((row, index) => (
            <Stack key={index} direction='row' spacing={1} alignItems='center'>
              <FormControl size='small' sx={{ flex: 1 }}>
                <InputLabel id={`inventory-station-label-${index}`}>Station</InputLabel>
                <Select
                  labelId={`inventory-station-label-${index}`}
                  value={row.stationId}
                  label='Station'
                  onChange={(e) => setPlacementRow(index, { stationId: e.target.value })}
                >
                  <MenuItem value=''><em>Select a station</em></MenuItem>
                  {stations
                    .filter((s) => s.id === row.stationId || !chosenStationIds.includes(s.id))
                    .map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}{s.zone ? ` — ${s.zone}` : ''}</MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                label='Quantity'
                type='number'
                size='small'
                value={row.quantity}
                onChange={(e) => setPlacementRow(index, { quantity: e.target.value })}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: 120 }}
              />
              <Tooltip title='Remove station'>
                <IconButton size='small' onClick={() => removePlacementRow(index)}>
                  <DeleteOutlineIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
          {hasDuplicateStation && (
            <Alert severity='warning'>
              The same station is listed more than once. Combine those rows before saving.
            </Alert>
          )}
          <Typography variant='caption' color='text.secondary'>
            Total units across all stations: {totalUnits}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<AddIcon />}
            onClick={addPlacementRow}
            sx={{ alignSelf: 'flex-start' }}
            disabled={stations.length > 0 && chosenStationIds.length >= stations.length}
          >
            Add station
          </Button>
        </Stack>
      </Box>

      <TextField
        label='Description'
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        placeholder='Model, capabilities, notes…'
      />

      <Autocomplete
        multiple
        freeSolo
        options={TAG_SUGGESTIONS}
        value={tags}
        onChange={(_, newValue) => setTags(newValue)}
        renderInput={(params) => <TextField {...params} label='Tags' placeholder='Add a tag…' />}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <TextField label='Model #' value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} placeholder='e.g. ND-2000C' />
        <TextField label='Serial #' value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder='Internal tracking only' />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControlLabel
          control={<Checkbox checked={hasServiceContract} onChange={(e) => setHasServiceContract(e.target.checked)} />}
          label='Has service contract'
        />
        {hasServiceContract && (
          <TextField
            label='Contract expiration'
            type='date'
            size='small'
            value={serviceContractExpiration}
            onChange={(e) => setServiceContractExpiration(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
          />
        )}
      </Box>

      <Box>
        <Typography variant='subtitle1' sx={{ mb: 1 }}>Dimensions (m)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          <TextField label='L' type='number' value={dimL} onChange={(e) => setDimL(e.target.value)} inputProps={{ min: 0, step: 'any' }} />
          <TextField label='W' type='number' value={dimW} onChange={(e) => setDimW(e.target.value)} inputProps={{ min: 0, step: 'any' }} />
          <TextField label='H' type='number' value={dimH} onChange={(e) => setDimH(e.target.value)} inputProps={{ min: 0, step: 'any' }} />
        </Box>
      </Box>

      <InventoryRateFields
        bookable={bookable}
        setBookable={setBookable}
        rateType={rateType}
        setRateType={setRateType}
        pricing={pricing}
        setPricing={setPricing}
        itemType={type}
      />

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>Cancel</Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Stack>
  );
}
