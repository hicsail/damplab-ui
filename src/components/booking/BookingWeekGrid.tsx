import React, { useMemo } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { BookingWindow, DaySpan, isOutsideWindow, spansForWeek } from '../../utils/jobEquipmentBooking';

/** A hold on the item that is not one of the caller's own bookings here. */
export interface BusySlot {
  label: string;
  start?: string | Date | null;
  end?: string | Date | null;
}

interface Props {
  weekStart: Date;
  onWeekStart: (weekStart: Date) => void;
  /** The caller's own bookings on this item — drawn in full, with actions. */
  bookings: any[];
  /** Everyone else's holds on this item — drawn grey, so a refused slot is visible before it is tried. */
  busy?: BusySlot[];
  /** The operation's estimated window, when there is one; flags bookings that drift outside it. */
  window?: BookingWindow;
  /** Show Edit / Cancel on the caller's own bookings. */
  canAct?: boolean;
  onEdit?: (booking: any) => void;
  onCancel?: (bookingId: string) => void;
  /** Clicking a day card proposes a slot on that day. Absent → cards are inert. */
  onDayClick?: (day: Date) => void;
}

const timeLabel = (span: DaySpan<unknown>): string => {
  const from = span.continuesBefore ? 'start' : format(span.start, 'h:mm a');
  const to = span.continuesAfter ? 'end of day' : format(span.end, 'h:mm a');
  return `${from} – ${to}`;
};

/**
 * Seven day cards for one week: the caller's bookings in full, other holds in
 * grey. A range that spans several days appears on each of them (see
 * `spansForWeek`), which is what stops a busy week from looking free.
 */
export default function BookingWeekGrid({ weekStart, onWeekStart, bookings, busy = [], window: estimatedWindow, canAct, onEdit, onCancel, onDayClick }: Props): React.JSX.Element {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const mine = useMemo(() => spansForWeek(bookings, weekStart, (b: any) => ({ start: b.startTime, end: b.endTime })), [bookings, weekStart]);
  const held = useMemo(() => spansForWeek(busy, weekStart, (s) => ({ start: s.start, end: s.end })), [busy, weekStart]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Button size="small" onClick={() => onWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          This week
        </Button>
        <IconButton size="small" aria-label="Previous week" onClick={() => onWeekStart(addDays(weekStart, -7))}>
          <ChevronLeftIcon fontSize="inherit" />
        </IconButton>
        <Typography variant="caption" sx={{ minWidth: 180, textAlign: 'center' }}>
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Typography>
        <IconButton size="small" aria-label="Next week" onClick={() => onWeekStart(addDays(weekStart, 7))}>
          <ChevronRightIcon fontSize="inherit" />
        </IconButton>
        {onDayClick && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Click a day to book it.
          </Typography>
        )}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(7, 1fr)' }, gap: 1, alignItems: 'start' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const own = mine.get(key) ?? [];
          const other = held.get(key) ?? [];
          const today = isSameDay(day, new Date());
          return (
            <Box
              key={key}
              role={onDayClick ? 'button' : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              aria-label={onDayClick ? `Book ${format(day, 'EEEE, MMM d')}` : undefined}
              onClick={onDayClick ? () => onDayClick(day) : undefined}
              onKeyDown={
                onDayClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDayClick(day);
                      }
                    }
                  : undefined
              }
              sx={{
                border: '1px solid',
                borderColor: today ? 'primary.main' : 'divider',
                borderRadius: 1,
                minHeight: 90,
                p: 0.75,
                cursor: onDayClick ? 'pointer' : 'default',
                '&:hover': onDayClick ? { bgcolor: 'action.hover' } : undefined
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                {format(day, 'EEE d')}
              </Typography>
              <Stack spacing={0.75}>
                {own.length === 0 && other.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    —
                  </Typography>
                )}
                {own.map((span) => {
                  const b: any = span.item;
                  const outside = estimatedWindow ? isOutsideWindow(estimatedWindow, new Date(b.startTime), new Date(b.endTime)) : false;
                  return (
                    <Box
                      key={`${b._id}-${key}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1, p: 0.5, bgcolor: 'background.paper', cursor: 'default' }}
                    >
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                        {timeLabel(span)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        {b.cost != null && <Typography variant="caption">${Number(b.cost).toFixed(2)}</Typography>}
                        {outside && (
                          <Tooltip title="Outside the estimated window">
                            <WarningAmberIcon color="warning" sx={{ fontSize: 14 }} />
                          </Tooltip>
                        )}
                        <Box sx={{ flex: 1 }} />
                        {canAct && b.billingStatus !== 'BILLED' && (
                          <>
                            {onEdit && (
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => onEdit(b)}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onCancel && (
                              <Tooltip title="Cancel booking">
                                <IconButton size="small" color="error" onClick={() => onCancel(b._id)}>
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
                {other.map((span, i) => (
                  <Tooltip key={`busy-${key}-${i}`} title={span.item.label}>
                    <Box sx={{ borderRadius: 1, p: 0.5, bgcolor: 'action.disabledBackground', color: 'text.secondary' }}>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {timeLabel(span)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {span.item.label}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
