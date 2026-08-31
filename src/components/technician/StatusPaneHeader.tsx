import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * The right-column status pane shared by every card on the job page.
 *
 * One shape for all of them: the status leads, any chips sit beside it, and the
 * document's reference number is pushed to the far right. Job and Statement of
 * Work used to lay these out inversely — Job led with the status, the SOW led
 * with its number — which is what this exists to stop happening again.
 *
 * Every slot but `status` is optional: the empty states ("Not generated yet",
 * "Job not loaded") have no reference number to show.
 */

interface Props {
  status: React.ReactNode;
  chips?: React.ReactNode;
  reference?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export default function StatusPaneHeader({
  status,
  chips,
  reference,
  description,
  children
}: Props): React.JSX.Element {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {status}
          </Typography>
          {chips}
        </Box>
        {reference != null && (
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            {reference}
          </Typography>
        )}
      </Box>
      {description != null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}
