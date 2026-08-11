import { useQuery } from '@apollo/client';
import {
  Chip,
  CircularProgress,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  GET_ACTIVE_INVENTORY_ITEMS,
  GET_BOOKINGS,
  GET_BUNDLES_WITH_INVENTORY,
  GET_IN_PROGRESS_NODES_HOLDING_INVENTORY
} from '../gql/queries';
import InventoryFilterBar, { type InventoryFilters } from '../components/InventoryFilterBar';
import { type InventoryItemRow, type HolderInfo, type NextBookingInfo } from '../components/InventoryCard';
import InventoryCategoryGroup from '../components/InventoryCategoryGroup';
import InventoryBundleGroup, { type BundleWithInventory } from '../components/InventoryBundleGroup';

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
type ViewMode = 'type' | 'bundle';

export default function Inventory() {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('type');

  const { data: itemsData, loading: itemsLoading } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000
  });
  const { data: heldData, loading: heldLoading } = useQuery(GET_IN_PROGRESS_NODES_HOLDING_INVENTORY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000
  });

  // Query upcoming bookings (next 7 days) to show "Next booking" on free items.
  // Variables are computed fresh each render so the polling query always uses current dates.
  const now = new Date();
  const bookingsTo = new Date(now);
  bookingsTo.setDate(bookingsTo.getDate() + 7);
  const { data: bookingsData } = useQuery(GET_BOOKINGS, {
    variables: { from: now.toISOString(), to: bookingsTo.toISOString() },
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000
  });

  const { data: bundlesData } = useQuery(GET_BUNDLES_WITH_INVENTORY, {
    fetchPolicy: 'cache-and-network',
    skip: viewMode !== 'bundle'
  });

  const bundles: BundleWithInventory[] = useMemo(
    () => (bundlesData?.bundles ?? []).map((b: any) => ({
      id: String(b.id),
      label: b.label,
      icon: b.icon,
      services: (b.services ?? []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        inventoryRequirements: (s.inventoryRequirements ?? []).map(String)
      }))
    })),
    [bundlesData]
  );

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
          estimatedMinutes: n.estimatedMinutes ?? undefined,
          assigneeDisplayName: n.assigneeDisplayName ?? undefined
        });
      }
    }
    return m;
  }, [heldData]);

  // Map inventoryId → next upcoming booking (soonest per item, only RESERVED status).
  const nextBookingMap = useMemo(() => {
    const m = new Map<string, NextBookingInfo>();
    const bookings: any[] = bookingsData?.bookings ?? [];
    const sorted = [...bookings]
      .filter((b: any) => b.status === 'RESERVED' && b.startTime)
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    for (const b of sorted) {
      const itemId = String(b.inventoryItem);
      if (!m.has(itemId)) {
        m.set(itemId, { startTime: b.startTime, ownerName: b.ownerName });
      }
    }
    return m;
  }, [bookingsData]);

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

  // Track which category sections are expanded (all collapsed by default).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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

      <Tabs
        value={viewMode}
        onChange={(_, v) => setViewMode(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label='By Type' value='type' sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }} />
        <Tab label='By Bundle' value='bundle' sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }} />
      </Tabs>

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

      {viewMode === 'type' && Object.entries(grouped).map(([type, rows]) => (
        <InventoryCategoryGroup
          key={type}
          type={type}
          items={rows}
          heldBy={heldBy}
          nextBookingMap={nextBookingMap}
          expanded={expanded.has(type)}
          onToggle={() => toggleExpanded(type)}
        />
      ))}

      {viewMode === 'bundle' && bundles.map((bundle) => (
        <InventoryBundleGroup
          key={bundle.id}
          bundle={bundle}
          allItems={items}
          heldBy={heldBy}
          nextBookingMap={nextBookingMap}
          expanded={expanded.has(bundle.id)}
          onToggle={() => toggleExpanded(bundle.id)}
        />
      ))}
    </Stack>
  );
}
