import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import { format } from 'date-fns';
import { GET_API_KEYS } from '../gql/queries';
import { CREATE_API_KEY, REVOKE_API_KEY } from '../gql/mutations';

const fmt = (d?: string | null) => (d ? format(new Date(d), 'MMM d, yyyy h:mm a') : '—');

export default function ApiKeys() {
  const { data, loading, error, refetch } = useQuery(GET_API_KEYS, { fetchPolicy: 'cache-and-network' });
  const [createKey, { loading: creating }] = useMutation(CREATE_API_KEY);
  const [revokeKey] = useMutation(REVOKE_API_KEY);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const keys: any[] = data?.apiKeys ?? [];
  const backend = (import.meta.env.VITE_BACKEND || 'http://localhost:3000/graphql').replace(/\/?$/, '');

  const handleCreate = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr('Give the key a name.');
      return;
    }
    try {
      const res = await createKey({ variables: { name: name.trim(), expiresAt: null } });
      setNewSecret(res.data?.createApiKey?.key ?? null);
      setCreateOpen(false);
      setName('');
      await refetch();
    } catch (e: any) {
      setErr(e?.graphQLErrors?.[0]?.message || e?.message || 'Could not create the key.');
    }
  };

  const handleRevoke = async (id: string, keyName: string) => {
    if (!window.confirm(`Revoke "${keyName}"? Systems using it will stop working immediately.`)) return;
    await revokeKey({ variables: { id } });
    await refetch();
  };

  const copySecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; user can select manually */
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <VpnKeyIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>API keys</Typography>
          <Typography variant="body2" color="text.secondary">
            Provision read-only keys so external systems can query the DAMPLab GraphQL API. Keys can read data but never modify it.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<VpnKeyIcon />} onClick={() => { setErr(null); setCreateOpen(true); }}>
          Create key
        </Button>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        External systems send requests to <code>{backend}</code> with header <code>x-api-key: &lt;key&gt;</code>. Only GraphQL{' '}
        <strong>queries</strong> are permitted — any mutation is rejected.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Could not load API keys.</Alert>}
      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : keys.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No API keys yet.</Typography>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Prefix</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last used</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id} hover>
                  <TableCell>{k.name}</TableCell>
                  <TableCell><code>{k.prefix}…</code></TableCell>
                  <TableCell>{fmt(k.createdAt)}</TableCell>
                  <TableCell>{fmt(k.lastUsedAt)}</TableCell>
                  <TableCell>
                    {k.revoked
                      ? <Chip size="small" label="Revoked" color="default" />
                      : <Chip size="small" label="Active" color="success" variant="outlined" />}
                  </TableCell>
                  <TableCell align="right">
                    {!k.revoked && (
                      <Tooltip title="Revoke">
                        <IconButton size="small" color="error" onClick={() => handleRevoke(k.id, k.name)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create API key</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Name the system that will use this key, so you can identify and revoke it later.
          </DialogContentText>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <TextField autoFocus fullWidth label="Name" placeholder="e.g. LIMS export" value={name} onChange={(e) => setName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Reveal-once dialog */}
      <Dialog open={!!newSecret} onClose={() => setNewSecret(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Copy your API key now</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is the only time the full key is shown. Store it securely — it can't be retrieved again. If you lose it, revoke it and create a new one.
          </Alert>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 1.5,
              border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover'
            }}
          >
            <Box component="code" sx={{ flex: 1, wordBreak: 'break-all', fontSize: 13 }}>{newSecret}</Box>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton onClick={copySecret} color={copied ? 'success' : 'default'}><ContentCopyIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewSecret(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
