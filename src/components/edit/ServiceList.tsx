import { FormControl, Select, MenuItem } from '@mui/material';

export interface ServiceListProps {
  services: any[];
}

export const ServiceList: React.FC<ServiceListProps> = (props) => {
  const values = props.services ? props.services.map(service => service.name) : [];

  return (
    <FormControl sx={{ width: '100% '}}>
      <Select
        multiple
        value={values}
      >
        {/* Keyed on position, not name: a bundle may run the same operation at
            more than one step, so names are no longer unique in this list. */}
        {values.map((value, index) => (
          <MenuItem key={`${index}-${value}`} value={value}>{value}</MenuItem>
        ))}
      </Select>

    </FormControl>
  )
}
