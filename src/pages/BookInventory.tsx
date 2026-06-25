import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_MY_BOOKINGS } from '../gql/queries';
import { CREATE_BOOKING } from '../gql/mutations';
import { UserContext, UserContextProps } from '../contexts/UserContext';

/** Resolve the $/hr or $/unit rate for the current user's category. */
function resolveRate(pricing: any, category?: string): number | undefined {
  if (!pricing) return undefined;
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  switch (category) {
    case 'INTERNAL_CUSTOMERS':
      return n(pricing.internal) ?? n(pricing.legacy);
    case 'EXTERNAL_CUSTOMER_ACADEMIC':
      return n(pricing.externalAcademic) ?? n(pricing.external) ?? n(pricing.legacy);
    case 'EXTERNAL_CUSTOMER_MARKET':
      return n(pricing.externalMarket) ?? n(pricing.external) ?? n(pricing.legacy);
    case 'EXTERNAL_CUSTOMER_NO_SALARY':
      return n(pricing.externalNoSalary) ?? n(pricing.external) ?? n(pricing.legacy);
    default:
      return n(pricing.legacy) ?? n(pricing.internal) ?? n(pricing.external);
  }
}

const isTimed = (item: any) => (item?.rateType ? item.rateType === 'HOURLY' : item?.type !== 'CONSUMABLE');

export default function BookInventory() {
  const userContext = useContext(UserContext) as UserContextProps;
  const customerCategory = userContext.userProps?.customerCategory;

  const { data: invData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const { data: myData, loading: myLoading, refetch } = useQuery(GET_MY_BOOKINGS, { fetchPolicy: 'cache-and-network' });

  const bookable = useMemo(() => (invData?.activeInventoryItems ?? []).filter((i: any) => i.bookable), [invData]);

  const [itemId, setItemId] = useState('');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [usedOn, setUsedOn] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const item = useMemo(() => bookable.find((i: any) => String(i.id) === String(itemId)), [bookable, itemId]);
  const timed = item ? isTimed(item) : true;
  const rate = item ? resolveRate(item.pricing, customerCategory) : undefined;

  const estimate = useMemo(() => {
    if (!item || rate == null) return undefined;
    if (timed) {
      if (!start || !end || end <= start) return undefined;
      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      return Math.round(hours * rate * 100) / 100;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return undefined;
    return Math.round(qty * rate * 100) / 100;
  }, [item, rate, timed, start, end, quantity]);

  const [createBooking, { loading: booking }] = useMutation(CREATE_BOOKING);

  const handleBook = async () => {
    setError(null);
    setSuccess(null);
    if (!item) {
      setError('Select an item to book.');
      return;
    }
    const input: any = { inventoryItemId: item.id, notes: notes.trim() || undefined, customerCategory };
    if (timed) {
      if (!start || !end) {
        setError('Pick a start and end time.');
        return;
      }
      if (end <= start) {
        setError('End time must be after the start time.');
        return;
      }
      input.startTime = start;
      input.endTime = end;
    } else {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Enter a positive quantity.');
        return;
      }
      input.quantity = qty;
      input.usedOn = usedOn ?? new Date();
    }
    try {
      await createBooking({ variables: { input } });
      setSuccess('Booking created.');
      setStart(null);
      setEnd(null);
      setQuantity('1');
      setNotes('');
      await refetch();
    } catch (e: any) {
      setError(e?.graphQLErrors?.[0]?.message || e?.message || 'Could not create the booking.');
    }
  };

  const myBookings: any[] = myData?.myBookings ?? [];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1000 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <ScienceIcon color="primary" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Book inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reserve equipment by the hour or request consumables by quantity. You'll be billed for confirmed usage.
            </Typography>
          </Box>
        </Stack>

        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Snackbar open={!!success} autoHideDuration={3500} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
        </Snackbar>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="book-item-label">Item</InputLabel>
                <Select labelId="book-item-label" label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {bookable.length === 0 && <MenuItem value="" disabled>No bookable items available</MenuItem>}
                  {bookable.map((i: any) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.name} — {isTimed(i) ? 'hourly' : 'per unit'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {item && timed && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DateTimePicker label="Start" value={start} onChange={setStart} sx={{ flex: 1 }} />
                  <DateTimePicker label="End" value={end} onChange={setEnd} sx={{ flex: 1 }} />
                </Stack>
              )}

              {item && !timed && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ min: 1, step: 1 }} sx={{ flex: 1 }} />
                  <DatePicker label="Date used" value={usedOn} onChange={setUsedOn} sx={{ flex: 1 }} />
                </Stack>
              )}

              {item && (
                <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
              )}

              {item && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {rate != null
                      ? `Rate: $${rate.toFixed(2)}${timed ? '/hr' : '/unit'}`
                      : 'No rate set for your customer category — staff will confirm pricing.'}
                  </Typography>
                  {estimate != null && (
                    <Chip color="primary" variant="outlined" label={`Estimated: $${estimate.toFixed(2)}`} />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" onClick={handleBook} disabled={booking}>
                    {booking ? 'Booking…' : 'Book'}
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="h6" sx={{ mb: 1 }}>My bookings</Typography>
        {myLoading && !myData ? (
          <CircularProgress size={24} />
        ) : myBookings.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No bookings yet.</Typography>
        ) : (
          <Stack spacing={1}>
            {myBookings.map((b) => (
              <Card key={b._id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 600 }}>{b.inventoryName}</Typography>
                    <Chip size="small" label={b.status} color={b.status === 'CANCELLED' ? 'default' : b.status === 'COMPLETED' ? 'success' : 'warning'} />
                    {b.billingStatus === 'BILLED' && <Chip size="small" label="Billed" color="info" variant="outlined" />}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {b.kind === 'TIMED'
                        ? `${b.startTime ? format(new Date(b.startTime), 'MMM d, h:mm a') : ''} – ${b.endTime ? format(new Date(b.endTime), 'h:mm a') : ''}`
                        : `${b.quantity} units${b.usedOn ? ` · ${format(new Date(b.usedOn), 'MMM d')}` : ''}`}
                    </Typography>
                    {b.cost != null && <Typography variant="body2">${Number(b.cost).toFixed(2)}</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </LocalizationProvider>
  );
}
