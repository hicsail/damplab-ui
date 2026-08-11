import { Box, Stack, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { HolderInfo } from './InventoryCard';

function elapsedMinutes(startedAt?: string | null): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 60000));
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return 'Overdue';
  return `~${formatDuration(minutes)} remaining`;
}

interface InventoryHolderDetailsProps {
  holder: HolderInfo;
}

export default function InventoryHolderDetails({ holder }: InventoryHolderDetailsProps) {
  const elapsed = elapsedMinutes(holder.startedAt);
  const remaining = (elapsed != null && holder.estimatedMinutes)
    ? Math.round(holder.estimatedMinutes - elapsed)
    : null;

  return (
    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, backgroundColor: 'action.hover' }}>
      <Typography variant='body2'>
        <strong>{holder.nodeLabel}</strong>
        {holder.jobName ? ` · ${holder.jobName}` : ''}
        {holder.jobDisplayId ? ` (${holder.jobDisplayId})` : ''}
      </Typography>
      <Typography variant='caption' color='text.secondary' display='block'>
        {holder.assigneeDisplayName ? `Assignee: ${holder.assigneeDisplayName}` : 'Unassigned'}
      </Typography>
      {elapsed != null && (
        <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 0.5 }}>
          <AccessTimeIcon sx={{ fontSize: 14 }} color='action' />
          <Typography variant='body2' sx={{ fontWeight: 500 }}>
            {formatDuration(elapsed)} elapsed
          </Typography>
        </Stack>
      )}
      <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 0.5 }}>
        {remaining !== null && remaining <= 0 ? (
          <>
            <WarningAmberIcon sx={{ fontSize: 14 }} color='error' />
            <Typography variant='body2' color='error' sx={{ fontWeight: 600 }}>
              Overdue
            </Typography>
          </>
        ) : remaining !== null ? (
          <>
            <AccessTimeIcon sx={{ fontSize: 14 }} color='action' />
            <Typography variant='body2' color='text.secondary'>
              {formatRemainingTime(remaining)}
            </Typography>
          </>
        ) : (
          <>
            <HelpOutlineIcon sx={{ fontSize: 14 }} color='disabled' />
            <Typography variant='body2' color='text.disabled'>
              No time estimate
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
