import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays, format, startOfMonth } from 'date-fns';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_INVENTORY_AVAILABILITY, GET_MY_BOOKINGS, OWN_JOBS } from '../gql/queries';
import { CANCEL_BOOKING, CREATE_BOOKING } from '../gql/mutations';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { defaultSlotFor } from '../utils/jobEquipmentBooking';
import { formatSaveError } from '../utils/gqlError';
import JobEquipmentBookingCalendar from '../components/booking/JobEquipmentBookingCalendar';
import JobEquipmentBookingDialog from '../components/booking/JobEquipmentBookingDialog';
import BookingMonthGrid, { BusySlot, monthGrid } from '../components/booking/BookingMonthGrid';

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
      // An uncategorised user must never be quoted the internal rate -- it is the
      // cheapest tier and this is the one population with no pricing group at all.
      // Mirrors the backend's resolveCategoryPrice fallback: legacy, then external.
      //
      // The old third step, `externalMarket`, is gone. The server now strips every
      // tier the caller is not in, so an uncategorised caller receives null there
      // and the reach-through would only ever have produced a blank. Keeping it
      // would have meant publishing the market rate to people not in that tier
      // just so this line could read it.
      return n(pricing.legacy) ?? n(pricing.external);
  }
}

const isTimed = (item: any) => (item?.rateType ? item.rateType === 'HOURLY' : item?.type !== 'CONSUMABLE');

/** A job whose Statement of Work both parties have signed — the state that opens booking on it. */
const SIGNED = new Set(['SIGNED', 'FINAL']);

export default function BookInventory() {
  const userContext = useContext(UserContext) as UserContextProps;
  const customerCategory = userContext.userProps?.customerCategory;
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // The job page's Book Time button lands here with `?job=<id>`; the dropdown keeps
  // the URL in step so the back link and a reload both return to the same job.
  const jobId = searchParams.get('job') ?? '';
  const setJobId = (id: string): void => setSearchParams(id ? { job: id } : {}, { replace: true });
  // `&edit=<bookingId>` (from the job page's pencil) opens that booking's dialog
  // once; the calendar clears it so a reload does not reopen it.
  const editBookingId = searchParams.get('edit') ?? undefined;
  const clearEdit = (): void => setSearchParams(jobId ? { job: jobId } : {}, { replace: true });

  const { data: invData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const { data: myData, loading: myLoading, refetch } = useQuery(GET_MY_BOOKINGS, { fetchPolicy: 'cache-and-network' });
  // Jobs the caller submitted. A job someone else submitted and listed the caller on
  // as a booker is reached from that job's own page; it is not in this list.
  const { data: jobsData } = useQuery(OWN_JOBS, { variables: { input: { limit: 100, hasSow: true } }, fetchPolicy: 'cache-and-network' });

  const bookable = useMemo(() => (invData?.activeInventoryItems ?? []).filter((i: any) => i.bookable), [invData]);
  const bookableJobs = useMemo(() => (jobsData?.ownJobs?.items ?? []).filter((j: any) => j.sow && SIGNED.has(j.sow.status)), [jobsData]);
  const jobInList = !jobId || bookableJobs.some((j: any) => j.id === jobId);

  const [itemId, setItemId] = useState('');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [usedOn, setUsedOn] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [proposed, setProposed] = useState<{ start: Date; end: Date } | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

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

  // The shared pool for the visible month, so a day the lab already holds looks held.
  const { first, dayCount } = useMemo(() => monthGrid(month), [month]);
  const gridEnd = useMemo(() => addDays(first, dayCount), [first, dayCount]);
  const canReadPool = can(PERMISSIONS.InventoryRead);
  const { data: availData, refetch: refetchAvailability } = useQuery(GET_INVENTORY_AVAILABILITY, {
    variables: { from: first, to: gridEnd },
    skip: !!jobId || !item || !timed || !canReadPool,
    fetchPolicy: 'cache-and-network'
  });

  const [createBooking, { loading: booking }] = useMutation(CREATE_BOOKING);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  const myBookings: any[] = myData?.myBookings ?? [];
  const myOnItem = useMemo(
    () => (item ? myBookings.filter((b) => b.kind === 'TIMED' && b.status !== 'CANCELLED' && String(b.inventoryItem) === String(item.id)) : []),
    [myBookings, item]
  );
  const busy: BusySlot[] = useMemo(() => {
    if (!item) return [];
    const own = new Set(myOnItem.map((b) => `${new Date(b.startTime).getTime()}-${new Date(b.endTime).getTime()}`));
    return (availData?.inventoryAvailability ?? [])
      .filter((c: any) => String(c.itemId) === String(item.id))
      .filter((c: any) => !(c.source === 'BOOKING' && own.has(`${new Date(c.start).getTime()}-${new Date(c.end).getTime()}`)))
      .map((c: any) => ({ label: c.label, start: c.start, end: c.end }));
  }, [availData, item, myOnItem]);

  const reload = async (): Promise<void> => {
    await Promise.all([refetch(), !jobId && item && timed && canReadPool ? refetchAvailability() : Promise.resolve()]);
  };

  const submitWalkUp = async (values: { startTime?: Date; endTime?: Date; notes: string }): Promise<void> => {
    if (!item) throw new Error('Select an item to book.');
    const input: any = { inventoryItemId: item.id, notes: values.notes || undefined, customerCategory };
    if (timed) {
      input.startTime = values.startTime;
      input.endTime = values.endTime;
    } else {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a positive quantity.');
      input.quantity = qty;
      input.usedOn = usedOn ?? new Date();
    }
    await createBooking({ variables: { input } });
    setSuccess('Booking created.');
    await reload();
  };

  const handleBook = async () => {
    setError(null);
    setSuccess(null);
    if (!item) {
      setError('Select an item to book.');
      return;
    }
    if (timed) {
      if (!start || !end) {
        setError('Pick a start and end time.');
        return;
      }
      if (end <= start) {
        setError('End time must be after the start time.');
        return;
      }
    }
    try {
      await submitWalkUp({ startTime: start ?? undefined, endTime: end ?? undefined, notes: notes.trim() });
      setStart(null);
      setEnd(null);
      setQuantity('1');
      setNotes('');
    } catch (e: any) {
      setError(e?.graphQLErrors?.[0]?.message || e?.message || 'Could not create the booking.');
    }
  };

  const doCancel = async (id: string): Promise<void> => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await reload();
    } catch (e) {
      setError(formatSaveError(e, 'this cancellation'));
    }
  };

  const jobPagePath = can(PERMISSIONS.JobsViewAll) ? `/technician_view/${jobId}` : `/client_view/${jobId}`;
  const selectedJob = bookableJobs.find((j: any) => j.id === jobId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1100 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <ScienceIcon color="primary" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Book inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reserve equipment by the hour or request consumables by quantity. You'll be billed for confirmed usage.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          {jobId && (
            <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate(jobPagePath)} sx={{ textTransform: 'none' }}>
              Back to job{selectedJob?.name ? `: ${selectedJob.name}` : ''}
            </Button>
          )}
        </Stack>

        {!!error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Snackbar open={!!success} autoHideDuration={3500} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="book-job-label">Book against a job</InputLabel>
                <Select labelId="book-job-label" label="Book against a job" value={jobInList ? jobId : ''} onChange={(e) => setJobId(e.target.value)}>
                  <MenuItem value="">Not tied to a job (walk-up booking)</MenuItem>
                  {bookableJobs.map((j: any) => (
                    <MenuItem key={j.id} value={j.id}>
                      {j.name}
                      {j.sow?.sowNumber ? ` — SOW ${j.sow.sowNumber}` : ''}
                      {j.submitted ? ` · ${format(new Date(j.submitted), 'MMM d, yyyy')}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {bookableJobs.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  None of your jobs has a signed Statement of Work yet. Time booked against a job is billed to that job at the operation's rate.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {jobId && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                {selectedJob?.name ? `Equipment Booking — ${selectedJob.name}` : 'Equipment Booking'}
              </Typography>
              <JobEquipmentBookingCalendar jobId={jobId} editBookingId={editBookingId} onEditConsumed={clearEdit} />
            </CardContent>
          </Card>
        )}

        {!jobId && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="book-item-label">Item</InputLabel>
                  <Select labelId="book-item-label" label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                    {bookable.length === 0 && (
                      <MenuItem value="" disabled>
                        No bookable items available
                      </MenuItem>
                    )}
                    {bookable.map((i: any) => (
                      <MenuItem key={i.id} value={i.id}>
                        {i.name} — {isTimed(i) ? 'hourly' : 'per unit'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {item && timed && (
                  <BookingMonthGrid
                    month={month}
                    onMonth={setMonth}
                    bookings={myOnItem}
                    busy={busy}
                    canAct
                    onCancel={doCancel}
                    onDayClick={(day) => {
                      setDialogError(null);
                      setProposed(defaultSlotFor(day));
                    }}
                  />
                )}

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

                {item && <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />}

                {item && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {rate != null ? `Rate: $${rate.toFixed(2)}${timed ? '/hr' : '/unit'}` : 'No rate set for your customer category — staff will confirm pricing.'}
                    </Typography>
                    {estimate != null && <Chip color="primary" variant="outlined" label={`Estimated: $${estimate.toFixed(2)}`} />}
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" onClick={handleBook} disabled={booking}>
                      {booking ? 'Booking…' : 'Book'}
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {item && !jobId && (
          <JobEquipmentBookingDialog
            open={!!proposed}
            title={`Book ${item.name}`}
            window={{}}
            items={[{ id: String(item.id), name: item.name, schedulable: true }]}
            fixedItemId={String(item.id)}
            initialStart={proposed?.start ?? null}
            initialEnd={proposed?.end ?? null}
            busy={booking}
            error={dialogError}
            onCancel={() => {
              setProposed(null);
              setDialogError(null);
            }}
            onConfirm={async (values) => {
              setDialogError(null);
              try {
                await submitWalkUp({ startTime: values.startTime, endTime: values.endTime, notes: values.notes });
                setProposed(null);
              } catch (e) {
                setDialogError(formatSaveError(e, 'this booking'));
              }
            }}
          />
        )}

        {!jobId && (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>
              My bookings
            </Typography>
            {myLoading && !myData ? (
              <CircularProgress size={24} />
            ) : myBookings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No bookings yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {myBookings.map((b) => (
                  <Card key={b._id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600 }} noWrap title={b.notes || b.inventoryName}>
                            {b.notes || b.inventoryName}
                          </Typography>
                          {b.notes && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {b.inventoryName}
                            </Typography>
                          )}
                        </Box>
                        <Chip size="small" label={b.status} color={b.status === 'CANCELLED' ? 'default' : b.status === 'COMPLETED' ? 'success' : 'warning'} />
                        {b.billingStatus === 'BILLED' && <Chip size="small" label="Billed" color="info" variant="outlined" />}
                        {b.jobId && <Chip size="small" label="Job booking" variant="outlined" />}
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {b.kind === 'TIMED'
                            ? `${b.startTime ? format(new Date(b.startTime), 'MMM d, h:mm a') : ''} – ${b.endTime ? format(new Date(b.endTime), 'MMM d, h:mm a') : ''}`
                            : `${b.quantity} units${b.usedOn ? ` · ${format(new Date(b.usedOn), 'MMM d')}` : ''}`}
                        </Typography>
                        {b.cost != null && <Typography variant="body2">${Number(b.cost).toFixed(2)}</Typography>}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
}
