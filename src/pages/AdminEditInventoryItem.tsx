import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GET_INVENTORY_ITEMS, UPDATE_INVENTORY_ITEM } from '../gql/queries';
import { EMPTY_RATE_PRICING, InventoryRateFields, pricingToRateForm, RatePricing, ratePricingToInput } from '../components/edit/InventoryRateFields';

const TYPE_OPTIONS = [
  { value: 'ROBOT', label: 'Robot' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'INSTRUMENT', label: 'Instrument' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'OTHER', label: 'Other' }
];

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

export default function AdminEditInventoryItem() {
  const { id: itemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const item: any = data?.inventoryItems?.find((x: any) => String(x.id) === String(itemId));

  const [name, setName] = useState('');
  const [type, setType] = useState('MACHINE');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [bookable, setBookable] = useState(false);
  const [rateType, setRateType] = useState<'HOURLY' | 'PER_UNIT'>('HOURLY');
  const [pricing, setPricing] = useState<RatePricing>(EMPTY_RATE_PRICING);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name ?? '');
    setType(item.type ?? 'MACHINE');
    setDescription(item.description ?? '');
    setLocation(item.location ?? '');
    setQuantity(String(item.quantity ?? 1));
    setBookable(!!item.bookable);
    setRateType(item.rateType === 'PER_UNIT' ? 'PER_UNIT' : 'HOURLY');
    setPricing(pricingToRateForm(item.pricing));
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

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }
    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      setErrorMessage('Quantity must be a positive integer.');
      return;
    }
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
            quantity: parsedQty,
            bookable,
            rateType: bookable ? rateType : null,
            pricing: bookable ? ratePricingToInput(pricing) : null
          }
        }
      });
      setSuccessMessage('Saved.');
    } catch (error) {
      console.error('Update inventory item failed:', error);
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

      <TextField label='Name' value={name} onChange={(e) => setName(e.target.value)} required />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <FormControl>
          <InputLabel id='inventory-type-label'>Type</InputLabel>
          <Select labelId='inventory-type-label' value={type} label='Type' onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='Location' value={location} onChange={(e) => setLocation(e.target.value)} />
        <TextField
          label='Quantity'
          type='number'
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
        />
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

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>Cancel</Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </Stack>
    </Stack>
  );
}
