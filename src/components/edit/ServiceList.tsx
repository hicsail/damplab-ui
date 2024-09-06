import { FormControl, Select, MenuItem } from '@mui/material';

export interface ServiceListProps {
  services: any[];
}

export const ServiceList: React.FC<ServiceListProps> = (props) => {
  const values = props.services.map(service => service.name);

  return (
    <FormControl sx={{ width: '100% '}}>
      <Select
        multiple
        value={values}
      >
        {values.map(value => (
          <MenuItem key={value} value={value}>{value}</MenuItem>
        ))}
      </Select>

    </FormControl>
  )
}
