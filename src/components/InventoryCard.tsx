import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';

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
  assigneeDisplayName?: string;
}

function elapsedMinutes(startedAt?: string | null): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 60000));
}

interface InventoryCardProps {
  item: InventoryItemRow;
  holder?: HolderInfo;
}

export default function InventoryCard({ item, holder }: InventoryCardProps) {
  const elapsed = elapsedMinutes(holder?.startedAt);

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
          <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, backgroundColor: 'action.hover' }}>
            <Typography variant='body2'>
              <strong>{holder.nodeLabel}</strong>
              {holder.jobName ? ` · ${holder.jobName}` : ''}
              {holder.jobDisplayId ? ` (${holder.jobDisplayId})` : ''}
            </Typography>
            <Typography variant='caption' color='text.secondary' display='block'>
              {holder.assigneeDisplayName ? `Assignee: ${holder.assigneeDisplayName}` : 'Unassigned'}
              {elapsed != null ? ` · ${elapsed}m elapsed` : ''}
            </Typography>
          </Box>
        ) : (
          item.description && (
            <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
              {item.description}
            </Typography>
          )
        )}
      </CardContent>
    </Card>
  );
}
