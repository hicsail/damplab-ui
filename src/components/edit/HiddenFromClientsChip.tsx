import { Chip, SxProps, Theme } from '@mui/material';

/**
 * Ruling D6: the brief wrote this chip's JSX at three call sites (the palette
 * card, the operations table's Name column, the read-only catalog's Name
 * column); this is the one shared component all three use.
 */
export function HiddenFromClientsChip({ sx }: { sx?: SxProps<Theme> }) {
  return <Chip size="small" color="warning" label="Hidden from clients" sx={sx} />;
}
