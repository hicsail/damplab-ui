import { Select, FormControl, MenuItem, Checkbox, ListItemText, SelectChangeEvent } from '@mui/material';
import { GridRenderEditCellParams, useGridApiContext } from '@mui/x-data-grid';
import { useState, useRef, useLayoutEffect } from 'react';

interface ServiceSelectionProps extends GridRenderEditCellParams {
  allServices: any[];
  selectedServices?: any[];
}

export const ServiceSelection: React.FC<ServiceSelectionProps> = (props) => {
  const selectedServices = props.selectedServices ? props.selectedServices : [];

  const options = props.allServices;
  const [selected, setSelected] = useState<any[]>(
    options
      .filter((option) => selectedServices.find(selected => option.id == selected.id))
  );

  const gridRef = useGridApiContext();
  const ref = useRef();

  useLayoutEffect(() => {
    if (props.hasFocus && ref && ref.current) {
      (ref.current as any).focus();
    }
  }, [props.hasFocus]);

  const handleSelection = (event: SelectChangeEvent) => {
    const selectedServices = event.target.value as any;
    // Set the visualization of the selected
    setSelected(selectedServices);
    // Update the internal state of the new selection
    gridRef.current.setEditCellValue({ id: props.id, field: props.field, value: selectedServices });
  };

  return (
    <FormControl sx={{ width: '100%' }}>
      <Select
        multiple
        value={selected as any}
        renderValue={(service) => (service as any).map((service: any) => service.name).join(', ')}
        onChange={handleSelection}
        ref={ref}
      >
        {options.map(service => (
          <MenuItem value={service} key={service.id}>
            <Checkbox checked={selected.some((elem: any) => elem.id === service.id)} />
            <ListItemText primary={service.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
