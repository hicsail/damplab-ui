import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Select, FormControl, MenuItem, Checkbox, ListItemText, SelectChangeEvent } from '@mui/material';
import { useContext, useState } from 'react';
import { AppContext } from '../../contexts/App';

export const EditBundlesTable: React.FC = () => {
  const { bundles, services } = useContext(AppContext);

  const columns: GridColDef[] = [
    {
      field: 'label',
      width: 500,
      editable: true
    },
    {
      field: 'services',
      headerName: 'Services',
      width: 500,
      renderCell: (params) => <ServiceSelection services={services} bundle={params.row} />
    }
  ];

  return (
    <DataGrid
      rows={bundles}
      columns={columns}
    />
  );
};

interface ServiceSelectionProps {
  services: any[];
  bundle: any;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = (props) => {
  const [displayValue, setDisplayValue] = useState<string[]>(props.bundle.services.map((service: any) => service.name));

  const handleSelection = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setDisplayValue(typeof value === 'string' ? value.split(',') : value)
  };

  return (
    <FormControl sx={{ width: '100%' }}>
      <Select
        multiple
        value={displayValue}
        renderValue={(selected) => selected.join(', ')}
        onChange={handleSelection}
      >
        {props.services.map(service => (
          <MenuItem value={service.name} key={service.id}>
            <Checkbox checked={props.bundle.services.some((elem: any) => elem.id == service.id)} />
            <ListItemText primary={service.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
