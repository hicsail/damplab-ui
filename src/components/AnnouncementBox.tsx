import { useQuery } from '@apollo/client';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { Box } from '@mui/material';

export default function AnnouncementBox() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENTS);

  if (loading || error) return null;

  type Announcement = {
    label: string;
    text: string;
    timestamp: string;
    is_displayed: boolean;
  };

  const announcement: Announcement | null =
    data?.announcements?.find((a: Announcement) => a.is_displayed) || null; //on null, LoginForm does not display

  if (!announcement) return null;

  return (
    <Box
      sx={{
        backgroundColor: '#fbfbfe',
        border: '1px solid #8fb5ba',
        borderRadius: 2,
        padding: 2,
        boxShadow: 1,
        ml: 2,
        maxWidth: 400,
      }}
    >
      <h4 style={{ color: '#e04462', marginBottom: '0.5rem' }}>📢 {'Announcement'}</h4>
      <p style={{ margin: '4px 0', color: '#050315' }}>{announcement.text}</p>
      <small style={{ color: '#8fb5ba' }}>
        {new Date(announcement.timestamp).toLocaleString()}
      </small>
    </Box>
  );
}
