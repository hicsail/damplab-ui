import {
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import InventoryHolderDetails from './InventoryHolderDetails';

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

interface InventoryCardProps {
  item: InventoryItemRow;
  holder?: HolderInfo;
  nextBooking?: NextBookingInfo;
}

export default function InventoryCard({ item, holder, nextBooking }: InventoryCardProps) {
  return (
    <Card variant='outlined' sx={{ borderColor: holder ? '#dc2626' : '#16a34a' }}>
      <CardContent>
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
          <PrecisionManufacturingIcon fontSize='small' />
          <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>{item.name}</Typography>
          <Chip size='small' variant='outlined' color={item.bookable ? 'info' : 'default'} label={item.bookable ? 'Bookable' : 'Non-Bookable'} />
          <Chip
            size='small'
            color={holder ? 'warning' : 'success'}
            label={holder ? 'In use' : 'Free'}
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
            {nextBooking && (
              <Typography variant='caption' color='info.main' display='block'>
                Next booking: {new Date(nextBooking.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {nextBooking.ownerName ? ` · ${nextBooking.ownerName}` : ''}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
