import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CircleIcon from '@mui/icons-material/Circle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AclidLogo from '../../assets/logos/aclid.svg';
import { BiosecurityStatusIcon } from './BiosecurityScreeningSections';
import type { BiosecurityScreeningStatus } from './biosecurityStatus';

/** One screening's card: the demo's scripted stages and the real run results both render through it. */

export type ScreeningCardStatus = 'QUEUED' | BiosecurityScreeningStatus;

const ACCENT: Record<ScreeningCardStatus, string> = {
  QUEUED: 'grey.300',
  IN_PROGRESS: 'info.main',
  PASSED: 'success.main',
  FAILED: 'error.main',
  UNAVAILABLE: 'grey.300'
};

const STATUS_TEXT: Record<ScreeningCardStatus, string> = {
  QUEUED: 'Queued',
  IN_PROGRESS: 'Screening…',
  PASSED: 'Passed',
  FAILED: 'Failed',
  UNAVAILABLE: 'Unavailable'
};

function ProviderMark({ provider }: { provider: 'aclid' | 'damplab' }): React.JSX.Element {
  if (provider === 'aclid') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary">
          Screened by
        </Typography>
        <Box component="img" src={AclidLogo} alt="Aclid" sx={{ height: 18, width: 'auto', display: 'block' }} />
      </Box>
    );
  }
  return (
    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
      DAMP Lab
    </Typography>
  );
}

export default function ScreeningResultCard({
  title,
  provider,
  status,
  statusText,
  running,
  lines,
  headerExtra,
  footer
}: {
  title: string;
  provider: 'aclid' | 'damplab';
  status: ScreeningCardStatus;
  /** Overrides the status's own wording; an empty string renders no status line. */
  statusText?: string;
  /** Shown under a progress bar while the status is IN_PROGRESS. */
  running?: string;
  lines: string[];
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  const text = statusText ?? STATUS_TEXT[status];
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: status === 'FAILED' ? 'error.light' : 'divider',
        borderLeft: '5px solid',
        borderLeftColor: ACCENT[status],
        borderRadius: 1.5,
        p: 2,
        bgcolor: status === 'FAILED' ? 'rgba(211, 47, 47, 0.04)' : 'background.paper',
        opacity: status === 'QUEUED' ? 0.6 : 1,
        transition: 'opacity 300ms, border-color 300ms',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {status === 'QUEUED' ? (
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: '2px dashed', borderColor: 'grey.400', flexShrink: 0 }} />
        ) : (
          <BiosecurityStatusIcon status={status} fontSize="medium" />
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        <ProviderMark provider={provider} />
      </Box>

      {text !== '' && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: status === 'FAILED' ? 'error.main' : status === 'PASSED' ? 'success.dark' : 'text.secondary'
          }}
        >
          {text}
        </Typography>
      )}

      {headerExtra}

      {status === 'IN_PROGRESS' && running && (
        <>
          <LinearProgress sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {running}
          </Typography>
        </>
      )}

      {lines.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {lines.map((line, i) => (
            <Box component="li" key={`${i}-${line}`} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
              {status === 'FAILED' ? (
                <ErrorOutlineIcon sx={{ fontSize: 16, mt: '2px', color: 'error.main' }} />
              ) : status === 'PASSED' ? (
                <CheckIcon sx={{ fontSize: 16, mt: '2px', color: 'success.main' }} />
              ) : (
                <CircleIcon sx={{ fontSize: 6, mt: '7px', mx: '5px', color: 'text.disabled' }} />
              )}
              <Typography variant="body2">{line}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {footer}
    </Box>
  );
}
