import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { addDays, startOfMonth } from 'date-fns';
import { GET_BOOKINGS } from '../gql/queries';
import BookingMonthGrid, { monthGrid } from './booking/BookingMonthGrid';

interface InventoryItemCalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
}

/**
 * A timed booking spans its slot; a consumable is a point on the day it was used.
 * Both go through the month grid's day clipping, so a multi-day reservation shows
 * on every day it covers rather than only the day it began.
 */
const bookingRange = (b: any): { start?: string | Date | null; end?: string | Date | null } => {
  if (b.kind === 'TIMED') return { start: b.startTime, end: b.endTime };
  if (!b.usedOn) return {};
  const at = new Date(b.usedOn);
  return { start: at, end: new Date(at.getTime() + 60_000) };
};

/** Who holds the slot: the job line for a job booking, the booker for a walk-up. */
const titleOf = (b: any): string => (b.jobId ? b.notes || 'Job booking' : b.ownerName || b.ownerEmail || 'Booking');

const detailOf = (b: any): string | undefined => {
  const status = b.usageConfirmed ? 'Confirmed' : b.status;
  return b.kind === 'TIMED' ? status : `${b.quantity} units · ${status}`;
};

/**
 * One item's schedule, in the same month view as the booking and schedule pages.
 * Read-only: booking happens on Book inventory, cancelling on the schedule page.
 */
export default function InventoryItemCalendarDrawer({ open, onClose, itemId, itemName }: InventoryItemCalendarDrawerProps) {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { first, dayCount } = useMemo(() => monthGrid(month), [month]);
  const gridEnd = useMemo(() => addDays(first, dayCount), [first, dayCount]);

  const { data, loading } = useQuery(GET_BOOKINGS, {
    variables: { from: first, to: gridEnd, inventoryItemId: itemId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
    skip: !open
  });

  const bookings: any[] = useMemo(() => (data?.bookings ?? []).filter((b: any) => b.status !== 'CANCELLED'), [data]);

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 900 } } }}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <Typography variant='h5' sx={{ fontWeight: 700, flex: 1 }}>{itemName}</Typography>
          <IconButton onClick={onClose} aria-label='Close'><CloseIcon /></IconButton>
        </Stack>

        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        )}

        <BookingMonthGrid month={month} onMonth={setMonth} bookings={bookings} rangeOf={bookingRange} titleOf={titleOf} detailOf={detailOf} />
      </Stack>
    </Drawer>
  );
}
