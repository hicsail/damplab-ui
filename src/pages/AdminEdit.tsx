import { Stack, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { ToolBar } from '../components/edit/ToolBar';
import { EditBundlesTable } from '../components/edit/EditBundlesTable';
import { EditCategoriesTable } from '../components/edit/EditCategoriesTable';
import { EditServicesTable } from '../components/edit/EditServicesTable';
import { EditInventoryTable } from '../components/edit/EditInventoryTable';
import { AppContext } from '../contexts/App';

type EditTypes = 'Services' | 'Categories' | 'Bundles' | 'Inventory';

export default function AdminEdit () {
  const { refreshCatalog } = useContext(AppContext);
  const [editType, setEditType] = useState<EditTypes>('Services');
  const [searchString, setSearchString] = useState<string>('');

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const tableSelector = (type: EditTypes) => {
    switch(type) {
      case 'Services': return <EditServicesTable searchString={searchString} />;
      case 'Categories': return <EditCategoriesTable searchString={searchString} />;
      case 'Bundles': return <EditBundlesTable searchString={searchString} />;
      case 'Inventory': return <EditInventoryTable searchString={searchString} />;
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>Catalog Editor</Typography>
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
