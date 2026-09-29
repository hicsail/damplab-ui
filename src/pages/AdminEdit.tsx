import { Stack, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ToolBar, EditTypes } from '../components/edit/ToolBar';
import { EditBundlesTable } from '../components/edit/EditBundlesTable';
import { EditCategoriesTable } from '../components/edit/EditCategoriesTable';
import { EditServicesTable } from '../components/edit/EditServicesTable';
import { EditInventoryTable } from '../components/edit/EditInventoryTable';
import { EditSowSectionsTable } from '../components/edit/EditSowSectionsTable';
import { EditParameterSetsTable } from '../components/edit/EditParameterSetsTable';
import { AppContext } from '../contexts/App';

export default function AdminEdit () {
  const { refreshCatalog } = useContext(AppContext);
  const location = useLocation();
  // A Delete/Cancel elsewhere in the editor navigates back here with
  // `state: { editType: 'Parameter Sets' }` so the list re-selects that tab.
  const [editType, setEditType] = useState<EditTypes>(
    () => (location.state as { editType?: EditTypes } | null)?.editType ?? 'Services'
  );
  const [searchString, setSearchString] = useState<string>('');

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const tableSelector = (type: EditTypes) => {
    switch(type) {
      case 'Services': return <EditServicesTable searchString={searchString} />;
      case 'Parameter Sets': return <EditParameterSetsTable searchString={searchString} />;
      case 'Categories': return <EditCategoriesTable searchString={searchString} />;
      case 'Bundles': return <EditBundlesTable searchString={searchString} />;
      case 'Inventory': return <EditInventoryTable searchString={searchString} />;
      case 'SOWs': return <EditSowSectionsTable searchString={searchString} />;
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
