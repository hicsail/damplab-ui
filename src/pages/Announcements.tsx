import { useMutation, useQuery } from '@apollo/client';
import { CREATE_ANNOUNCEMENT } from '../gql/mutations';
import { UPDATE_ANNOUNCEMENT } from '../gql/mutations';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import ReactMarkdown from "react-markdown";

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
      });
    } catch (error) {
      console.error(error);
    }
  };

const handleHide = async () => {
  if (!currentAnnouncement || !currentAnnouncement.timestamp) {
    console.warn("No announcement to hide.");
    return;
  }
  if (!currentAnnouncement.timestamp) {
    console.error("Announcement missing timestamp!");
    return;
  }
  await updateAnnouncement({
    variables: {
      timestamp: currentAnnouncement.timestamp,
      input: {
        is_displayed: false,
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
            <Button
                variant="outlined"
                color="tertiary"
                onClick={handleHide}
                disabled={updating || !currentAnnouncement}
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
        <i>*italic*</i> for italic text, and 2 spaces + return for new line.
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
