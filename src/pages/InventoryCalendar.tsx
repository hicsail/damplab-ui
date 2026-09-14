import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CloseIcon from '@mui/icons-material/Close';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_BOOKINGS } from '../gql/queries';
import { CANCEL_BOOKING } from '../gql/mutations';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import { formatSaveError } from '../utils/gqlError';
import { spansForWeek } from '../utils/jobEquipmentBooking';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success'> = {
  RESERVED: 'warning',
  IN_USE: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default'
};

/**
 * A timed booking spans its slot; a consumable is a point on the day it was used.
 * Both go through `spansForWeek`, so a multi-day reservation shows on every day it
 * covers rather than only the day it began.
 */
function bookingRange(b: any): { start?: string | Date | null; end?: string | Date | null } {
  if (b.kind === 'TIMED') return { start: b.startTime, end: b.endTime };
  if (!b.usedOn) return {};
  const at = new Date(b.usedOn);
  return { start: at, end: new Date(at.getTime() + 60_000) };
}

/** Two lines at most, then an ellipsis; the tooltip carries the whole text. */
const clamp = { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, wordBreak: 'break-word' as const };

export default function InventoryCalendar() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [itemFilter, setItemFilter] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * This calendar shows **every booking in the lab**, and the matrix amendment now
   * lets equipment users reach it. So the per-row controls are gated on ownership,
   * not on reaching the page:
   *
   * - **Confirm usage** lives on the job page (a billing act, not a scheduling
   *   one), so this board carries no confirm control.
   * - **Cancel** mirrors `cancelBooking`'s server-side rule exactly: owner, OR a
   *   caller holding `inventory:write`. Gating it on `inventory:schedule` instead
   *   would show an equipment user a Cancel on everyone else's slots that the
   *   server then refuses.
   *
   * Through `useEffectiveUser`, not raw `UserContext`, so Client View works.
   */
  const { can } = usePermissions();
  const { userProps } = useEffectiveUser();
  const canManageOthersBookings = can(PERMISSIONS.InventoryWrite);
  const mySub = userProps?.subject;
  /**
   * Mirrors the server rule. A job-scoped booking's owner is the JOB, so its
   * `ownerSub` is the job creator's — a listed booker who made the reservation
   * would see no Cancel at all under the walk-up rule. The full rule (job creator,
   * client email, listed booker of that operation, jobs:view-all) needs the job,
   * which this page does not load; whoever made the booking is the part of it this
   * page can answer, and the server refuses the rest.
   */
  const canCancel = (booking: any): boolean =>
    canManageOthersBookings || (!!mySub && (booking?.ownerSub === mySub || (!!booking?.jobId && booking?.createdBySub === mySub)));

  const weekEnd = addDays(weekStart, 7);
  const { data: invData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-first' });
  const { data, loading, error, refetch } = useQuery(GET_BOOKINGS, {
    variables: { from: weekStart, to: weekEnd, inventoryItemId: itemFilter || undefined },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000
  });

  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  const bookings: any[] = useMemo(() => (data?.bookings ?? []).filter((b: any) => b.status !== 'CANCELLED'), [data]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => spansForWeek(bookings, weekStart, bookingRange), [bookings, weekStart]);

  const doCancel = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await refetch();
    } catch (error) {
      console.error('Cancel booking failed:', error);
      setActionError(formatSaveError(error, 'this cancellation'));
    }
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
      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
      {loading && !data && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(7, minmax(0, 1fr))' }, gap: 1, alignItems: 'start' }}>
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
                {list.map((span) => {
                  const b: any = span.item;
                  const time =
                    b.kind === 'TIMED'
                      ? `${span.continuesBefore ? 'start' : format(span.start, 'h:mm a')} – ${span.continuesAfter ? 'end of day' : format(span.end, 'h:mm a')}`
                      : `${b.quantity} units`;
                  // A job-scoped booking's `notes` is already "Job #NNNNN · <operation>"
                  // — the server writes it that way — so the note is the title and the
                  // job line needs no second source of truth.
                  const title = b.notes || b.inventoryName;
                  const who = b.ownerName || b.ownerEmail || '';
                  return (
                  <Tooltip key={`${b._id}-${key}`} title={`${title} · ${b.inventoryName} · ${time}${who ? ` · ${who}` : ''}`}>
                  <Box sx={{ minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.75, bgcolor: 'background.paper' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2, ...clamp }}>{title}</Typography>
                    {b.notes && <Typography variant="caption" color="text.secondary" sx={{ ...clamp }}>{b.inventoryName}</Typography>}
                    <Typography variant="caption" color="text.secondary" sx={{ ...clamp }}>{time}</Typography>
                    {!b.jobId && who && <Typography variant="caption" color="text.secondary" sx={{ ...clamp }}>{who}</Typography>}
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={b.usageConfirmed ? 'Confirmed' : b.status} color={b.usageConfirmed ? 'success' : STATUS_COLOR[b.status] ?? 'default'} sx={{ height: 18 }} />
                      {b.cost != null && <Typography variant="caption">${Number(b.cost).toFixed(2)}</Typography>}
                      <Box sx={{ flex: 1 }} />
                      {canCancel(b) && b.billingStatus !== 'BILLED' && (
                        <Tooltip title="Cancel booking">
                          <IconButton size="small" color="error" onClick={() => doCancel(b._id)}><CloseIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                  </Tooltip>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Box>

    </Box>
  );
}
