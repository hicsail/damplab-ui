import { useQuery } from '@apollo/client';
import { GET_ANNOUNCEMENT } from '../gql/queries';
import { Box } from '@mui/material';

export default function AnnouncementBox() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENT);

  if (loading) return <p>Loading announcements...</p>;
  if (error) return <p>Error loading announcements: {error.message}</p>;

  type Announcement = {
    label: string;
    text: string;
    timestamp: string;
    is_displayed: boolean;
  };

  // Grab the first displayed announcement or null if none
  const announcement: Announcement | null = data?.announcements
    ?.filter((a: Announcement) => a.is_displayed)
    ?.[0] || null;

  if (!announcement) return <p>No announcements available.</p>;

  return (
    <Box
      sx={{
        mt: 4,
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#fbfbfe',
        border: '1px solid #8fb5ba',
        borderRadius: 2,
        padding: 3,
        boxShadow: 3,
      }}
    >
      <h3 style={{ color: '#456b6e', marginBottom: '1rem' }}>📢 Announcements</h3>

      <Box sx={{ mb: 2 }}>
        <strong style={{ color: '#e04462' }}>{announcement.label}</strong>
        <p style={{ margin: '4px 0', color: '#050315' }}>{announcement.text}</p>
        <small style={{ color: '#8fb5ba' }}>
          {new Date(announcement.timestamp).toLocaleString()}
        </small>
      </Box>
    </Box>
  );
}
