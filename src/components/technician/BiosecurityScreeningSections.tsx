import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  BIOSECURITY_SCREENING_GROUPS,
  biosecurityStatusLabel,
  type BiosecurityScreeningKey,
  type BiosecurityScreeningStatus,
  type BiosecurityScreenings
} from './biosecurityStatus';

/**
 * The Biosecurity card's details: every screening under its group, each one an
 * icon carrying its verdict. The icon is the thing you scan for, so the status
 * word stays beside it rather than only in a tooltip — colour alone is not a
 * status, and neither is a shape.
 */

const STATUS_ICONS: Record<
  BiosecurityScreeningStatus,
  { Icon: typeof CheckCircleIcon; color: string }
> = {
  PASSED: { Icon: CheckCircleIcon, color: 'success.main' },
  FAILED: { Icon: CancelIcon, color: 'error.main' },
  IN_PROGRESS: { Icon: AutorenewIcon, color: 'info.main' },
  UNAVAILABLE: { Icon: HelpOutlineIcon, color: 'text.disabled' }
};

export function BiosecurityStatusIcon({
  status,
  fontSize = 'small'
}: {
  status: BiosecurityScreeningStatus;
  fontSize?: 'small' | 'medium';
}): React.JSX.Element {
  const { Icon, color } = STATUS_ICONS[status] ?? STATUS_ICONS.UNAVAILABLE;
  const label = biosecurityStatusLabel(status);
  return <Icon fontSize={fontSize} sx={{ color }} titleAccess={label} aria-label={label} />;
}

interface Props {
  screenings: BiosecurityScreenings;
  /** Optional one-line "why" per screening, shown under its status. */
  notes?: Partial<Record<BiosecurityScreeningKey, string | null>>;
}

export default function BiosecurityScreeningSections({ screenings, notes }: Props): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {BIOSECURITY_SCREENING_GROUPS.map((group) => (
        <Box key={group.key}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {group.label}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {group.screenings.map((screening) => {
              const status = screenings[screening.key] ?? 'UNAVAILABLE';
              const statusLabel = biosecurityStatusLabel(status);
              const note = notes?.[screening.key];
              return (
                <Tooltip key={screening.key} title={note ? `${screening.label}: ${statusLabel} — ${note}` : `${screening.label}: ${statusLabel}`}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <BiosecurityStatusIcon status={status} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                        {screening.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
                        {statusLabel}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
