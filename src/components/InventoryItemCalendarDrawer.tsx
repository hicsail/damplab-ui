import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { GET_BOOKINGS } from '../gql/queries';

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

interface InventoryItemCalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
}

export default function InventoryItemCalendarDrawer({ open, onClose, itemId, itemName }: InventoryItemCalendarDrawerProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = addDays(weekStart, 7);
  const { data, loading } = useQuery(GET_BOOKINGS, {
    variables: { from: weekStart, to: weekEnd, inventoryItemId: itemId },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
    skip: !open
  });

  const bookings: any[] = useMemo(
    () => (data?.bookings ?? []).filter((b: any) => b.status !== 'CANCELLED'),
    [data]
  );

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
      list.sort((a: any, b: any) => {
        const da = bookingDay(a)?.getTime() ?? 0;
        const db = bookingDay(b)?.getTime() ?? 0;
        return da - db;
      });
    }
    return map;
  }, [bookings]);

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 600 } } }}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <Typography variant='h5' sx={{ fontWeight: 700, flex: 1 }}>{itemName}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>

        <Stack direction='row' spacing={1} alignItems='center' justifyContent='center'>
          <IconButton size='small' onClick={() => setWeekStart((w) => addDays(w, -7))}><ChevronLeftIcon /></IconButton>
          <Typography variant='subtitle2' sx={{ minWidth: 180, textAlign: 'center' }}>
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </Typography>
          <IconButton size='small' onClick={() => setWeekStart((w) => addDays(w, 7))}><ChevronRightIcon /></IconButton>
          <Button size='small' onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
        </Stack>

        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        )}

        <Stack spacing={1}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const list = byDay.get(key) ?? [];
            const today = isSameDay(day, new Date());
            return (
              <Box
                key={key}
                sx={{
                  border: '1px solid',
                  borderColor: today ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: today ? 'primary.50' : 'transparent'
                }}
              >
                <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: list.length > 0 ? 1 : 0 }}>
                  {format(day, 'EEEE, MMM d')}
                </Typography>
                {list.length === 0 && (
                  <Typography variant='caption' color='text.secondary'>No bookings</Typography>
                )}
                <Stack spacing={0.75}>
                  {list.map((b: any) => (
                    <Box key={b._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'background.paper' }}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Typography variant='body2' sx={{ flex: 1 }}>
                          {b.kind === 'TIMED'
                            ? `${b.startTime ? format(new Date(b.startTime), 'h:mm a') : ''}–${b.endTime ? format(new Date(b.endTime), 'h:mm a') : ''}`
                            : `${b.quantity} units`}
                        </Typography>
                        <Chip
                          size='small'
                          label={b.usageConfirmed ? 'Confirmed' : b.status}
                          color={b.usageConfirmed ? 'success' : STATUS_COLOR[b.status] ?? 'default'}
                          sx={{ height: 20 }}
                        />
                      </Stack>
                      <Typography variant='caption' color='text.secondary' display='block'>
                        {b.ownerName || b.ownerEmail}
                      </Typography>
                      {b.cost != null && (
                        <Typography variant='caption' color='text.secondary'>
                          ${Number(b.cost).toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Drawer>
  );
}
