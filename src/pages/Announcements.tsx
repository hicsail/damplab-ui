import { useMutation, useQuery } from '@apollo/client';
import { CREATE_ANNOUNCEMENT } from '../gql/mutations';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { FormatAnnouncement } from '../components/AnnouncementBox'

export default function Announcements() {
  const [announcement, setAnnouncement] = useState('');
  const [createAnnouncement] = useMutation(CREATE_ANNOUNCEMENT, {
    refetchQueries: [{ query: GET_ANNOUNCEMENTS }],
  });

  const { data, loading } = useQuery(GET_ANNOUNCEMENTS);
  const currentAnnouncement = data?.announcements?.[0] || null;

  const handleSubmit = async () => {
    await createAnnouncement({
      variables: {
        input: {
          text: announcement,
          is_displayed: true,
        },
      },
    });
    setAnnouncement('');
  };

  const handleHide = async () => {
    await createAnnouncement({
      variables: {
        input: {
          text: '',
          is_displayed: false,
        },
      },
    });
    setAnnouncement('')
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom color="secondary" sx={{ fontWeight: 'bold' }}>
        Current Announcement
      </Typography>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
        {loading ? (
            <Typography>Loading...</Typography>
        ) : currentAnnouncement && currentAnnouncement.is_displayed ? (
            <>
            <FormatAnnouncement text={currentAnnouncement.text} />
            <Button
                variant="outlined"
                color="tertiary"
                onClick={handleHide}
                sx={{ mt: 2 }}
            >
                Hide Current Announcement
            </Button>
            </>
        ) : (
            <Typography>No announcement displayed.</Typography>
        )}
      </Paper>

      <Typography variant="h5" gutterBottom color="secondary" sx={{ fontWeight: 'bold' }}>
        Add Announcement
      </Typography>

      <TextField
        label="New Announcement"
        variant="outlined"
        fullWidth
        multiline
        minRows={4}
        value={announcement}
        onChange={(e) => setAnnouncement(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Use <b>#</b> for headings, <b>##</b> for subheadings, <b>**bold**</b> for bold, 
        and <i>*italic*</i> for italic text.
      </Alert>

      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
      >
        Submit Announcement
      </Button>

    </Box>
  );
};