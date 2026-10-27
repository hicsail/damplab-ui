import React, { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { GET_CALENDAR_FEED } from '../gql/queries';
import { RESET_CALENDAR_FEED } from '../gql/mutations';
import { formatSaveError } from '../utils/gqlError';

export interface FeedLink {
  url: string;
  createdAt: string;
}

/** Show the caller's existing link; create one only when they have none. */
export async function loadOrCreateFeed(fetchFeed: () => Promise<FeedLink | null>, createFeed: () => Promise<FeedLink>): Promise<FeedLink> {
  return (await fetchFeed()) ?? (await createFeed());
}

export interface CalendarFeedPanelProps {
  url: string | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
  confirmingReset: boolean;
  resetting: boolean;
  onCopy: () => void;
  onAskReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
}

export function CalendarFeedPanel({ url, loading, error, copied, confirmingReset, resetting, onCopy, onAskReset, onConfirmReset, onCancelReset }: CalendarFeedPanelProps): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">
        Subscribe to this link in Google Calendar, Outlook or Apple Calendar ("From URL" / "Subscribe to calendar"). It shows every equipment booking in the lab — the item and the time, nothing else. Anyone with the link can see it, so keep it to yourself.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && !url && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {url && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Box component="code" sx={{ flex: 1, wordBreak: 'break-all', fontSize: 13 }}>{url}</Box>
          <Tooltip title={copied ? 'Copied!' : 'Copy'}>
            <IconButton aria-label="Copy calendar link" onClick={onCopy} color={copied ? 'success' : 'default'}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        Calendar apps refresh subscribed calendars on their own schedule — often every few hours — so a new or moved booking can take a while to appear.
      </Typography>
      {confirmingReset ? (
        <Alert
          severity="warning"
          action={
            <>
              <Button onClick={onCancelReset}>Keep this link</Button>
              <Button color="warning" variant="contained" onClick={onConfirmReset} disabled={resetting}>Yes, reset</Button>
            </>
          }
        >
          Resetting makes the current link stop working in every calendar that subscribed to it. You will need to subscribe again with the new one.
        </Alert>
      ) : (
        <Box>
          <Button color="warning" onClick={onAskReset} disabled={!url || resetting}>Reset link</Button>
        </Box>
      )}
    </Box>
  );
}

export default function CalendarFeedDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement {
  const client = useApolloClient();
  const [reset] = useMutation(RESET_CALENDAR_FEED);
  const [feed, setFeed] = useState<FeedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  // StrictMode runs effects twice; without this the first open would create a
  // link and immediately replace it.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      setConfirmingReset(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    loadOrCreateFeed(
      () => client.query({ query: GET_CALENDAR_FEED, fetchPolicy: 'network-only' }).then((r) => r.data?.calendarFeed ?? null),
      () => reset().then((r) => r.data.resetCalendarFeed)
    )
      .then(setFeed)
      .catch((e) => setError(formatSaveError(e, 'the calendar link')));
  }, [open, client, reset]);

  const onCopy = async () => {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; user can select manually */
    }
  };

  const onConfirmReset = async () => {
    setResetting(true);
    setError(null);
    try {
      const r = await reset();
      setFeed(r.data.resetCalendarFeed);
      setConfirmingReset(false);
    } catch (e) {
      setError(formatSaveError(e, 'the reset'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Subscribe to equipment bookings</DialogTitle>
      <DialogContent>
        <CalendarFeedPanel
          url={feed?.url ?? null}
          loading={!feed && !error}
          error={error}
          copied={copied}
          confirmingReset={confirmingReset}
          resetting={resetting}
          onCopy={onCopy}
          onAskReset={() => setConfirmingReset(true)}
          onConfirmReset={onConfirmReset}
          onCancelReset={() => setConfirmingReset(false)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
