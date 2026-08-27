import { useQuery } from '@apollo/client';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { Box, Typography, Stack } from '@mui/material';
import Markdown from './ReactMarkdown';

export default function AnnouncementBox() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENTS);
  if (loading || error) return null; // Don't render while loading or on error

  /**
   * Filter first, *then* take the newest.
   *
   * This used to take `announcements[0]` and then check `is_displayed`, so hiding
   * the newest announcement blanked the whole panel even when an older visible one
   * existed — the box went empty rather than falling back.
   *
   * The list is already newest-first and already audience-filtered by the server,
   * so there is nothing else to decide here.
   */
  const currentAnnouncement = (data?.announcements ?? []).find((a: any) => a?.is_displayed) ?? null;

  if (!currentAnnouncement) return null;

  return (
    <Stack
      direction="column"
      spacing={0.5} // small gap between header and content
      sx={{maxWidth: { xs: '100%', sm: 400 }, alignSelf: 'flex-start' }}
    >
      {/* Header Box */}
      <Box
        sx={(theme) => ({
          backgroundColor: theme.palette.secondary.main,
          border: `1px solid ${theme.palette.primary.light}`,
          borderRadius: 1,
          boxShadow: 3,
          px: 2,
          py: 1,
        })}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#ffffff" }}>
          Announcements:
        </Typography>
      </Box>

      {/* Content Box */}
      <Box
        sx={(theme) => ({
          backgroundColor: '#fbfbfe',
          border: `1px solid ${theme.palette.primary.light}`,
          borderRadius: 1,
          boxShadow: 3,
          p: 3,
        })}
      >
      <Markdown
      >{currentAnnouncement.text}
      </Markdown>


        <Typography
          variant="caption"
          color='primary'
          sx={{ display: "block", mt: 2 }}
        >
          {new Date(currentAnnouncement.timestamp).toLocaleString()}
        </Typography>
      </Box>
    </Stack>
  );
}
