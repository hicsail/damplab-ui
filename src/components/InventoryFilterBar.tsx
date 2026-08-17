import {
  Autocomplete,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface InventoryFilters {
  searchText: string;
  statusFilter: 'all' | 'free' | 'inuse';
  typeFilter: string;
  locationFilter: string;
  bookableFilter: 'all' | 'yes' | 'no';
}

interface InventoryFilterBarProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
  typeOptions: string[];
  locationOptions: string[];
}

export default function InventoryFilterBar({ filters, onChange, typeOptions, locationOptions }: InventoryFilterBarProps) {
  const update = (patch: Partial<InventoryFilters>) => onChange({ ...filters, ...patch });

  return (
    <Stack direction='row' spacing={2} alignItems='flex-end' flexWrap='wrap' useFlexGap>
      <TextField
        size='small'
        placeholder='Search by name, type, location…'
        value={filters.searchText}
        onChange={(e) => update({ searchText: e.target.value })}
        slotProps={{ input: { startAdornment: <InputAdornment position='start'><SearchIcon fontSize='small' /></InputAdornment> } }}
        sx={{ minWidth: 280 }}
      />
      <Autocomplete
        size='small'
        options={typeOptions}
        value={filters.typeFilter === 'all' ? null : filters.typeFilter}
        onChange={(_, val) => update({ typeFilter: val ?? 'all' })}
        renderInput={(params) => <TextField {...params} label='Type' />}
        sx={{ minWidth: 160 }}
      />
      <Autocomplete
        size='small'
        options={locationOptions}
        value={filters.locationFilter === 'all' ? null : filters.locationFilter}
        onChange={(_, val) => update({ locationFilter: val ?? 'all' })}
        renderInput={(params) => <TextField {...params} label='Location' />}
        sx={{ minWidth: 180 }}
      />
      <Stack spacing={0.5}>
        <Typography variant='caption' color='text.secondary'>Booking</Typography>
        <ToggleButtonGroup
          size='small'
          value={filters.bookableFilter}
          exclusive
          onChange={(_, val) => { if (val) update({ bookableFilter: val }); }}
        >
          <ToggleButton value='all'>All</ToggleButton>
          <ToggleButton value='yes'>Bookable</ToggleButton>
          <ToggleButton value='no'>Non-Bookable</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant='caption' color='text.secondary'>Status</Typography>
        <ToggleButtonGroup
          size='small'
          value={filters.statusFilter}
          exclusive
          onChange={(_, val) => { if (val) update({ statusFilter: val }); }}
        >
          <ToggleButton value='all'>All</ToggleButton>
          <ToggleButton value='free'>Free</ToggleButton>
          <ToggleButton value='inuse'>In Use</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );
}
