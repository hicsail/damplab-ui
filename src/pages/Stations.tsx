import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
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
import PlaceIcon from '@mui/icons-material/Place';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { GET_STATIONS, CREATE_STATION, UPDATE_STATION, DELETE_STATION } from '../gql/queries';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

interface StationForm {
  id?: string;
  name: string;
  type: string;
  zone: string;
  capacity: string;
  x: string;
  y: string;
  notes: string;
}

const EMPTY: StationForm = { name: '', type: '', zone: '', capacity: '', x: '', y: '', notes: '' };

const num = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default function Stations() {
  const { data, loading, error, refetch } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const [createStation, { loading: creating }] = useMutation(CREATE_STATION);
  const [updateStation, { loading: updating }] = useMutation(UPDATE_STATION);
  const [deleteStation] = useMutation(DELETE_STATION);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StationForm>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.LabLayoutWrite);

  const stations: any[] = data?.stations ?? [];
  const saving = creating || updating;

  const openCreate = () => { setForm(EMPTY); setErr(null); setOpen(true); };
  const openEdit = (s: any) => {
    setForm({
      id: s.id,
      name: s.name ?? '',
      type: s.type ?? '',
      zone: s.zone ?? '',
      capacity: s.capacity != null ? String(s.capacity) : '',
      x: s.x != null ? String(s.x) : '',
      y: s.y != null ? String(s.y) : '',
      notes: s.notes ?? ''
    });
    setErr(null);
    setOpen(true);
  };

  const handleSave = async () => {
    setErr(null);
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    const payload = {
      name: form.name.trim(),
      type: form.type.trim() || null,
      zone: form.zone.trim() || null,
      capacity: num(form.capacity),
      x: num(form.x),
      y: num(form.y),
      notes: form.notes.trim() || null
    };
    try {
      if (form.id) {
        await updateStation({ variables: { input: { id: form.id, ...payload } } });
      } else {
        // Create input has no id; drop nulls it doesn't need.
        await createStation({ variables: { input: payload } });
      }
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setErr(formatSaveError(e, 'this station'));
    }
  };

  /** Units of an equipment item that sit at this particular station. */
  const unitsAtStation = (item: any, stationId: string): number => {
    const placements: any[] = Array.isArray(item?.placements) ? item.placements : [];
    const match = placements.find((p) => String(p?.stationId) === String(stationId));
    const qty = Number(match?.quantity);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
  };

  const handleDelete = async (s: any) => {
    const count = s.equipment?.length ?? 0;
    const warn = count > 0
      ? `\n\n${count} equipment item(s) are placed here. This station will be dropped from their placements, and protocol resolution will only point at their remaining stations.`
      : '';
    if (!window.confirm(`Delete station "${s.name}"?${warn}`)) return;
    // Previously had no try/catch: a refusal was an unhandled rejection and the
    // row just stayed on screen with nothing said.
    try {
      await deleteStation({ variables: { id: s.id } });
      await refetch();
    } catch (e) {
      console.error('Delete station failed:', e);
      setDeleteError(formatSaveError(e, 'this station'));
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <PlaceIcon color='primary' />
          <Typography variant='h2'>Lab Layout</Typography>
        </Stack>
        {canWrite && <Button variant='contained' startIcon={<AddIcon />} onClick={openCreate}>New station</Button>}
      </Stack>

      <Typography variant='body1' color='text.secondary'>
        Stations are the physical locations where equipment lives and protocol steps run. A piece of
        equipment can be placed at several stations, with a quantity per station — set those
        placements on the inventory editor. The coordinates feed the future layout view.
      </Typography>

      {error && <Alert severity='error'>{error.message}</Alert>}
      {deleteError && <Alert severity='error' onClose={() => setDeleteError(null)}>{deleteError}</Alert>}
      {!canWrite && (
        <Alert severity='info'>
          You have read-only access to the lab layout. Stations are shown for reference; adding,
          editing and deleting them is restricted.
        </Alert>
      )}

      <Paper variant='outlined'>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell align='right'>Capacity</TableCell>
              <TableCell align='right'>X, Y</TableCell>
              <TableCell>Equipment</TableCell>
              {canWrite && <TableCell align='right'>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {stations.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.type || '—'}</TableCell>
                <TableCell>{s.zone || '—'}</TableCell>
                <TableCell align='right'>{s.capacity ?? '—'}</TableCell>
                <TableCell align='right'>{s.x != null && s.y != null ? `${s.x}, ${s.y}` : '—'}</TableCell>
                <TableCell>
                  {(s.equipment ?? []).length === 0
                    ? <Typography variant='body2' color='text.secondary'>none</Typography>
                    : (
                      <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
                        {s.equipment.map((e: any) => (
                          <Chip key={e.id} size='small' label={`${e.name} ×${unitsAtStation(e, s.id)}`} />
                        ))}
                      </Stack>
                    )}
                </TableCell>
                {canWrite && (
                  <TableCell align='right'>
                    <Tooltip title='Edit'>
                      <IconButton size='small' onClick={() => openEdit(s)}><EditIcon fontSize='small' /></IconButton>
                    </Tooltip>
                    <Tooltip title='Delete'>
                      <IconButton size='small' onClick={() => handleDelete(s)}><DeleteOutlineIcon fontSize='small' /></IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!loading && stations.length === 0 && (
              <TableRow><TableCell colSpan={canWrite ? 7 : 6}><Typography color='text.secondary'>No stations yet. Add one to get started.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open && canWrite} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{form.id ? 'Edit station' : 'New station'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {err && <Alert severity='error'>{err}</Alert>}
            <TextField label='Name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label='Type' placeholder='bench, instrument, fume hood…' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <TextField label='Zone / room' value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField label='Capacity' type='number' value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} inputProps={{ min: 0, step: 1 }} />
              <TextField label='X coordinate' type='number' value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} />
              <TextField label='Y coordinate' type='number' value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} />
            </Box>
            <TextField label='Notes' value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
