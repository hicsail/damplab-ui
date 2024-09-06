import { Select, FormControl, MenuItem, Checkbox, ListItemText, SelectChangeEvent } from '@mui/material';
import { useState } from 'react';

interface ServiceSelectionProps {
  allServices: any[];
  selectedServices: any[];
}

export const ServiceSelection: React.FC<ServiceSelectionProps> = (props) => {
  const [displayValue, setDisplayValue] = useState<string[]>(props.selectedServices.map((service: any) => service.name));

  const handleSelection = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setDisplayValue(typeof value === 'string' ? value.split(',') : value)
  };

  console.log(props);

  return (
    <FormControl sx={{ width: '100%' }}>
      <Select
        multiple
        value={displayValue}
        renderValue={(selected) => selected.join(', ')}
        onChange={handleSelection}
      >
        {props.allServices.map(service => (
          <MenuItem value={service.name} key={service.id}>
            <Checkbox checked={props.selectedServices.some((elem: any) => elem.id == service.id)} />
            <ListItemText primary={service.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
