import { Alert, Stack, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ToolBar, EditTypes } from '../components/edit/ToolBar';
import { readStoredEditType, storeEditType } from '../components/edit/editTypeStorage';
import { EditBundlesTable } from '../components/edit/EditBundlesTable';
import { EditCategoriesTable } from '../components/edit/EditCategoriesTable';
import { EditServicesTable } from '../components/edit/EditServicesTable';
import { EditInventoryTable } from '../components/edit/EditInventoryTable';
import { EditSowSectionsTable } from '../components/edit/EditSowSectionsTable';
import { EditParameterSetsTable } from '../components/edit/EditParameterSetsTable';
import { WorkbookButtons, WorkbookMessage } from '../components/edit/workbook/WorkbookButtons';
import { DownloadCatalogButton } from '../components/edit/DownloadCatalogButton';
import { Can } from '../components/PermissionGate';
import { PERMISSIONS } from '../hooks/usePermissions';
import { AppContext } from '../contexts/App';

export default function AdminEdit () {
  const { refreshCatalog } = useContext(AppContext);
  const location = useLocation();
  // A Delete/Cancel elsewhere in the editor navigates back here with
  // `state: { editType: 'Parameter Sets' }` so the list re-selects that tab.
  // Otherwise the page opens on whichever view this browser was on last.
  const [editType, setEditType] = useState<EditTypes>(
    () => (location.state as { editType?: EditTypes } | null)?.editType ?? readStoredEditType() ?? 'Services'
  );
  const [searchString, setSearchString] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [workbookMessage, setWorkbookMessage] = useState<WorkbookMessage | null>(null);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    storeEditType(editType);
  }, [editType]);

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
      <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2}>
        <Typography variant='h2'>Catalog Editor</Typography>
        <Stack direction='row' alignItems='center' flexWrap='wrap' gap={1}>
          {/* The workbook is one file for the Services, Parameter Sets, Categories, Bundles and SOWs views. */}
          <WorkbookButtons editType={editType} onMessage={setWorkbookMessage} />
          <Can permission={PERMISSIONS.CatalogEditorWrite}>
            <DownloadCatalogButton onError={setDownloadError} />
          </Can>
        </Stack>
      </Stack>
      {downloadError && <Alert severity='error' onClose={() => setDownloadError(null)}>{downloadError}</Alert>}
      {workbookMessage && <Alert severity={workbookMessage.severity} onClose={() => setWorkbookMessage(null)}>{workbookMessage.text}</Alert>}
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
