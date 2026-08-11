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
import type { InventoryItemRow, HolderInfo } from './InventoryCard';

interface InventoryCategoryGroupProps {
  type: string;
  items: InventoryItemRow[];
  heldBy: Map<string, HolderInfo>;
  expanded: boolean;
  onToggle: () => void;
}

export default function InventoryCategoryGroup({ type, items, heldBy, expanded, onToggle }: InventoryCategoryGroupProps) {
  const groupInUse = items.filter((it) => heldBy.has(it.id)).length;
  const groupFree = items.length - groupInUse;

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
          <Typography variant='h6'>{type}</Typography>
          <Chip size='small' label={`${items.length} total`} />
          <Chip size='small' color='success' label={`${groupFree} free`} />
          {groupInUse > 0 && <Chip size='small' color='warning' label={`${groupInUse} in use`} />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {items.map((it) => (
            <InventoryCard key={it.id} item={it} holder={heldBy.get(it.id)} />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
