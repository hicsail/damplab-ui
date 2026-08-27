import { useQuery } from '@apollo/client';
import { Alert, Box, Chip, CircularProgress, Divider, Paper, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import Markdown from '../components/ReactMarkdown';

/**
 * Every announcement the caller may see, newest first.
 *
 * The home page's `AnnouncementBox` shows only the newest visible one, so anything
 * older was unreachable — there was nowhere to go and read it. This is that place.
 *
 * View-only, and gated on `announcements:read`, which is baseline: everyone gets
 * this page. What differs per person is the *rows*, and the server decides those —
 * see `announcements(@CurrentUser)`.
 */
export default function AnnouncementsFeed() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENTS, { fetchPolicy: 'cache-and-network' });
  const announcements: any[] = (data?.announcements ?? []).filter((a: any) => a?.is_displayed);

  return (
    <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CampaignIcon color="primary" />
        <Typography variant="h2">Announcements</Typography>
      </Stack>

      {error && <Alert severity="error">Could not load announcements: {error.message}</Alert>}

      {loading && announcements.length === 0 && <CircularProgress />}

      {!loading && announcements.length === 0 && (
        <Typography variant="body1" color="text.secondary">
          No announcements right now.
        </Typography>
      )}

      {announcements.map((announcement) => (
        <Paper key={announcement.id ?? announcement.timestamp} variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              {new Date(announcement.timestamp).toLocaleString()}
            </Typography>
            {/* Shown only when the notice is targeted — an untargeted one is for
                everyone, and saying so on every row would be noise. */}
            {(announcement.audienceRoles ?? []).length > 0 &&
              announcement.audienceRoles.map((audience: string) => (
                <Chip key={audience} size="small" variant="outlined" label={AUDIENCE_LABELS[audience] ?? audience} />
              ))}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box>
            <Markdown>{announcement.text}</Markdown>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

/** Mirrors the four columns of docs/access-matrix.md. */
export const AUDIENCE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrators',
  TECHNICIAN: 'Technicians',
  EQUIPMENT_USER: 'Equipment users',
  CLIENT: 'Clients'
};

export const AUDIENCE_OPTIONS = ['ADMINISTRATOR', 'TECHNICIAN', 'EQUIPMENT_USER', 'CLIENT'] as const;
