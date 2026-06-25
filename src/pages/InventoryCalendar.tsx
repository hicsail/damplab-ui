import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_BOOKINGS } from '../gql/queries';
import { CANCEL_BOOKING, CONFIRM_BOOKING_USAGE } from '../gql/mutations';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success'> = {
  RESERVED: 'warning',
  IN_USE: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default'
};

function bookingDay(b: any): Date | null {
  const d = b.kind === 'TIMED' ? b.startTime : b.usedOn;
  return d ? new Date(d) : null;
}

export default function InventoryCalendar() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [itemFilter, setItemFilter] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [actualValue, setActualValue] = useState('');

  const weekEnd = addDays(weekStart, 7);
  const { data: invData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-first' });
  const { data, loading, error, refetch } = useQuery(GET_BOOKINGS, {
    variables: { from: weekStart, to: weekEnd, inventoryItemId: itemFilter || undefined },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000
  });

  const [confirmUsage] = useMutation(CONFIRM_BOOKING_USAGE);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  const bookings: any[] = useMemo(() => (data?.bookings ?? []).filter((b: any) => b.status !== 'CANCELLED'), [data]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const b of bookings) {
      const d = bookingDay(b);
      if (!d) continue;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const da = bookingDay(a)?.getTime() ?? 0;
        const db = bookingDay(b)?.getTime() ?? 0;
        return da - db;
      });
    }
    return map;
  }, [bookings]);

  const openConfirm = (b: any) => {
    setConfirmTarget(b);
    if (b.kind === 'TIMED') {
      const hrs = b.startTime && b.endTime ? (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000 : 0;
      setActualValue(String(Math.round(hrs * 100) / 100));
    } else {
      setActualValue(String(b.quantity ?? 1));
    }
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    const v = Number(actualValue);
    const vars: any = { id: confirmTarget._id };
    if (confirmTarget.kind === 'TIMED') vars.actualHours = Number.isFinite(v) ? v : null;
    else vars.actualQuantity = Number.isFinite(v) ? Math.round(v) : null;
    await confirmUsage({ variables: vars });
    setConfirmTarget(null);
    await refetch();
  };

  const doCancel = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    await cancelBooking({ variables: { id } });
    await refetch();
  };

  const items = invData?.activeInventoryItems ?? [];

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <EventAvailableIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Inventory schedule</Typography>
        <Box sx={{ flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="cal-item-filter">Filter by item</InputLabel>
          <Select labelId="cal-item-filter" label="Filter by item" value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
            <MenuItem value="">All items</MenuItem>
            {items.map((i: any) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
        <IconButton onClick={() => setWeekStart((w) => addDays(w, -7))}><ChevronLeftIcon /></IconButton>
        <Typography variant="subtitle1" sx={{ minWidth: 220, textAlign: 'center' }}>
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Typography>
        <IconButton onClick={() => setWeekStart((w) => addDays(w, 7))}><ChevronRightIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Could not load bookings.</Alert>}
      {loading && !data && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(7, 1fr)' }, gap: 1, alignItems: 'start' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const list = byDay.get(key) ?? [];
          const today = isSameDay(day, new Date());
          return (
            <Box key={key} sx={{ border: '1px solid', borderColor: today ? 'primary.main' : 'divider', borderRadius: 1, minHeight: 120, p: 0.75, bgcolor: today ? 'primary.50' : 'transparent' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                {format(day, 'EEE d')}
              </Typography>
              <Stack spacing={0.75}>
                {list.length === 0 && <Typography variant="caption" color="text.secondary">—</Typography>}
                {list.map((b) => (
                  <Box key={b._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.75, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>{b.inventoryName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {b.kind === 'TIMED'
                        ? `${b.startTime ? format(new Date(b.startTime), 'h:mm a') : ''}–${b.endTime ? format(new Date(b.endTime), 'h:mm a') : ''}`
                        : `${b.quantity} units`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                      {b.ownerName || b.ownerEmail}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={b.usageConfirmed ? 'Confirmed' : b.status} color={b.usageConfirmed ? 'success' : STATUS_COLOR[b.status] ?? 'default'} sx={{ height: 18 }} />
                      {b.cost != null && <Typography variant="caption">${Number(b.cost).toFixed(2)}</Typography>}
                      <Box sx={{ flex: 1 }} />
                      {!b.usageConfirmed && b.billingStatus !== 'BILLED' && (
                        <Tooltip title="Confirm usage">
                          <IconButton size="small" color="success" onClick={() => openConfirm(b)}><CheckCircleIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                      )}
                      {b.billingStatus !== 'BILLED' && (
                        <Tooltip title="Cancel booking">
                          <IconButton size="small" color="error" onClick={() => doCancel(b._id)}><CloseIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

      <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm usage — {confirmTarget?.inventoryName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirm the actual {confirmTarget?.kind === 'TIMED' ? 'hours used' : 'quantity used'}. This is what gets billed.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={confirmTarget?.kind === 'TIMED' ? 'Actual hours' : 'Actual quantity'}
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            inputProps={{ min: 0, step: confirmTarget?.kind === 'TIMED' ? '0.25' : '1' }}
          />
          {confirmTarget?.rateSnapshot != null && Number.isFinite(Number(actualValue)) && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              Cost: ${(Number(actualValue) * confirmTarget.rateSnapshot).toFixed(2)} ({confirmTarget.rateSnapshot.toFixed(2)}/{confirmTarget.kind === 'TIMED' ? 'hr' : 'unit'})
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
