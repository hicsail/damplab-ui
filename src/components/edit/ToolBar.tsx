import { Dispatch, SetStateAction } from 'react';
import { Select, FormControl, Stack, MenuItem, TextField } from '@mui/material';

type EditTypes = 'Services' | 'Categories' | 'Bundles';


export interface ToolBarProps {
  editType: EditTypes;
  setEditType: Dispatch<SetStateAction<EditTypes>>;

  searchString: string;
  setSearchString: Dispatch<SetStateAction<string>>;
}

export const ToolBar: React.FC<ToolBarProps> = (props) => {
  return (
    <FormControl>
      <Stack direction='row' spacing={3}>
        {/* Switching between the edit views */}
        <Select value={props.editType} onChange={(event) => props.setEditType(event.target.value as EditTypes)}>
          <MenuItem value={'Services'}>Services</MenuItem>
          <MenuItem value={'Categories'}>Categories</MenuItem>
          <MenuItem value={'Bundles'}>Bundles</MenuItem>
        </Select>

        {/* Name based filtering */}
        <TextField label="Search" value={props.searchString} onChange={(event) => props.setSearchString(event.target.value)}/>

      </Stack>
    </FormControl>
  );
};
