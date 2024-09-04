import { FormControl, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Dispatch, SetStateAction, useState } from 'react';

type EditTypes = 'Services' | 'Categories' | 'Bundles';

export const AdminEdit: React.FC = () => {
  const [editType, setEditType] = useState<EditTypes>('Services');
  const [searchString, setSearchString] = useState<string>('');

  return (
    <Stack>
      <Typography variant='h2'>Admin Edit Screen</Typography>
      <ToolBar
        editType={editType}
        setEditType={setEditType}
        searchString={searchString}
        setSearchString={setSearchString}
      />
    </Stack>
  );
};

interface ToolBarProps {
  editType: EditTypes;
  setEditType: Dispatch<SetStateAction<EditTypes>>;

  searchString: string;
  setSearchString: Dispatch<SetStateAction<string>>;
}

const ToolBar: React.FC<ToolBarProps> = (props) => {
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
