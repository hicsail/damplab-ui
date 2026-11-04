import React from 'react';
import { Navigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import InsightsIcon from '@mui/icons-material/Insights';
import ScienceIcon from '@mui/icons-material/Science';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CircularProgress from '@mui/material/CircularProgress';
import { LAB_CAMERAS, cameraStreamUrl, type LabCamera } from '../constants/cameras';
import LabMonitorTabs from '../components/LabMonitorTabs';

/** A ticking header clock, matching the Lab Monitor board. */
function useClock() {
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return { time, date };
}

/**
 * One camera's live feed.
 *
 * The stream is MediaMTX's own player page, embedded in an iframe — no video
 * library needed. An iframe does not reliably report a failed stream (its
 * `onLoad` fires either way), so instead of guessing "offline" we always offer a
 * reload and a direct link, and surface a spinner until the first load settles.
 */
function CameraTile({
  camera,
  onExpand,
}: {
  camera: LabCamera;
  onExpand: (camera: LabCamera) => void;
}) {
  const url = cameraStreamUrl(camera.id);
  const [loaded, setLoaded] = React.useState(false);
  // Bumping the key remounts the iframe, which is the simplest reliable reload.
  const [reloadKey, setReloadKey] = React.useState(0);

  const reload = () => {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <VideocamIcon sx={{ color: '#dc2626', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }} noWrap>
            {camera.label}
          </Typography>
          {camera.room && <Chip size="small" label={camera.room} sx={{ height: 20 }} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Reload feed">
            <IconButton size="small" onClick={reload}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Expand">
            <IconButton size="small" onClick={() => onExpand(camera)}>
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open feed in new tab">
            <IconButton size="small" component={Link} href={url} target="_blank" rel="noopener">
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#000',
        }}
      >
        {!loaded && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: '#9ca3af',
            }}
          >
            <CircularProgress size={28} sx={{ color: '#9ca3af' }} />
            <Typography variant="caption">Connecting to {camera.label}…</Typography>
          </Box>
        )}
        <Box
          key={reloadKey}
          component="iframe"
          src={url}
          title={camera.label}
          onLoad={() => setLoaded(true)}
          allow="autoplay; fullscreen"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
        />
      </Box>
    </Card>
  );
}

/** Expanded single-feed view. */
function CameraDialog({
  camera,
  onClose,
}: {
  camera: LabCamera | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!camera} onClose={onClose} maxWidth="lg" fullWidth>
      {camera && (
        <DialogContent sx={{ p: 0, backgroundColor: '#000', position: 'relative' }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.4)',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="iframe"
            src={cameraStreamUrl(camera.id)}
            title={`${camera.label} (expanded)`}
            allow="autoplay; fullscreen"
            sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', border: 0 }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

/**
 * Reserved space for future observation analytics. Intentionally empty of data:
 * the DAMP Lab's interest is whether subtle differences in how a protocol is
 * performed affect results (reproducibility), but the metrics have not been
 * defined yet. These panels mark where that could live without implying any of it
 * exists — no measurements, no tracking, no computer vision.
 */
const ANALYTICS_PANELS: Array<{ title: string; blurb: string; icon: React.ReactNode }> = [
  {
    title: 'Technique Consistency',
    blurb: 'Compare how the same protocol step is performed across runs and technicians.',
    icon: <ScienceIcon sx={{ color: '#6b7280' }} />,
  },
  {
    title: 'Procedure Timing',
    blurb: 'Track how long each step takes to spot drift and outliers over time.',
    icon: <TimelineIcon sx={{ color: '#6b7280' }} />,
  },
  {
    title: 'Observed vs. Expected',
    blurb: 'Relate what was observed at the bench to the experiment\u2019s outcome.',
    icon: <CompareArrowsIcon sx={{ color: '#6b7280' }} />,
  },
];

function AnalyticsPlaceholder() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
        <InsightsIcon sx={{ color: '#6b7280' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#374151' }}>
          Experimental Analytics Dashboard
        </Typography>
        <Chip size="small" label="Coming soon" sx={{ height: 22 }} />
      </Box>
      <Typography
        variant="overline"
        sx={{ display: 'block', color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5, mb: 1.5 }}
      >
        Ideas for the analytics dashboard
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr' }}>
        {ANALYTICS_PANELS.map((panel) => (
          <Card
            key={panel.title}
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderStyle: 'dashed',
              backgroundColor: '#fafafa',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {panel.icon}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151' }}>
                  {panel.title}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                {panel.blurb}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export default function LabCameras() {
  const { screen } = useParams<{ screen: string }>();
  const { time, date } = useClock();
  const [expanded, setExpanded] = React.useState<LabCamera | null>(null);

  // Keep the cameras tab in step with the board's screen contract.
  if (screen !== 'north' && screen !== 'south') {
    return <Navigate to="/lab-monitor/north/cameras" replace />;
  }

  const subtitle = screen === 'north' ? 'North Monitor Lab' : 'South Monitor Lab';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        color: '#111827',
        p: 2,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          pb: 2,
          borderBottom: '1px solid #e5e7eb',
          flexWrap: 'wrap',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>
            DAMPlab
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideocamIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#111827' }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6b7280' }}>
          <AccessTimeIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{time}</Typography>
          <Typography variant="body2" sx={{ ml: 0.5 }}>{date}</Typography>
        </Box>
      </Box>

      <LabMonitorTabs screen={screen} current="cameras" />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          gap: 3,
        }}
      >
        {/* Left: the work-in-progress banner (over the cameras only) and the
            camera grid. The page scrolls here. */}
        <Box
          sx={{
            flex: { md: 1 },
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Alert severity="info" sx={{ mb: 2 }}>
            Work in progress — live views of the lab cameras. If a feed stays blank it may be offline;
            use the reload or open-in-new-tab controls on each feed. Feedback on what this should show is welcome.
          </Alert>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
            }}
          >
            {LAB_CAMERAS.map((camera) => (
              <CameraTile key={camera.id} camera={camera} onExpand={setExpanded} />
            ))}
          </Box>
        </Box>

        {/* Right: the analytics panel. It stays put on the right while the
            cameras scroll (sticky under the breadcrumb bar). */}
        <Box
          sx={{
            width: { xs: '100%', md: 360 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 'calc(var(--app-header-height, 64px) + var(--app-breadcrumb-height, 38px) + 16px)' },
            maxHeight: {
              md: 'calc(100vh - var(--app-header-height, 64px) - var(--app-breadcrumb-height, 38px) - 32px)',
            },
            overflowY: { md: 'auto' },
            alignSelf: 'flex-start',
            backgroundColor: '#ffffff',
            borderLeft: { md: '1px solid #e5e7eb' },
            borderTop: { xs: '1px solid #e5e7eb', md: 'none' },
            borderRadius: 1,
            mt: { xs: 2, md: 0 },
            pl: { md: 3 },
            pr: { md: 2 },
            py: 2,
            boxShadow: { md: '-6px 0 16px rgba(0,0,0,0.03)' },
          }}
        >
          <AnalyticsPlaceholder />
        </Box>
      </Box>

      <CameraDialog camera={expanded} onClose={() => setExpanded(null)} />
    </Box>
  );
}
