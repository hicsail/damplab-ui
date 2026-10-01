import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ProcessCard from './technician/ProcessCard';
import StatusPaneHeader from './technician/StatusPaneHeader';
import { chipStatusBackground } from '../utils/technicianProcessStatus';

/**
 * The job page's Results card. Staff page only: the client page does not render
 * it (the human hid it from clients until results are real).
 *
 * Placeholder content for screen recordings: every job reads as completed with
 * the same generic findings until results are stored on the job. The lines
 * live here so they are easy to find and change.
 */
/** Said on the card itself, so no one mistakes the placeholder for a real result. */
export const RESULTS_DEMO_NOTE = 'Demo content — clients do not see this card.';

const RESULT_LINES = [
  'Job has been completed successfully',
  'Sequencing result matches target sequence',
  'See Report for additional details'
];

const REPORT_CONTENTS = [
  'Sequencing traces and alignment to the target sequence',
  'Plasmid map of the final construct',
  'QC summary: concentration, purity and gel images'
];

interface Props {
  jobDisplayId?: string | null;
}

const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

function CheckedLine({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 18, mt: '1px', color: 'success.main' }} />
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

export default function ResultsPanel({ jobDisplayId }: Props): React.JSX.Element {
  const [reportOpen, setReportOpen] = useState(false);
  const reportTitle = jobDisplayId ? `Report ${jobDisplayId}` : 'Report';

  return (
    <>
      <ProcessCard
        title="Results"
        defaultExpanded
        customerBadge="check"
        staffBadge="check"
        customerVersion="Delivered"
        staffVersion="Complete"
        statusPaneSx={{ bgcolor: chipStatusBackground('success') }}
        statusPane={
          <StatusPaneHeader status="Completed" reference={reportTitle} description={RESULTS_DEMO_NOTE}>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {RESULT_LINES.map((line) => (
                <CheckedLine key={line}>{line}</CheckedLine>
              ))}
            </Box>
          </StatusPaneHeader>
        }
        actions={
          <Button variant="contained" size="small" startIcon={<DescriptionOutlinedIcon />} onClick={() => setReportOpen(true)} sx={railBtnSx}>
            View report
          </Button>
        }
        details={
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              The report includes
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {REPORT_CONTENTS.map((line) => (
                <CheckedLine key={line}>{line}</CheckedLine>
              ))}
            </Box>
          </Box>
        }
      />

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{reportTitle}</DialogTitle>
        <DialogContent dividers>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {RESULT_LINES.slice(0, 2).map((line) => (
              <CheckedLine key={line}>{line}</CheckedLine>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Placeholder: the full report will appear here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
