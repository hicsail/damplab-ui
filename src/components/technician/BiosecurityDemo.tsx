import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import VerifiedIcon from '@mui/icons-material/Verified';
import AclidLogo from '../../assets/logos/aclid.svg';
import { BiosecurityStatusIcon } from './BiosecurityScreeningSections';
import {
  BIOSECURITY_SCREENING_GROUPS,
  type BiosecurityScreeningKey,
  type BiosecurityScreeningStatus,
  type BiosecurityScreenings
} from './biosecurityStatus';

/**
 * Scripted Biosecurity screening for screen recordings. "Run demo pass" /
 * "Run demo fail" play a fake run in page state only: nothing is sent to the
 * server or saved, and a refresh returns the card to the job's real screening.
 */

export type DemoMode = 'pass' | 'fail';
type DemoStageStatus = 'QUEUED' | BiosecurityScreeningStatus;

export const DEMO_CUSTOMER_NAME = 'John Doe';

const THINK_MS = 1200;
const STAGE_MS = 1400;

const STAGE_ORDER: BiosecurityScreeningKey[] = ['HOMOLOGY', 'CUSTOMER', 'METADATA', 'WATERMARKING', 'FUNCTIONAL'];

interface StageScript {
  title: string;
  provider: 'aclid' | 'damplab';
  running: string;
  passed: string[];
  /** What the fail run reports instead; stages without it pass in both runs. */
  failed?: string[];
}

const STAGES: Record<BiosecurityScreeningKey, StageScript> = {
  HOMOLOGY: {
    title: 'Homology',
    provider: 'aclid',
    running: 'Comparing 4 sequences (9,842 bp) against regulated sequence databases…',
    passed: [
      '2 sequences · 9,842 bp screened',
      'No matches to sequences of concern',
      'Regulatory status: not controlled'
    ],
    failed: [
      '2 sequences · 9,842 bp screened',
      'Match to a regulated sequence of concern in 1 sequence',
      'Hit: fragment 2 (bp 212–361), 94% identity over 150 bp',
      'Regulatory status: controlled — review required before work begins'
    ]
  },
  CUSTOMER: {
    title: 'Customer',
    provider: 'aclid',
    running: 'Verifying identity and institutional affiliation…',
    passed: [
      'Identity check passed',
      'Verified researcher credentials and available research history',
      'Captured biosafety approvals, documentation, and contacts'
    ]
  },
  METADATA: {
    title: 'Metadata',
    provider: 'damplab',
    running: 'Checking order metadata against stated use…',
    passed: [
      'No intermediate revisions flagged in design history',
      'Design provenance appears consistent with stated use'
    ],
    failed: [
      'Design provenance: Revision 13 flagged (see details)',
      'Review of design history required'
    ]
  },
  WATERMARKING: {
    title: 'Watermarking',
    provider: 'damplab',
    running: 'Scanning constructs for provenance watermarks…',
    passed: ['No conflicting provenance watermarks found', 'Lab watermark recorded on 1 construct']
  },
  FUNCTIONAL: {
    title: 'Functional',
    provider: 'damplab',
    running: 'Predicting function of encoded proteins…',
    passed: ['Predicted function: fluorescent protein (GFP family)', 'No hazardous function predicted'],
    failed: [
      'Fragment 2: toxin-associated domain predicted',
      'Potentially hazardous function — review required'
    ]
  }
};

export interface BiosecurityDemoState {
  mode: DemoMode;
  stages: Record<BiosecurityScreeningKey, DemoStageStatus>;
  done: boolean;
}

/** Drives the scripted run. Timers are cleared on unmount and when a new run starts. */
export function useBiosecurityDemo() {
  const [demo, setDemo] = useState<BiosecurityDemoState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const start = useCallback((mode: DemoMode) => {
    clearTimers();
    const queued = Object.fromEntries(STAGE_ORDER.map((k) => [k, 'QUEUED'])) as BiosecurityDemoState['stages'];
    setDemo({ mode, stages: queued, done: false });

    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    const setStage = (key: BiosecurityScreeningKey, status: DemoStageStatus) =>
      setDemo((d) => (d ? { ...d, stages: { ...d.stages, [key]: status } } : d));

    STAGE_ORDER.forEach((key, i) => {
      const begin = THINK_MS + i * STAGE_MS;
      at(begin, () => setStage(key, 'IN_PROGRESS'));
      at(begin + STAGE_MS - 200, () => setStage(key, mode === 'fail' && STAGES[key].failed ? 'FAILED' : 'PASSED'));
    });
    at(THINK_MS + STAGE_ORDER.length * STAGE_MS, () => setDemo((d) => (d ? { ...d, done: true } : d)));
  }, []);

  return { demo, start, running: Boolean(demo && !demo.done) };
}

/** The demo's statuses in the card's own shape, for the pane's glance icons and rollup. */
export function demoScreenings(demo: BiosecurityDemoState): BiosecurityScreenings {
  return Object.fromEntries(
    STAGE_ORDER.map((k) => [k, demo.stages[k] === 'QUEUED' ? 'UNAVAILABLE' : demo.stages[k]])
  ) as BiosecurityScreenings;
}

export function demoPaneText(demo: BiosecurityDemoState): { status: string; description: string; color: 'info' | 'success' | 'error' } {
  const complete = STAGE_ORDER.filter((k) => demo.stages[k] === 'PASSED' || demo.stages[k] === 'FAILED').length;
  if (!demo.done) {
    return {
      status: 'Screening in progress',
      description: complete === 0 ? 'Submitting sequences and order details to screening…' : `${complete} of ${STAGE_ORDER.length} screenings complete`,
      color: 'info'
    };
  }
  return demo.mode === 'pass'
    ? { status: 'Passed', description: 'All 5 screenings ran successfully. No concerns found.', color: 'success' }
    : {
        status: 'Failed',
        description: 'All 5 screenings ran successfully. Homology, Metadata and Functional flagged concerns.',
        color: 'error'
      };
}

/** The lab's side of the rail clears only when every screening passed. */
export function demoLabPassed(demo: BiosecurityDemoState | null): boolean {
  return Boolean(demo?.done && demo.mode === 'pass');
}

export function demoCustomerVerified(demo: BiosecurityDemoState | null): boolean {
  return demo?.stages.CUSTOMER === 'PASSED';
}

const ACCENT: Record<DemoStageStatus, string> = {
  QUEUED: 'grey.300',
  IN_PROGRESS: 'info.main',
  PASSED: 'success.main',
  FAILED: 'error.main',
  UNAVAILABLE: 'grey.300'
};

const STATUS_TEXT: Record<DemoStageStatus, string> = {
  QUEUED: 'Queued',
  IN_PROGRESS: 'Screening…',
  PASSED: 'Passed',
  FAILED: 'Failed',
  UNAVAILABLE: 'Unavailable'
};

function ProviderMark({ provider }: { provider: StageScript['provider'] }): React.JSX.Element {
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

function StageCard({
  stageKey,
  status,
  mode,
  onReportingGuidelines
}: {
  stageKey: BiosecurityScreeningKey;
  status: DemoStageStatus;
  mode: DemoMode;
  onReportingGuidelines: () => void;
}): React.JSX.Element {
  const script = STAGES[stageKey];
  const lines = status === 'FAILED' ? script.failed ?? script.passed : script.passed;
  const finished = status === 'PASSED' || status === 'FAILED';
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
          {script.title}
        </Typography>
        <ProviderMark provider={script.provider} />
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: status === 'FAILED' ? 'error.main' : status === 'PASSED' ? 'success.dark' : 'text.secondary'
        }}
      >
        {STATUS_TEXT[status]}
      </Typography>

      {stageKey === 'CUSTOMER' && finished && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {DEMO_CUSTOMER_NAME}
          </Typography>
          <Chip size="small" color="success" icon={<VerifiedIcon />} label="Verified" />
        </Box>
      )}

      {status === 'IN_PROGRESS' && (
        <>
          <LinearProgress sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {script.running}
          </Typography>
        </>
      )}

      {finished && (
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {lines.map((line) => (
            <Box component="li" key={line} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
              {status === 'FAILED' ? (
                <ErrorOutlineIcon sx={{ fontSize: 16, mt: '2px', color: 'error.main' }} />
              ) : (
                <CheckIcon sx={{ fontSize: 16, mt: '2px', color: 'success.main' }} />
              )}
              <Typography variant="body2">{line}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {status === 'FAILED' && mode === 'fail' && stageKey === 'HOMOLOGY' && (
        <Box>
          <Button size="small" variant="contained" color="error" startIcon={<GavelIcon />} onClick={onReportingGuidelines} sx={{ textTransform: 'none', mt: 0.5 }}>
            Reporting Guidelines
          </Button>
        </Box>
      )}
    </Box>
  );
}

export function BiosecurityDemoStages({ demo }: { demo: BiosecurityDemoState }): React.JSX.Element {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {demo.done && (
        <Alert severity="success" variant="outlined">
          All 5 screenings ran successfully
          {demo.mode === 'fail'
            ? '. Homology, Metadata and Functional flagged concerns that need review.'
            : ', with no concerns found.'}
        </Alert>
      )}
      {BIOSECURITY_SCREENING_GROUPS.map((group) => (
        <Box key={group.key}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
            {group.label}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                md: `repeat(${group.screenings.length}, minmax(0, 1fr))`
              }
            }}
          >
            {group.screenings.map((s) => (
              <StageCard
                key={s.key}
                stageKey={s.key}
                status={demo.stages[s.key]}
                mode={demo.mode}
                onReportingGuidelines={() => setGuidelinesOpen(true)}
              />
            ))}
          </Box>
        </Box>
      ))}

      <Dialog open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Whitehouse Reporting Guidelines</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Report potentially illegitimate purchase orders of synthetic nucleic acids involving SOCs or of benchtop nucleic acid synthesis equipment
          </Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1 } }}>
            <Typography variant="body2">To adhere to this screening framework, Providers and Manufacturers should develop criteria to determine when not to fill an order, based on this framework and as informed by the results of sequence and/or customer screening. In such cases, Providers and Manufacturers should follow the 2023 HHS Guidance and report flagged orders to relevant authorities, including, where appropriate, to an FBI Field Office. There are 56 FBI Field Offices across the United States and Puerto Rico. Each FBI Field Office has a WMD Coordinator. Providers can identify FBI Field Offices using the above link. Flagged orders can be reported to a Field Office or through FBI’s general hotline for reporting suspicious WMD-related activity, 855-TELL-FBI (855-835-5324). Providers and Manufacturers may contact the WMD Coordinator at their respective Field Office to establish a relationship even before a flagged order occurs.</Typography>
            <br/>
            <Typography variant="body2">In cases where Providers and Manufacturers suspect that customers may be attempting to violate federal export control laws, Providers and Manufacturers are encouraged to report such violations to the U.S. Department of Commerce Bureau of Industry and Security through its website or by calling the Enforcement Hotline at 800-424-2980. Cyber incidents can be reported to the Cybersecurity Infrastructure Security Agency of the U.S. Department of Homeland Security under the Cyber Incident Reporting for Critical Infrastructure Act.</Typography>
            <br/>
            <Typography variant="body2">Actions to take:</Typography>
            <ul>
              <li><Typography variant="body2"><a href="" target="_blank" rel="noopener noreferrer">Request additional info from the customer</a></Typography></li>
              <li><Typography variant="body2"><a href="" target="_blank" rel="noopener noreferrer">Reject the order</a></Typography></li>
              <li><Typography variant="body2"><a href="" target="_blank" rel="noopener noreferrer">Contact the IRB</a></Typography></li>
              <li><Typography variant="body2"><a href="" target="_blank" rel="noopener noreferrer">Report to FBI Field Office</a></Typography></li>
              <li><Typography variant="body2"><a href="" target="_blank" rel="noopener noreferrer">Find additional information here</a></Typography></li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuidelinesOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
