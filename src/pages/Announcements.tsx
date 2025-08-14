import { useMutation, useQuery } from '@apollo/client';
import { CREATE_ANNOUNCEMENT } from '../gql/mutations';
import { UPDATE_ANNOUNCEMENT } from '../gql/mutations';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import Markdown from '../components/ReactMarkdown';
import { UserContext, UserContextProps } from '../contexts/UserContext';

export default function Announcements() {
  const [announcement, setAnnouncement] = useState('');
  const [createAnnouncement, { loading: creating }] = useMutation(CREATE_ANNOUNCEMENT, {
    refetchQueries: [{ query: GET_ANNOUNCEMENTS }],
  });
  const [updateAnnouncement, { loading: updating }] = useMutation(UPDATE_ANNOUNCEMENT, {
  refetchQueries: [{ query: GET_ANNOUNCEMENTS }],
  });

  const { data, loading } = useQuery(GET_ANNOUNCEMENTS);
  const currentAnnouncement = data?.announcements?.[0] || null;
  const userContext: UserContextProps = useContext(UserContext);
  const token = userContext.userProps?.accessToken;

  const handleSubmit = async () => {
    if (!announcement.trim()) {return;}
    try {
      await createAnnouncement({
        variables: {
          input: {
            text: announcement,
            is_displayed: true,
          },
        },
        context: {
          headers: {
            authorization: `Bearer ${token}`,
          },
        },
      });
      setAnnouncement(""); // Clear field after successful submission

    } catch (error) {
      console.error(error);
    }
  };

const handleHide = async () => {
  if (!currentAnnouncement.timestamp) return; // Just in case
  await updateAnnouncement({    
    variables: {
      input: {
        timestamp: currentAnnouncement.timestamp,
        is_displayed: false,
      },
    },
    context: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
  });
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
            <Markdown
                  >{currentAnnouncement.text}
            </Markdown>
            <Button
                variant="outlined"
                color="tertiary"
                onClick={handleHide}
                disabled={updating}
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
        <i>*italic*</i> for italic text, and two line breaks for new line.
      </Alert>

      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={!announcement.trim()}
      >
        Submit Announcement
      </Button>

    </Box>
  );
};
