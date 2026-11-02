import React from 'react';
import { ListItemText, MenuItem, Select, Typography } from '@mui/material';
import type { ScreeningRunSummary } from './screeningRunTypes';
import { NO_SCREENINGS_TEXT, screeningRunOptionLabel, screeningRunSecondary } from './screeningRunView';

interface Props {
  /** Newest first, as jobScreeningRuns returns them. */
  runs: ScreeningRunSummary[];
  onSelect: (runId: string) => void;
}

/**
 * The Biosecurity card's history picker, styled like JobVersionHistory. Picking an entry opens
 * that run's details; the Select itself stays on its placeholder so picking the same run twice
 * still opens it.
 */
export default function ScreeningHistory({ runs, onSelect }: Props): React.JSX.Element {
  if (runs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {NO_SCREENINGS_TEXT}
      </Typography>
    );
  }
  return (
    <Select
      size="small"
      displayEmpty
      value=""
      onChange={(event) => {
        if (event.target.value) onSelect(String(event.target.value));
      }}
      renderValue={() => `Screening history (${runs.length})`}
      sx={{ minWidth: 230, backgroundColor: 'background.paper' }}
      inputProps={{ 'aria-label': 'Screening history' }}
    >
      {runs.map((run) => (
        <MenuItem key={run.id} value={run.id}>
          <ListItemText primary={screeningRunOptionLabel(run)} secondary={screeningRunSecondary(run)} />
        </MenuItem>
      ))}
    </Select>
  );
}
