import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScreeningResultCard from './ScreeningResultCard';
import { BIOSECURITY_SCREENING_GROUPS } from './biosecurityStatus';
import type { ScreeningRunCard } from './screeningRunTypes';
import { aclidResultLegs, customerCardView, homologyCardView, PLANNED_FEATURE_TEXT } from './screeningRunView';

const GROUP_HEADING_SX = { mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' } as const;

/** The newest run's real results: Homology and Customer cards, and the planned screenings collapsed below. */
export default function ScreeningResults({ run }: { run: ScreeningRunCard | null }): React.JSX.Element {
  const [primary, additional] = BIOSECURITY_SCREENING_GROUPS;
  const aclidLegs = aclidResultLegs(run);
  const views = { HOMOLOGY: homologyCardView(run), CUSTOMER: customerCardView(run) } as const;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={GROUP_HEADING_SX}>
          {primary.label}
        </Typography>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: `repeat(${primary.screenings.length}, minmax(0, 1fr))` } }}>
          {primary.screenings.map((s) => {
            const view = views[s.key as keyof typeof views];
            return (
              <ScreeningResultCard
                key={s.key}
                title={s.label}
                provider={aclidLegs[s.key as keyof typeof aclidLegs] ? 'aclid' : null}
                status={view.status}
                statusText={view.statusText}
                running={view.status === 'IN_PROGRESS' ? 'Waiting for the screening to finish…' : undefined}
                lines={view.lines}
              />
            );
          })}
        </Box>
      </Box>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
            {additional.label}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: `repeat(${additional.screenings.length}, minmax(0, 1fr))` } }}>
            {additional.screenings.map((s) => (
              <ScreeningResultCard key={s.key} title={s.label} provider="damplab" status="UNAVAILABLE" statusText="" lines={[PLANNED_FEATURE_TEXT]} />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
