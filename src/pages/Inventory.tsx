import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  GET_ACTIVE_INVENTORY_ITEMS,
  GET_IN_PROGRESS_NODES_HOLDING_INVENTORY
} from '../gql/queries';

interface InventoryItemRow {
  id: string;
  name: string;
  type?: string;
  location?: string;
  description?: string;
}

interface HolderInfo {
  nodeId: string;
  nodeLabel: string;
  serviceName?: string;
  jobName?: string;
  jobDisplayId?: string;
  startedAt?: string;
  assigneeDisplayName?: string;
}

function elapsedMinutes(startedAt?: string | null): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 60000));
}

/**
 * Staff inventory availability board. Polls every 15s like the lab monitor.
 * Grouped by item type, with a chip showing whether each item is free or in
 * use (and by which node / job, including elapsed time).
 */
export default function Inventory() {
  const { data: itemsData, loading: itemsLoading } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000
  });
  const { data: heldData, loading: heldLoading } = useQuery(GET_IN_PROGRESS_NODES_HOLDING_INVENTORY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000
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

  // Map inventoryId → holder (only one holder possible under exclusivity).
  const heldBy = useMemo(() => {
    const m = new Map<string, HolderInfo>();
    const nodes: any[] = heldData?.getInProgressNodesHoldingInventory ?? [];
    for (const n of nodes) {
      for (const invId of n.usedInventory ?? []) {
        m.set(String(invId), {
          nodeId: String(n._id),
          nodeLabel: n.label || n.service?.name || 'Node',
          serviceName: n.service?.name,
          jobName: n.workflow?.job?.name,
          jobDisplayId: n.workflow?.job?.jobId,
          startedAt: n.startedAt ?? undefined,
          assigneeDisplayName: n.assigneeDisplayName ?? undefined
        });
      }
    }
    return m;
  }, [heldData]);

  // Group items by type.
  const grouped = useMemo(() => {
    const groups: Record<string, InventoryItemRow[]> = {};
    for (const it of items) {
      const key = it.type || 'OTHER';
      (groups[key] ||= []).push(it);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [items]);

  const inUseCount = useMemo(() => items.filter((i) => heldBy.has(i.id)).length, [items, heldBy]);
  const totalCount = items.length;

  return (
    <Stack spacing={3}>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Typography variant='h2'>Inventory availability</Typography>
        {(itemsLoading || heldLoading) && totalCount === 0 && <CircularProgress size={24} />}
      </Stack>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Chip color='success' icon={<CheckCircleOutlineIcon />} label={`${totalCount - inUseCount} free`} />
        <Chip color='warning' icon={<GraphicEqIcon />} label={`${inUseCount} in use`} />
        <Chip label={`${totalCount} total`} />
      </Stack>

      {totalCount === 0 && !itemsLoading && (
        <Typography color='text.secondary'>
          No inventory items defined yet. Add some on the{' '}
          <Link component={RouterLink} to='/edit'>catalog editor</Link>.
        </Typography>
      )}

      {Object.entries(grouped).map(([type, rows]) => (
        <Box key={type}>
          <Typography variant='h5' sx={{ mb: 1 }}>{type}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {rows.map((it) => {
              const holder = heldBy.get(it.id);
              const elapsed = elapsedMinutes(holder?.startedAt);
              return (
                <Card key={it.id} variant='outlined' sx={{ borderColor: holder ? '#dc2626' : '#16a34a' }}>
                  <CardContent>
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
                      <PrecisionManufacturingIcon fontSize='small' />
                      <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>{it.name}</Typography>
                      <Chip
                        size='small'
                        color={holder ? 'warning' : 'success'}
                        label={holder ? 'In use' : 'Free'}
                      />
                    </Stack>
                    {it.location && (
                      <Typography variant='body2' color='text.secondary'>{it.location}</Typography>
                    )}
                    {holder ? (
                      <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, backgroundColor: 'action.hover' }}>
                        <Typography variant='body2'>
                          <strong>{holder.nodeLabel}</strong>
                          {holder.jobName ? ` · ${holder.jobName}` : ''}
                          {holder.jobDisplayId ? ` (${holder.jobDisplayId})` : ''}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' display='block'>
                          {holder.assigneeDisplayName ? `Assignee: ${holder.assigneeDisplayName}` : 'Unassigned'}
                          {elapsed != null ? ` · ${elapsed}m elapsed` : ''}
                        </Typography>
                      </Box>
                    ) : (
                      it.description && (
                        <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
                          {it.description}
                        </Typography>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
