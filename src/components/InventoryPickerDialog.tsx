import { ApolloError, useApolloClient, useQuery } from '@apollo/client';
import {
  Alert,
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
import { useEffect, useMemo, useState } from 'react';
import {
  GET_ACTIVE_INVENTORY_ITEMS,
  GET_IN_PROGRESS_NODES_HOLDING_INVENTORY,
  SET_WORKFLOW_NODE_USED_INVENTORY
} from '../gql/queries';

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

interface HeldByEntry {
  itemId: string;
  byNodeId: string;
  byLabel: string;
  byJobName?: string;
}

function formatGqlError(error: unknown): string {
  if (error instanceof ApolloError) {
    const gqlMessage = error.graphQLErrors?.[0]?.message;
    if (gqlMessage) return gqlMessage;
  }
  return 'Could not save inventory selection.';
}

/**
 * Lets staff pick which inventory items a workflow node is using. Items
 * currently held by other IN_PROGRESS nodes are surfaced as disabled with a
 * "held by …" hint, so the user immediately sees why they can't pick them.
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
  const { data: itemsData } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, {
    fetchPolicy: 'cache-and-network',
    skip: !open
  });
  const { data: heldData, refetch: refetchHeld } = useQuery(GET_IN_PROGRESS_NODES_HOLDING_INVENTORY, {
    fetchPolicy: 'cache-and-network',
    skip: !open
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

  // Map of inventoryId → who's holding it (excluding ourselves).
  const heldByOthers = useMemo(() => {
    const map = new Map<string, HeldByEntry>();
    const nodes: any[] = heldData?.getInProgressNodesHoldingInventory ?? [];
    for (const n of nodes) {
      if (String(n._id) === String(nodeId)) continue;
      for (const invId of n.usedInventory ?? []) {
        map.set(String(invId), {
          itemId: String(invId),
          byNodeId: String(n._id),
          byLabel: n.label || n.service?.name || 'another node',
          byJobName: n.workflow?.job?.name
        });
      }
    }
    return map;
  }, [heldData, nodeId]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentlyHeldIds.map(String)));
      setErrorMessage(null);
    }
  }, [open, currentlyHeldIds.join('|')]);

  const suggestedSet = useMemo(() => new Set((suggestedIds ?? []).map(String)), [suggestedIds?.join('|')]);

  // Sort: currently-selected → suggested → available → held-by-others (disabled).
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aHeld = heldByOthers.has(a.id) ? 1 : 0;
      const bHeld = heldByOthers.has(b.id) ? 1 : 0;
      if (aHeld !== bHeld) return aHeld - bHeld;
      const aSug = suggestedSet.has(a.id) ? 0 : 1;
      const bSug = suggestedSet.has(b.id) ? 0 : 1;
      if (aSug !== bSug) return aSug - bSug;
      return a.name.localeCompare(b.name);
    });
  }, [items, heldByOthers, suggestedSet]);

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
        variables: { _ID: nodeId, inventoryIds: ids }
      });
      await refetchHeld();
      onSaved?.(ids);
      onClose();
    } catch (e) {
      setErrorMessage(formatGqlError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        Inventory in use
        {nodeLabel ? <Typography variant='caption' display='block' color='text.secondary'>{nodeLabel}</Typography> : null}
      </DialogTitle>
      <DialogContent dividers>
        {errorMessage && <Alert severity='error' sx={{ mb: 1 }}>{errorMessage}</Alert>}
        {items.length === 0 ? (
          <Typography color='text.secondary'>No inventory items defined yet.</Typography>
        ) : (
          <List disablePadding>
            {sortedItems.map((it) => {
              const heldBy = heldByOthers.get(it.id);
              const isHeldByOther = !!heldBy;
              const isChecked = selected.has(it.id);
              const isSuggested = suggestedSet.has(it.id);
              return (
                <ListItem key={it.id} disablePadding>
                  <ListItemButton
                    dense
                    disabled={isHeldByOther}
                    onClick={() => toggle(it.id)}
                  >
                    <ListItemIcon>
                      <Checkbox edge='start' checked={isChecked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                          <span>{it.name}</span>
                          {it.type && <Chip size='small' label={it.type} />}
                          {isSuggested && <Chip size='small' color='primary' variant='outlined' label='Suggested' />}
                          {isHeldByOther && (
                            <Chip
                              size='small'
                              color='warning'
                              label={`In use by ${heldBy?.byLabel}${heldBy?.byJobName ? ` (${heldBy.byJobName})` : ''}`}
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
  );
}
