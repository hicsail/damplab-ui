import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  GET_ACTIVE_INVENTORY_ITEMS,
  GET_STATIONS,
  RESOLVE_PROTOCOL,
  GET_PROTOCOL_STEP_MAPPINGS,
  UPSERT_PROTOCOL_STEP_MAPPING
} from '../gql/queries';

interface ParamTag { label: string; value: string; }
interface EditState {
  equipmentIds: string[];
  requiresNoEquipment: boolean;
  paramTags: ParamTag[];
  dirty: boolean;
  saving: boolean;
}

const STATUS_META: Record<string, { color: 'success' | 'warning' | 'default'; icon: ReactElement; label: string }> = {
  MAPPED: { color: 'success', icon: <CheckCircleIcon fontSize='small' />, label: 'Mapped' },
  BROKEN: { color: 'warning', icon: <ErrorOutlineIcon fontSize='small' />, label: 'Broken' },
  UNMAPPED: { color: 'default', icon: <RadioButtonUncheckedIcon fontSize='small' />, label: 'Unmapped' }
};

const coerceTags = (raw: any): ParamTag[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === 'object')
    .map((t) => ({ label: String(t.label ?? ''), value: String(t.value ?? '') }));
};

export default function ProtocolMap() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('protocolId') ?? '');
  const [activeId, setActiveId] = useState(searchParams.get('protocolId') ?? '');
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const { data: invData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const { data: stationData } = useQuery(GET_STATIONS, { fetchPolicy: 'cache-and-network' });
  const inventory: any[] = invData?.activeInventoryItems ?? [];

  // stationId → display name, so equipment labels can spell out every station an
  // item lives at (equipment can be placed at more than one station).
  const stationNames = useMemo(() => {
    const m = new Map<string, string>();
    (stationData?.stations ?? []).forEach((s: any) => m.set(String(s.id), String(s.name ?? s.id)));
    return m;
  }, [stationData]);

  const placementSummary = (item: any): string => {
    const placements: any[] = Array.isArray(item?.placements) ? item.placements : [];
    if (placements.length === 0) return 'no station';
    return placements
      .map((p) => {
        const name = stationNames.get(String(p?.stationId)) ?? 'unknown station';
        const qty = Number(p?.quantity);
        return `${name}${Number.isFinite(qty) && qty > 1 ? ` ×${qty}` : ''}`;
      })
      .join(', ');
  };

  const [loadResolve, { data: resolveData, loading: resolving, error: resolveErr, refetch: refetchResolve }] =
    useLazyQuery(RESOLVE_PROTOCOL, { fetchPolicy: 'network-only' });
  const [loadMappings, { data: mapData }] = useLazyQuery(GET_PROTOCOL_STEP_MAPPINGS, { fetchPolicy: 'network-only' });
  const [upsert] = useMutation(UPSERT_PROTOCOL_STEP_MAPPING);

  const resolved = resolveData?.resolveProtocol;
  const mappings: any[] = mapData?.protocolStepMappings ?? [];

  const load = (id: string) => {
    const pid = id.trim();
    if (!pid) return;
    setActiveId(pid);
    setSearchParams({ protocolId: pid });
    setBanner(null);
    loadResolve({ variables: { protocolId: pid } });
    loadMappings({ variables: { protocolId: pid } });
  };

  // Auto-load if a protocolId came in via the URL.
  useEffect(() => {
    if (activeId) load(activeId); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the editable state once per protocol load. Keyed on the protocol id + its
  // step set so a per-step save's refetch (same steps) never clobbers unsaved edits
  // the author has open on other step cards.
  const [seededSig, setSeededSig] = useState('');
  useEffect(() => {
    if (!resolved) return;
    const sig = `${activeId}|${resolved.steps.map((s: any) => s.stepId).join(',')}`;
    if (sig === seededSig) return;
    const byStep = new Map(mappings.map((m) => [m.stepId, m]));
    const next: Record<string, EditState> = {};
    for (const step of resolved.steps) {
      const m = byStep.get(step.stepId);
      next[step.stepId] = {
        equipmentIds: m?.equipmentIds ?? (step.equipment ?? []).map((e: any) => e.id),
        requiresNoEquipment: !!(m?.requiresNoEquipment ?? step.requiresNoEquipment),
        paramTags: coerceTags(m?.paramTags),
        dirty: false,
        saving: false
      };
    }
    setEdits(next);
    setSeededSig(sig); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveData, mapData, activeId]);

  const patch = (stepId: string, p: Partial<EditState>) =>
    setEdits((prev) => ({ ...prev, [stepId]: { ...prev[stepId], ...p, dirty: true } }));

  const saveStep = async (step: any) => {
    const e = edits[step.stepId];
    if (!e) return;
    setEdits((prev) => ({ ...prev, [step.stepId]: { ...prev[step.stepId], saving: true } }));
    try {
      await upsert({
        variables: {
          input: {
            protocolId: activeId,
            stepId: step.stepId,
            stepNumber: step.number || undefined,
            stepTitle: step.title || undefined,
            equipmentIds: e.requiresNoEquipment ? [] : e.equipmentIds,
            requiresNoEquipment: e.requiresNoEquipment,
            paramTags: e.paramTags.filter((t) => t.label.trim() || t.value.trim()),
            reviewed: true
          }
        }
      });
      await refetchResolve?.();
      setBanner(`Saved step ${step.number || step.stepId}.`);
      setEdits((prev) => ({ ...prev, [step.stepId]: { ...prev[step.stepId], dirty: false, saving: false } }));
    } catch (err: any) {
      setBanner(err?.graphQLErrors?.[0]?.message || err?.message || 'Save failed.');
      setEdits((prev) => ({ ...prev, [step.stepId]: { ...prev[step.stepId], saving: false } }));
    }
  };

  const progress = useMemo(() => {
    if (!resolved || resolved.totalStepCount === 0) return 0;
    return Math.round((resolved.mappedStepCount / resolved.totalStepCount) * 100);
  }, [resolved]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1000 }}>
      <Stack direction='row' spacing={1.5} alignItems='center'>
        <AccountTreeIcon color='primary' />
        <Typography variant='h2'>Protocol Step Map</Typography>
      </Stack>
      <Typography variant='body1' color='text.secondary'>
        Map each protocols.io step to the equipment it requires. A piece of equipment can live at
        several stations at once — its placements are managed in the inventory editor and shown
        here for reference. Only references are stored — protocol content is always fetched live
        from protocols.io.
      </Typography>

      <Paper variant='outlined' sx={{ p: 2 }}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <TextField
            label='protocols.io ID or slug'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(input); }}
            size='small'
            sx={{ flex: 1 }}
            placeholder='e.g. n92ld46yxl5b'
          />
          <Button variant='contained' onClick={() => load(input)} disabled={!input.trim() || resolving}>
            {resolving ? 'Loading…' : 'Load protocol'}
          </Button>
        </Stack>
      </Paper>

      {banner && <Alert severity='info' onClose={() => setBanner(null)}>{banner}</Alert>}
      {resolveErr && <Alert severity='error'>{resolveErr.message}</Alert>}
      {resolving && <CircularProgress size={28} />}

      {resolved && (
        <>
          <Paper variant='outlined' sx={{ p: 2 }}>
            <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
              <Box>
                <Typography variant='h6'>{resolved.title || activeId}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {resolved.mappedStepCount} of {resolved.totalStepCount} steps fully mapped
                </Typography>
              </Box>
              {resolved.fullyMapped
                ? <Chip color='success' icon={<CheckCircleIcon />} label='Fully mapped' />
                : <Chip color='warning' label='Incomplete' />}
            </Stack>
            <LinearProgress variant='determinate' value={progress} sx={{ mt: 1.5, height: 8, borderRadius: 1 }} />
          </Paper>

          {resolved.steps.map((step: any) => {
            const e = edits[step.stepId];
            if (!e) return null;
            const meta = STATUS_META[step.status] ?? STATUS_META.UNMAPPED;
            return (
              <Paper key={step.stepId} variant='outlined' sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      <Chip size='small' label={`Step ${step.number || '—'}`} />
                      <Typography variant='subtitle1'>{step.title}</Typography>
                    </Stack>
                    <Chip size='small' color={meta.color} icon={meta.icon} label={meta.label} />
                  </Stack>

                  {step.issues?.length > 0 && (
                    <Alert severity='warning' sx={{ py: 0 }}>
                      {step.issues.map((iss: string, i: number) => <div key={i}>{iss}</div>)}
                    </Alert>
                  )}

                  <Autocomplete
                    multiple
                    fullWidth
                    size='small'
                    disabled={e.requiresNoEquipment}
                    options={inventory}
                    getOptionLabel={(o: any) => o.name}
                    isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
                    value={inventory.filter((i) => e.equipmentIds.includes(i.id))}
                    onChange={(_, val: any[]) => patch(step.stepId, { equipmentIds: val.map((v) => v.id) })}
                    renderOption={(props, o: any) => (
                      <li {...props} key={o.id}>
                        <Stack spacing={0}>
                          <Typography variant='body2'>{o.name}</Typography>
                          <Typography variant='caption' color='text.secondary'>{placementSummary(o)}</Typography>
                        </Stack>
                      </li>
                    )}
                    renderTags={(value: any[], getTagProps) =>
                      value.map((o, idx) => (
                        <Chip
                          {...getTagProps({ index: idx })}
                          key={o.id}
                          size='small'
                          variant='outlined'
                          color={(o.placements ?? []).length === 0 ? 'warning' : 'default'}
                          label={`${o.name} · ${placementSummary(o)}`}
                        />
                      ))
                    }
                    renderInput={(params) => <TextField {...params} label='Equipment' placeholder='Add equipment…' />}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={e.requiresNoEquipment}
                        onChange={(ev) => patch(step.stepId, { requiresNoEquipment: ev.target.checked, ...(ev.target.checked ? { equipmentIds: [] } : {}) })}
                      />
                    }
                    label='This step requires no equipment'
                  />

                  <Divider textAlign='left'><Typography variant='caption' color='text.secondary'>Parameter tags</Typography></Divider>
                  <Stack spacing={1}>
                    {e.paramTags.map((t, idx) => (
                      <Stack key={idx} direction='row' spacing={1} alignItems='center'>
                        <TextField
                          size='small' label='Label' value={t.label}
                          onChange={(ev) => { const tags = [...e.paramTags]; tags[idx] = { ...tags[idx], label: ev.target.value }; patch(step.stepId, { paramTags: tags }); }}
                        />
                        <TextField
                          size='small' label='Value' value={t.value} sx={{ flex: 1 }}
                          onChange={(ev) => { const tags = [...e.paramTags]; tags[idx] = { ...tags[idx], value: ev.target.value }; patch(step.stepId, { paramTags: tags }); }}
                        />
                        <IconButton size='small' onClick={() => { const tags = e.paramTags.filter((_, i) => i !== idx); patch(step.stepId, { paramTags: tags }); }}>
                          <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button size='small' startIcon={<AddIcon />} onClick={() => patch(step.stepId, { paramTags: [...e.paramTags, { label: '', value: '' }] })} sx={{ alignSelf: 'flex-start' }}>
                      Add tag
                    </Button>
                  </Stack>

                  <Stack direction='row' justifyContent='flex-end'>
                    <Button variant='contained' size='small' onClick={() => saveStep(step)} disabled={e.saving || !e.dirty}>
                      {e.saving ? 'Saving…' : e.dirty ? 'Save step' : 'Saved'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </>
      )}
    </Stack>
  );
}
