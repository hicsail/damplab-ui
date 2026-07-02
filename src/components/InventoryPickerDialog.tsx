import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useEffect, useMemo, useState } from 'react';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_INVENTORY_AVAILABILITY, SET_WORKFLOW_NODE_USED_INVENTORY } from '../gql/queries';

export interface InventoryPickerDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
  nodeLabel?: string;
  /** Inventory IDs the node already holds; pre-checks the list. */
  currentlyHeldIds: string[];
  /** Optional: IDs the service flagged as typically required; surfaced first as suggestions. */
  suggestedIds?: string[];
  /** Called after a successful save (e.g. to refetch lab monitor queries). */
  onSaved?: (newHeldIds: string[]) => void;
}

interface InventoryItemRow {
  id: string;
  name: string;
  type?: string;
  location?: string;
  description?: string;
}

interface Conflict {
  itemId: string;
  source: 'OPERATION' | 'BOOKING';
  label: string;
}

function formatGqlError(error: unknown): string {
  if (error instanceof ApolloError) {
    const gqlMessage = error.graphQLErrors?.[0]?.message;
    if (gqlMessage) return gqlMessage;
  }
  return 'Could not save inventory selection.';
}

/**
 * Lets staff pick which inventory items a workflow node uses, for a planned time
 * window. Items conflicting in that window — held by another operation OR booked
 * on the scheduling calendar (one shared availability pool) — are disabled with a
 * reason. The chosen window is saved as the operation's inventory reservation.
 */
export default function InventoryPickerDialog({
  open,
  onClose,
  nodeId,
  nodeLabel,
  currentlyHeldIds,
  suggestedIds,
  onSaved
}: InventoryPickerDialogProps) {
  const client = useApolloClient();

  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentlyHeldIds.map(String)));
      setErrorMessage(null);
      setStart(new Date());
      setEnd(new Date(Date.now() + 2 * 60 * 60 * 1000));
    }
  }, [open, currentlyHeldIds.join('|')]);

  const { data: itemsData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network', skip: !open });
  // Conflicts (ops + bookings) for the selected window, excluding this node's own holds.
  const { data: availData } = useQuery(GET_INVENTORY_AVAILABILITY, {
    fetchPolicy: 'cache-and-network',
    skip: !open,
    variables: { from: start, to: end, excludeNodeId: nodeId }
  });

  const items: InventoryItemRow[] = useMemo(
    () => (itemsData?.activeInventoryItems ?? []).map((x: any) => ({
      id: String(x.id),
      name: x.name,
      type: x.type,
      location: x.location,
      description: x.description
    })),
    [itemsData]
  );

  // itemId → first conflict in the window.
  const conflictByItem = useMemo(() => {
    const map = new Map<string, Conflict>();
    for (const c of (availData?.inventoryAvailability ?? []) as Conflict[]) {
      if (!map.has(String(c.itemId))) map.set(String(c.itemId), { ...c, itemId: String(c.itemId) });
    }
    return map;
  }, [availData]);

  const suggestedSet = useMemo(() => new Set((suggestedIds ?? []).map(String)), [suggestedIds?.join('|')]);

  // Sort: selected/suggested/available first, conflicted (disabled) last.
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aC = conflictByItem.has(a.id) && !selected.has(a.id) ? 1 : 0;
      const bC = conflictByItem.has(b.id) && !selected.has(b.id) ? 1 : 0;
      if (aC !== bC) return aC - bC;
      const aS = suggestedSet.has(a.id) ? 0 : 1;
      const bS = suggestedSet.has(b.id) ? 0 : 1;
      if (aS !== bS) return aS - bS;
      return a.name.localeCompare(b.name);
    });
  }, [items, conflictByItem, suggestedSet, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSaving(true);
    try {
      const ids = [...selected];
      await client.mutate({
        mutation: SET_WORKFLOW_NODE_USED_INVENTORY,
        variables: { _ID: nodeId, inventoryIds: ids, reservationStart: start, reservationEnd: end }
      });
      onSaved?.(ids);
      onClose();
    } catch (e) {
      setErrorMessage(formatGqlError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='sm' fullWidth>
        <DialogTitle>
          Inventory for this operation
          {nodeLabel ? <Typography variant='caption' display='block' color='text.secondary'>{nodeLabel}</Typography> : null}
        </DialogTitle>
        <DialogContent dividers>
          {errorMessage && <Alert severity='error' sx={{ mb: 1 }}>{errorMessage}</Alert>}

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              Reserve for this time window. Items already held by another operation or booked on the calendar for this window are disabled.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DateTimePicker label='Reserve from' value={start} onChange={setStart} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              <DateTimePicker label='Reserve until' value={end} onChange={setEnd} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </Stack>
          </Box>

          {items.length === 0 ? (
            <Typography color='text.secondary'>No inventory items defined yet.</Typography>
          ) : (
            <List disablePadding>
              {sortedItems.map((it) => {
                const conflict = conflictByItem.get(it.id);
                const isChecked = selected.has(it.id);
                // A conflict we're not already holding blocks selection.
                const isBlocked = !!conflict && !isChecked;
                const isSuggested = suggestedSet.has(it.id);
                return (
                  <ListItem key={it.id} disablePadding>
                    <ListItemButton dense disabled={isBlocked} onClick={() => toggle(it.id)}>
                      <ListItemIcon>
                        <Checkbox edge='start' checked={isChecked} tabIndex={-1} disableRipple />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                            <span>{it.name}</span>
                            {it.type && <Chip size='small' label={it.type} />}
                            {isSuggested && <Chip size='small' color='primary' variant='outlined' label='Suggested' />}
                            {isBlocked && (
                              <Chip
                                size='small'
                                color={conflict?.source === 'BOOKING' ? 'info' : 'warning'}
                                label={conflict?.source === 'BOOKING' ? `Booked — ${conflict?.label}` : `In use — ${conflict?.label}`}
                              />
                            )}
                          </Stack>
                        }
                        secondary={[it.location, it.description].filter(Boolean).join(' · ') || undefined}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant='contained' disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
