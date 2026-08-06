import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link as MuiLink,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { GET_BACKLOG_CARDS, GET_BACKLOG_CARD } from '../gql/queries';
import { ADD_BACKLOG_COMMENT } from '../gql/mutations';

/** Severity → chip colour. Mirrors the /bugs page so the two read consistently. */
const SEV_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  BLOCKER: 'error',
  MAJOR: 'warning',
  MINOR: 'info',
  COSMETIC: 'default',
  UNKNOWN: 'default'
};
const SEV_ORDER: Record<string, number> = { BLOCKER: 0, MAJOR: 1, MINOR: 2, COSMETIC: 3, UNKNOWN: 4 };

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

export default function Backlog() {
  const { data, loading, error, refetch } = useQuery(GET_BACKLOG_CARDS, { fetchPolicy: 'cache-and-network' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [area, setArea] = useState('');
  const [showClosed, setShowClosed] = useState('open');

  const cards: any[] = data?.backlogCards ?? [];
  const available: boolean = data?.backlogAvailable !== false;

  const areas = useMemo(
    () => Array.from(new Set(cards.map((c) => c.area).filter(Boolean))).sort() as string[],
    [cards]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter((c) => (showClosed === 'all' ? true : showClosed === 'closed' ? c.isClosed : !c.isClosed))
      .filter((c) => (severity ? c.severity === severity : true))
      .filter((c) => (area ? c.area === area : true))
      .filter((c) =>
        q
          ? [c.title, c.summary, c.area, c.category, c.reporterName].filter(Boolean).join(' ').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        const s = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
        if (s !== 0) return s;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
  }, [cards, search, severity, area, showClosed]);

  const counts = useMemo(() => {
    const open = cards.filter((c) => !c.isClosed);
    return {
      open: open.length,
      closed: cards.length - open.length,
      blockers: open.filter((c) => c.severity === 'BLOCKER').length
    };
  }, [cards]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BugReportIcon color="primary" />
          <Typography variant="h2">Bug Backlog</Typography>
        </Stack>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Typography variant="body1" color="text.secondary">
        Bugs reported in the app are triaged automatically and land here. Open a card to follow progress or add a
        comment — your comment goes straight onto the tracked issue, so the team sees it.
      </Typography>

      {!available && (
        <Alert severity="info">
          The backlog integration isn't configured yet, so there's nothing to show. Bugs you file are still recorded.
        </Alert>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      {cards.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${counts.open} open`} color="primary" variant="outlined" />
          {counts.blockers > 0 && <Chip label={`${counts.blockers} blocker${counts.blockers === 1 ? '' : 's'}`} color="error" />}
          <Chip label={`${counts.closed} closed`} variant="outlined" />
        </Stack>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search title, summary, area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          sx={{ minWidth: 260, flex: '1 1 260px' }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={severity} label="Severity" onChange={(e) => setSeverity(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['BLOCKER', 'MAJOR', 'MINOR', 'COSMETIC'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Area</InputLabel>
          <Select value={area} label="Area" onChange={(e) => setArea(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Show</InputLabel>
          <Select value={showClosed} label="Show" onChange={(e) => setShowClosed(e.target.value)}>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && cards.length === 0 && <LinearProgress />}

      <Stack spacing={1.5}>
        {visible.map((c) => (
          <Paper
            key={c.id}
            variant="outlined"
            onClick={() => setOpenId(c.id)}
            sx={{
              p: 2,
              cursor: 'pointer',
              opacity: c.isClosed ? 0.6 : 1,
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 3 }
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, textDecoration: c.isClosed ? 'line-through' : 'none' }}>
                  {c.title}
                </Typography>
                {c.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {c.summary}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip size="small" label={c.severity} color={SEV_COLOR[c.severity] ?? 'default'} />
                  <Chip size="small" variant="outlined" label={c.status} />
                  {c.area && <Chip size="small" variant="outlined" label={c.area} />}
                  {c.category && <Chip size="small" variant="outlined" label={c.category} />}
                  {c.occurrences > 1 && <Chip size="small" color="warning" label={`reported ×${c.occurrences}`} />}
                  {c.reporterName && (
                    <Chip size="small" variant="outlined" icon={<PersonOutlineIcon sx={{ fontSize: 15 }} />} label={c.reporterName} />
                  )}
                  {c.commentCount > 0 && (
                    <Chip size="small" variant="outlined" icon={<ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />} label={c.commentCount} />
                  )}
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {fmt(c.createdAt)}
              </Typography>
            </Stack>
          </Paper>
        ))}
        {!loading && visible.length === 0 && (
          <Typography color="text.secondary">
            {cards.length === 0 ? 'No bugs on the backlog yet.' : 'No cards match these filters.'}
          </Typography>
        )}
      </Stack>

      {openId && <CardDialog id={openId} onClose={() => setOpenId(null)} onCommented={() => refetch()} />}
    </Stack>
  );
}

/** Card detail + comment thread. Fetched on open so the list view stays cheap. */
function CardDialog({ id, onClose, onCommented }: { id: string; onClose: () => void; onCommented: () => void }) {
  const { data, loading, error, refetch } = useQuery(GET_BACKLOG_CARD, { variables: { id }, fetchPolicy: 'network-only' });
  const [addComment, { loading: posting }] = useMutation(ADD_BACKLOG_COMMENT);
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const card = data?.backlogCard?.card;
  const comments: any[] = data?.backlogCard?.comments ?? [];

  const submit = async () => {
    if (!body.trim()) return;
    setErr(null);
    try {
      await addComment({ variables: { cardId: id, body: body.trim() } });
      setBody('');
      await refetch();
      onCommented();
    } catch (e: any) {
      setErr(e?.graphQLErrors?.[0]?.message || e?.message || 'Could not post the comment.');
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {card?.title || 'Loading…'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && !card && <CircularProgress size={26} />}
        {error && <Alert severity="error">{error.message}</Alert>}

        {card && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip size="small" label={card.severity} color={SEV_COLOR[card.severity] ?? 'default'} />
              <Chip size="small" variant="outlined" label={card.status} />
              {card.area && <Chip size="small" variant="outlined" label={card.area} />}
              {card.category && <Chip size="small" variant="outlined" label={card.category} />}
              {card.occurrences > 1 && <Chip size="small" color="warning" label={`reported ×${card.occurrences}`} />}
              {/* clickupUrl is only returned to staff — customers have no ClickUp account. */}
              {card.clickupUrl && (
                <MuiLink href={card.clickupUrl} target="_blank" rel="noopener noreferrer" sx={{ ml: 'auto', fontSize: 14 }}>
                  Open in ClickUp <OpenInNewIcon sx={{ fontSize: 13, verticalAlign: 'middle' }} />
                </MuiLink>
              )}
            </Stack>

            {/* Reporter is shown prominently, with a mailto, so whoever picks the
                bug up can go straight back to them for missing detail. */}
            <Paper variant="outlined" sx={{ p: 1.25, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <PersonOutlineIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>{card.reporterName || 'Unknown reporter'}</strong>
                </Typography>
                {card.reporterEmail && (
                  <MuiLink href={`mailto:${card.reporterEmail}?subject=${encodeURIComponent('Bug: ' + (card.title || ''))}`} variant="body2">
                    {card.reporterEmail}
                  </MuiLink>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {fmt(card.createdAt)}
                  {card.sessionTag ? ` · ${card.sessionTag}` : ''}
                  {card.assignees?.length ? ` · assigned to ${card.assignees.join(', ')}` : ''}
                </Typography>
              </Stack>
            </Paper>

            {card.summary && <Section title="Summary" body={card.summary} />}
            {card.stepsToReproduce && <Section title="Steps to reproduce" body={card.stepsToReproduce} />}
            {card.expected && <Section title="Expected" body={card.expected} />}
            {card.actual && <Section title="Actual" body={card.actual} />}
            {card.proposedFix && <Section title="Proposed fix" body={card.proposedFix} />}

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                {comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
              </Typography>
            </Divider>

            <Stack spacing={1.5}>
              {comments.map((cm) => (
                <Paper key={cm.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2">{cm.author}</Typography>
                    {!cm.fromApp && <Chip size="small" variant="outlined" label="team" />}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {fmt(cm.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{cm.text}</Typography>
                </Paper>
              ))}
            </Stack>

            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                placeholder="Add a comment — extra detail, a repro, or confirmation it's fixed…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <Button variant="contained" endIcon={<SendIcon />} onClick={submit} disabled={posting || !body.trim()}>
                {posting ? 'Posting…' : 'Post'}
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{body}</Typography>
    </Box>
  );
}
