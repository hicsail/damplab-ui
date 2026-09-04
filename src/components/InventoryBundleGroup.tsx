import { useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InventoryCard from './InventoryCard';
import type { InventoryItemRow, HolderInfo, NextBookingInfo } from './InventoryCard';

export interface BundleWithInventory {
  id: string;
  label: string;
  icon?: string;
  services: {
    id: string;
    name: string;
    inventoryRequirements?: string[];
  }[];
}

type BundleAvailability = 'available' | 'partial' | 'unavailable';

function getBundleAvailability(
  requiredIds: string[],
  heldBy: Map<string, HolderInfo>
): BundleAvailability {
  if (requiredIds.length === 0) return 'available';
  const inUseCount = requiredIds.filter((id) => heldBy.has(id)).length;
  if (inUseCount === 0) return 'available';
  if (inUseCount === requiredIds.length) return 'unavailable';
  return 'partial';
}

const AVAILABILITY_CONFIG: Record<BundleAvailability, { label: string; color: 'success' | 'warning' | 'error' }> = {
  available: { label: 'Available', color: 'success' },
  partial: { label: 'Partially Available', color: 'warning' },
  unavailable: { label: 'Unavailable', color: 'error' }
};

interface InventoryBundleGroupProps {
  bundle: BundleWithInventory;
  allItems: InventoryItemRow[];
  heldBy: Map<string, HolderInfo>;
  nextBookingMap?: Map<string, NextBookingInfo>;
  expanded: boolean;
  onToggle: () => void;
}

export default function InventoryBundleGroup({
  bundle,
  allItems,
  heldBy,
  nextBookingMap,
  expanded,
  onToggle
}: InventoryBundleGroupProps) {
  // Collect unique inventory IDs required by all services in this bundle.
  const requiredIds = useMemo(() => [
    ...new Set(
      bundle.services.flatMap((s) => (s.inventoryRequirements ?? []).map(String))
    )
  ], [bundle.services]);

  // Resolve to actual inventory items (filter out any that don't exist in active items).
  const requiredItems = useMemo(() => requiredIds
    .map((id) => allItems.find((it) => it.id === id))
    .filter(Boolean) as InventoryItemRow[], [requiredIds, allItems]);

  const unmappedServices = useMemo(() => bundle.services.filter(
    (s) => !s.inventoryRequirements || s.inventoryRequirements.length === 0
  ), [bundle.services]);

  const availability = getBundleAvailability(requiredIds, heldBy);
  const config = AVAILABILITY_CONFIG[availability];
  const inUseCount = useMemo(() => requiredItems.filter((it) => heldBy.has(it.id)).length, [requiredItems, heldBy]);

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        overflow: 'hidden'
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: 'action.hover',
          '&:hover': { backgroundColor: 'action.selected' },
          minHeight: 48
        }}
      >
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography variant='h6'>{bundle.label}</Typography>
          <Chip size='small' color={config.color} label={config.label} />
          {requiredItems.length > 0 && (
            <>
              <Chip size='small' label={`${requiredItems.length} items`} />
              {inUseCount > 0 && <Chip size='small' color='warning' label={`${inUseCount} in use`} />}
            </>
          )}
          {requiredItems.length === 0 && (
            <Chip size='small' variant='outlined' label='No inventory mapped' />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {unmappedServices.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant='caption' color='text.secondary'>
              Services without inventory requirements:{' '}
              {/* Named once each: this says which operations lack requirements,
                  not how many steps of the bundle run them. */}
              {[...new Set(unmappedServices.map((s) => s.name))].join(', ')}
            </Typography>
          </Box>
        )}
        {requiredItems.length === 0 ? (
          <Typography color='text.secondary'>
            No inventory items are mapped to this bundle&apos;s services.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {requiredItems.map((it) => (
              <InventoryCard
                key={it.id}
                item={it}
                holder={heldBy.get(it.id)}
                nextBooking={!heldBy.has(it.id) ? nextBookingMap?.get(it.id) : undefined}
              />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
