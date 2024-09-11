import { Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ToolBar } from '../components/edit/ToolBar';
import { EditBundlesTable } from '../components/edit/EditBundlesTable';
import { EditCategoriesTable } from '../components/edit/EditCategoriesTable';
import { EditServicesTable } from '../components/edit/EditServicesTable';

type EditTypes = 'Services' | 'Categories' | 'Bundles';

export const AdminEdit: React.FC = () => {
  const [editType, setEditType] = useState<EditTypes>('Services');
  const [searchString, setSearchString] = useState<string>('');

  const tableSelector = (type: EditTypes) => {
    switch(type) {
      case 'Services': return <EditServicesTable />;
      case 'Categories': return <EditCategoriesTable />;
      case 'Bundles': return <EditBundlesTable />;
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>Admin Edit Screen</Typography>
      <ToolBar
        editType={editType}
        setEditType={setEditType}
        searchString={searchString}
        setSearchString={setSearchString}
      />
      {tableSelector(editType)}
    </Stack>
  );
};
