import { useQuery } from '@apollo/client';
import {
  Box,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  GET_ACTIVE_INVENTORY_ITEMS,
  GET_IN_PROGRESS_NODES_HOLDING_INVENTORY
} from '../gql/queries';
import InventoryFilterBar, { type InventoryFilters } from '../components/InventoryFilterBar';
import InventoryCard, { type InventoryItemRow, type HolderInfo } from '../components/InventoryCard';

const DEFAULT_FILTERS: InventoryFilters = {
  searchText: '',
  statusFilter: 'all',
  typeFilter: 'all',
  locationFilter: 'all',
  bookableFilter: 'all'
};

/**
 * Staff inventory availability board. Polls every 15s like the lab monitor.
 * Grouped by item type, with a chip showing whether each item is free or in
 * use (and by which node / job, including elapsed time).
 */
export default function Inventory() {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);

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
      description: x.description,
      bookable: x.bookable
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

  // Derive unique types and locations for dropdown options.
  const typeOptions = useMemo(() => [...new Set(items.map((it) => it.type || 'OTHER'))].sort(), [items]);
  const locationOptions = useMemo(() => [...new Set(items.map((it) => it.location).filter(Boolean) as string[])].sort(), [items]);

  // Filter items by search text, status, type, location, and bookable.
  const filteredItems = useMemo(() => {
    const query = filters.searchText.toLowerCase().trim();
    return items.filter((it) => {
      if (filters.statusFilter === 'free' && heldBy.has(it.id)) return false;
      if (filters.statusFilter === 'inuse' && !heldBy.has(it.id)) return false;
      if (filters.typeFilter !== 'all' && (it.type || 'OTHER') !== filters.typeFilter) return false;
      if (filters.locationFilter !== 'all' && it.location !== filters.locationFilter) return false;
      if (filters.bookableFilter === 'yes' && !it.bookable) return false;
      if (filters.bookableFilter === 'no' && it.bookable) return false;
      if (!query) return true;
      return (
        it.name.toLowerCase().includes(query) ||
        (it.type ?? '').toLowerCase().includes(query) ||
        (it.location ?? '').toLowerCase().includes(query) ||
        (it.description ?? '').toLowerCase().includes(query)
      );
    });
  }, [items, heldBy, filters]);

  // Group filtered items by type.
  const grouped = useMemo(() => {
    const groups: Record<string, InventoryItemRow[]> = {};
    for (const it of filteredItems) {
      const key = it.type || 'OTHER';
      (groups[key] ||= []).push(it);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [filteredItems]);

  const inUseCount = useMemo(() => filteredItems.filter((i) => heldBy.has(i.id)).length, [filteredItems, heldBy]);
  const totalCount = filteredItems.length;

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

      <InventoryFilterBar
        filters={filters}
        onChange={setFilters}
        typeOptions={typeOptions}
        locationOptions={locationOptions}
      />

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
            {rows.map((it) => (
              <InventoryCard key={it.id} item={it} holder={heldBy.get(it.id)} />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
