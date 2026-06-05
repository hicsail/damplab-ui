import { ApolloError, useApolloClient } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CREATE_INVENTORY_ITEM } from '../gql/queries';

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

export default function AdminNewInventoryItem() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('MACHINE');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setErrorMessage(null);
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
        mutation: CREATE_INVENTORY_ITEM,
        variables: {
          item: {
            name: name.trim(),
            type,
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            quantity: parsedQty
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
      <Typography variant='body1' color='text.secondary'>
        For now each record is one physical thing. You can group fungible items by leaving
        them as separate records.
      </Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <TextField
        label='Name'
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <FormControl>
          <InputLabel id='inventory-type-label'>Type</InputLabel>
          <Select labelId='inventory-type-label' value={type} label='Type' onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label='Location' value={location} onChange={(e) => setLocation(e.target.value)} placeholder='Bench A, room 304…' />
        <TextField
          label='Quantity'
          type='number'
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
          helperText='Reserved for future multi-unit support. Keep at 1 for now.'
        />
      </Box>

      <TextField
        label='Description'
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={3}
        placeholder='Model, capabilities, notes…'
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
