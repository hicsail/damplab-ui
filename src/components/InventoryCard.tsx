import { useState } from 'react';
import {
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InventoryHolderDetails from './InventoryHolderDetails';
import InventoryItemCalendarDrawer from './InventoryItemCalendarDrawer';

export interface InventoryItemRow {
  id: string;
  name: string;
  type?: string;
  location?: string;
  description?: string;
  bookable?: boolean;
}

export interface HolderInfo {
  nodeId: string;
  nodeLabel: string;
  serviceName?: string;
  jobName?: string;
  jobDisplayId?: string;
  startedAt?: string;
  estimatedMinutes?: number;
  assigneeDisplayName?: string;
}

export interface NextBookingInfo {
  startTime: string;
  ownerName?: string;
}

/** A calendar booking that covers this moment — the item is reserved even though no operation holds it. */
export interface CurrentBookingInfo {
  startTime: string;
  endTime: string;
  ownerName?: string;
  /** A job-scoped booking's note is "Job #NNNNN · <operation>"; a walk-up's is free text. */
  notes?: string;
  jobId?: string;
}

interface InventoryCardProps {
  item: InventoryItemRow;
  holder?: HolderInfo;
  /** Set when a booking is running right now; the card reads Booked, not Free. */
  currentBooking?: CurrentBookingInfo;
  nextBooking?: NextBookingInfo;
}

const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function InventoryCard({ item, holder, currentBooking, nextBooking }: InventoryCardProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const busy = !!holder || !!currentBooking;

  return (
    <Card variant='outlined' sx={{ borderColor: busy ? '#dc2626' : '#16a34a' }}>
      <CardContent>
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
          <PrecisionManufacturingIcon fontSize='small' />
          <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>{item.name}</Typography>
          {item.bookable && (
            <Tooltip title='View schedule'>
              <IconButton size='small' onClick={() => setCalendarOpen(true)}>
                <CalendarMonthIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          <Chip size='small' variant='outlined' color={item.bookable ? 'info' : 'default'} label={item.bookable ? 'Bookable' : 'Non-Bookable'} />
          <Chip
            size='small'
            color={busy ? 'warning' : 'success'}
            label={holder ? 'In use' : currentBooking ? 'Booked' : 'Free'}
          />
        </Stack>
        {item.location && (
          <Typography variant='body2' color='text.secondary'>{item.location}</Typography>
        )}
        {holder ? (
          <InventoryHolderDetails holder={holder} />
        ) : (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {item.description && (
              <Typography variant='caption' color='text.secondary' display='block'>
                {item.description}
              </Typography>
            )}
            {currentBooking && (
              <Typography variant='caption' color='warning.main' display='block'>
                Booked {when(currentBooking.startTime)} – {when(currentBooking.endTime)}
                {currentBooking.jobId ? ` · ${currentBooking.notes || 'job booking'}` : currentBooking.ownerName ? ` · ${currentBooking.ownerName}` : ''}
              </Typography>
            )}
            {nextBooking && (
              <Typography variant='caption' color='info.main' display='block'>
                Next booking: {new Date(nextBooking.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {nextBooking.ownerName ? ` · ${nextBooking.ownerName}` : ''}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
      {item.bookable && (
        <InventoryItemCalendarDrawer
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          itemId={item.id}
          itemName={item.name}
        />
      )}
    </Card>
  );
}
