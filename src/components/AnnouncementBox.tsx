import { useQuery } from '@apollo/client';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { Box, Typography, Stack } from '@mui/material';
import ReactMarkdown from "react-markdown";

export default function AnnouncementBox() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENTS);
  if (loading || error) return null; // Don't render while loading or on error

  // Grab the first announcement that is displayed
  const currentAnnouncement = data?.announcements?.[0] || null;

  if (!currentAnnouncement || !currentAnnouncement.is_displayed) return null;

  return (
    <Stack
      direction="column"
      spacing={1} // small gap between header and content
      sx={{ml: 4, maxWidth: { xs: '100%', sm: 400 }, alignSelf: 'flex-start' }}
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
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <Typography variant="body1" component="p" sx={{ mb: 2 }}>
              {children}
            </Typography>
          ),
          strong: ({ children }) => (
            <Typography component="span" fontWeight="bold">
              {children}
            </Typography>
          ),
          em: ({ children }) => (
            <Typography component="span" fontStyle="italic">
              {children}
            </Typography>
          ),
          h1: ({ children }) => (
            <Typography variant="h5" component="h1" color="primary" sx={{ mb: 2, fontWeight: "bold" }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h6" component="h2" color="secondary" sx={{ mb: 1.5, fontWeight: "bold" }}>
              {children}
            </Typography>
          ),
          br: () => <br />,
        }}
      >
        {currentAnnouncement.text}
      </ReactMarkdown>


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
