import React from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
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
  /** Homology has a stored batch to open; the chip then acts as a button. */
  homologyDetailsAvailable?: boolean;
  onHomologyDetails?: () => void;
  /**
   * Customer has an Aclid screen the reader can act on. The customer's own job
   * page uses this to open identity verification; the staff page uses it to
   * copy the customer's verification link. Staff never run the embed as
   * themselves, so `customerClickLabel` says what the click actually does.
   */
  customerDetailsAvailable?: boolean;
  onCustomerDetails?: () => void;
  customerClickLabel?: string;
}

const CLICK_LABELS: Record<'HOMOLOGY' | 'CUSTOMER', string> = {
  HOMOLOGY: 'View homology screening details',
  CUSTOMER: 'Open identity verification'
};

export default function BiosecurityScreeningSections({
  screenings,
  notes,
  homologyDetailsAvailable = false,
  onHomologyDetails,
  customerDetailsAvailable = false,
  onCustomerDetails,
  customerClickLabel = CLICK_LABELS.CUSTOMER
}: Props): React.JSX.Element {
  const clickHandlerFor = (key: BiosecurityScreeningKey): (() => void) | undefined => {
    if (key === 'HOMOLOGY' && homologyDetailsAvailable) return onHomologyDetails;
    if (key === 'CUSTOMER' && customerDetailsAvailable) return onCustomerDetails;
    return undefined;
  };
  const clickLabelFor = (key: BiosecurityScreeningKey): string | undefined => {
    if (key === 'HOMOLOGY') return CLICK_LABELS.HOMOLOGY;
    if (key === 'CUSTOMER') return customerClickLabel;
    return undefined;
  };
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
              const onClick = clickHandlerFor(screening.key);
              const clickLabel = onClick ? clickLabelFor(screening.key) : undefined;
              const tooltip = clickLabel
                ? `${clickLabel} — ${statusLabel}${note ? ` — ${note}` : ''}`
                : note
                  ? `${screening.label}: ${statusLabel} — ${note}`
                  : `${screening.label}: ${statusLabel}`;
              const chip = (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    width: '100%'
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
              );
              return (
                <Tooltip key={screening.key} title={tooltip}>
                  {onClick && clickLabel ? (
                    <ButtonBase
                      onClick={onClick}
                      aria-label={clickLabel}
                      sx={{
                        borderRadius: 1,
                        textAlign: 'left',
                        '&:hover .screening-chip': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Box className="screening-chip" sx={{ width: '100%' }}>
                        {chip}
                      </Box>
                    </ButtonBase>
                  ) : (
                    chip
                  )}
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
