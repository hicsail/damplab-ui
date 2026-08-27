import { useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GET_INVENTORY_ITEMS, GET_STATIONS, UPDATE_INVENTORY_ITEM } from '../gql/queries';
import { EMPTY_RATE_PRICING, InventoryRateFields, pricingToRateForm, RatePricing, ratePricingToInput } from '../components/edit/InventoryRateFields';
import { ReadOnlyFieldset } from '../components/ReadOnlyFieldset';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';
import {
  DEFAULT_INVENTORY_TYPE,
  EMPTY_INVENTORY_DETAILS,
  INVENTORY_TYPE_OPTIONS,
  InventoryDetailFields,
  InventoryDetails,
  inventoryDetailsFrom,
  inventoryDetailsToInput
} from '../components/edit/InventoryDetailFields';

/** One editable row of the placement editor: where the item lives and how many are there. */
interface PlacementRow {
  stationId: string;
  quantity: string;
}

const parsePlacementQuantity = (raw: string): number => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export default function AdminEditInventoryItem() {
  const { id: itemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const { data: stationData } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const stations: any[] = stationData?.stations ?? [];
  const item: any = data?.inventoryItems?.find((x: any) => String(x.id) === String(itemId));

  const [name, setName] = useState('');
  const [type, setType] = useState(DEFAULT_INVENTORY_TYPE);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [bookable, setBookable] = useState(false);
  const [rateType, setRateType] = useState<'HOURLY' | 'PER_UNIT'>('HOURLY');
  const [pricing, setPricing] = useState<RatePricing>(EMPTY_RATE_PRICING);
  const [details, setDetails] = useState<InventoryDetails>(EMPTY_INVENTORY_DETAILS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.InventoryWrite);

  useEffect(() => {
    if (!item) return;
    setName(item.name ?? '');
    setType(item.type ?? DEFAULT_INVENTORY_TYPE);
    setDescription(item.description ?? '');
    setLocation(item.location ?? '');
    // placements replaced the single stationId; fall back to the legacy field so
    // items saved before the migration still hydrate.
    const rows: PlacementRow[] = Array.isArray(item.placements)
      ? item.placements
          .filter((p: any) => p && p.stationId)
          .map((p: any) => ({ stationId: String(p.stationId), quantity: String(p.quantity ?? 1) }))
      : [];
    if (rows.length > 0) {
      setPlacements(rows);
    } else if (item.stationId) {
      setPlacements([{ stationId: String(item.stationId), quantity: '1' }]);
    } else {
      setPlacements([]);
    }
    setBookable(!!item.bookable);
    setRateType(item.rateType === 'PER_UNIT' ? 'PER_UNIT' : 'HOURLY');
    setPricing(pricingToRateForm(item.pricing));
    setDetails(inventoryDetailsFrom(item));
  }, [item?.id]);

  if (loading && !item) {
    return <Typography color='text.secondary'>Loading…</Typography>;
  }
  if (!item) {
    return (
      <Stack spacing={2}>
        <Button variant='outlined' size='small' startIcon={<ArrowBackIcon />} onClick={() => navigate('/edit')} sx={{ alignSelf: 'flex-start' }}>
          Back to catalog
        </Button>
        <Alert severity='error'>Inventory item not found.</Alert>
      </Stack>
    );
  }

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
    setSuccessMessage(null);
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
        mutation: UPDATE_INVENTORY_ITEM,
        variables: {
          item: itemId,
          changes: {
            name: name.trim(),
            type,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            placements: placementsInput,
            bookable,
            rateType: bookable ? rateType : null,
            pricing: bookable ? ratePricingToInput(pricing) : null,
            ...inventoryDetailsToInput(details)
          }
        }
      });
      setSuccessMessage('Saved.');
    } catch (error) {
      console.error('Update inventory item failed:', error);
      setErrorMessage(formatSaveError(error, 'this inventory item'));
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
      <Stack direction='row' spacing={2} alignItems='center'>
        <Typography variant='h2'>Edit inventory item</Typography>
        {item.isDeleted ? <Chip color='default' label='Deleted' /> : <Chip color='success' label='Active' />}
      </Stack>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity='success' sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <ReadOnlyFieldset canWrite={canWrite} noun='inventory'>

      <TextField label='Name' value={name} onChange={(e) => setName(e.target.value)} required />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <FormControl>
          <InputLabel id='inventory-type-label'>Type</InputLabel>
          <Select labelId='inventory-type-label' value={type} label='Type' onChange={(e) => setType(e.target.value)}>
            {INVENTORY_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='Location (free text)' value={location} onChange={(e) => setLocation(e.target.value)} />
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

      <TextField label='Description' value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} />

      <InventoryRateFields
        bookable={bookable}
        setBookable={setBookable}
        rateType={rateType}
        setRateType={setRateType}
        pricing={pricing}
        setPricing={setPricing}
        itemType={type}
      />

      <InventoryDetailFields details={details} setDetails={setDetails} />

      </ReadOnlyFieldset>

      {/* Outside the fieldset — see ReadOnlyFieldset. */}
      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
          {canWrite ? 'Cancel' : 'Back to catalog'}
        </Button>
        {canWrite && (
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
