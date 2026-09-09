import React, { useMemo } from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { BookingWindow, DaySpan, isOutsideWindow, spansForDays } from '../../utils/jobEquipmentBooking';

/** A hold on the item that is not one of the caller's own bookings here. */
export interface BusySlot {
  label: string;
  start?: string | Date | null;
  end?: string | Date | null;
}

interface Props {
  month: Date;
  onMonth: (month: Date) => void;
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Two lines at most, then an ellipsis; the tooltip carries the whole text. */
const clamp = { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, wordBreak: 'break-word' as const };

const timeLabel = (span: DaySpan<unknown>): string => {
  const from = span.continuesBefore ? 'start' : format(span.start, 'h:mm a');
  const to = span.continuesAfter ? 'end of day' : format(span.end, 'h:mm a');
  return `${from} – ${to}`;
};

/** The first day of the month grid, and how many days it spans (whole weeks, Monday first). */
export function monthGrid(month: Date): { first: Date; dayCount: number } {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const last = endOfMonth(month);
  const dayCount = Math.ceil((differenceInCalendarDays(last, first) + 1) / 7) * 7;
  return { first, dayCount };
}

/**
 * A month of day cards: the caller's bookings in full, other holds in grey. A
 * range that spans several days appears on each of them (see `spansForDays`),
 * which is what stops a busy month from looking free. Every column is the same
 * width whatever it holds — `minmax(0, 1fr)` stops a long label widening its day.
 */
export default function BookingMonthGrid({ month, onMonth, bookings, busy = [], window: estimatedWindow, canAct, onEdit, onCancel, onDayClick }: Props): React.JSX.Element {
  const { first, dayCount } = useMemo(() => monthGrid(month), [month]);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => addDays(first, i)), [first, dayCount]);
  const mine = useMemo(() => spansForDays(bookings, first, dayCount, (b: any) => ({ start: b.startTime, end: b.endTime })), [bookings, first, dayCount]);
  const held = useMemo(() => spansForDays(busy, first, dayCount, (s) => ({ start: s.start, end: s.end })), [busy, first, dayCount]);

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Button size="small" onClick={() => onMonth(startOfMonth(new Date()))}>
          This month
        </Button>
        <IconButton size="small" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))}>
          <ChevronLeftIcon fontSize="inherit" />
        </IconButton>
        <Typography variant="subtitle2" sx={{ minWidth: 150, textAlign: 'center' }}>
          {format(month, 'MMMM yyyy')}
        </Typography>
        <IconButton size="small" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))}>
          <ChevronRightIcon fontSize="inherit" />
        </IconButton>
        {onDayClick && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Click a day to book it.
          </Typography>
        )}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, mb: 0.5 }}>
        {WEEKDAYS.map((d) => (
          <Typography key={d} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
            {d}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, alignItems: 'stretch' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const own = mine.get(key) ?? [];
          const other = held.get(key) ?? [];
          const today = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, month);
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
                minWidth: 0,
                border: '1px solid',
                borderColor: today ? 'primary.main' : 'divider',
                borderRadius: 1,
                minHeight: 84,
                p: 0.5,
                opacity: inMonth ? 1 : 0.55,
                cursor: onDayClick ? 'pointer' : 'default',
                '&:hover': onDayClick ? { bgcolor: 'action.hover' } : undefined
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>
                {format(day, 'd')}
              </Typography>
              <Stack spacing={0.5}>
                {own.map((span) => {
                  const b: any = span.item;
                  const outside = estimatedWindow ? isOutsideWindow(estimatedWindow, new Date(b.startTime), new Date(b.endTime)) : false;
                  const title = b.notes || b.inventoryName || 'Booking';
                  return (
                    <Tooltip key={`${b._id}-${key}`} title={`${title} · ${b.inventoryName ?? ''} · ${timeLabel(span)}`}>
                      <Box onClick={(e) => e.stopPropagation()} sx={{ minWidth: 0, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, p: 0.5, bgcolor: 'background.paper', cursor: 'default' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2, ...clamp }}>
                          {title}
                        </Typography>
                        <Typography variant="caption" sx={{ ...clamp }}>
                          {timeLabel(span)}
                        </Typography>
                        <Stack direction="row" spacing={0.25} alignItems="center">
                          {b.cost != null && <Typography variant="caption">${Number(b.cost).toFixed(2)}</Typography>}
                          {outside && <WarningAmberIcon color="warning" sx={{ fontSize: 14 }} />}
                          <Box sx={{ flex: 1 }} />
                          {canAct && b.billingStatus !== 'BILLED' && (
                            <>
                              {onEdit && (
                                <IconButton size="small" aria-label="Edit booking" onClick={() => onEdit(b)} sx={{ p: 0.25 }}>
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                              {onCancel && (
                                <IconButton size="small" aria-label="Cancel booking" color="error" onClick={() => onCancel(b._id)} sx={{ p: 0.25 }}>
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              )}
                            </>
                          )}
                        </Stack>
                      </Box>
                    </Tooltip>
                  );
                })}
                {other.map((span, i) => (
                  <Tooltip key={`busy-${key}-${i}`} title={`${span.item.label} · ${timeLabel(span)}`}>
                    <Box sx={{ minWidth: 0, borderRadius: 1, p: 0.5, bgcolor: 'action.disabledBackground', color: 'text.secondary' }}>
                      <Typography variant="caption" sx={{ lineHeight: 1.2, ...clamp }}>
                        {timeLabel(span)}
                      </Typography>
                      <Typography variant="caption" sx={{ ...clamp }}>
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
