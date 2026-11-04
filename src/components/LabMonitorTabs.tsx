import { Box, Tab, Tabs } from '@mui/material';
import { Link } from 'react-router';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import VideocamIcon from '@mui/icons-material/Videocam';

/**
 * The tab bar shared by the Lab Monitor views for one screen (north/south): the
 * operations board and the camera feeds. Each tab is a real link, so the view is
 * deep-linkable and keeps the screen in the URL.
 */
export default function LabMonitorTabs({
  screen,
  current,
}: {
  screen: string;
  current: 'board' | 'cameras';
}) {
  return (
    <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 2, flexShrink: 0 }}>
      <Tabs value={current} aria-label="Lab monitor views">
        <Tab
          value="board"
          label="Operations Board"
          icon={<ViewColumnIcon />}
          iconPosition="start"
          component={Link}
          to={`/lab-monitor/${screen}`}
          sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          value="cameras"
          label="Cameras"
          icon={<VideocamIcon />}
          iconPosition="start"
          component={Link}
          to={`/lab-monitor/${screen}/cameras`}
          sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>
    </Box>
  );
}
