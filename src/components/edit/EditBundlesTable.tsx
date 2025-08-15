import { useApolloClient } from '@apollo/client';
import { DELETE_BUNDLE, CREATE_BUNDLE, UPDATE_BUNDLE } from '../../gql/mutations';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridRowModel,
  GridEventListener,
  GridRowEditStopReasons,
  GridRenderCellParams,
  GridRenderEditCellParams,
  useGridApiRef
} from '@mui/x-data-grid';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { ServiceSelection } from './ServiceSelection';
import { Button, Snackbar, Alert } from '@mui/material';
import { GridToolBar } from './GridToolBar';

type BundleRow = GridRowModel & {
  error?: string;
  isNew?: boolean;
};

export const EditBundlesTable: React.FC = () => {
  const { bundles, services } = useContext(AppContext);
  const [rows, setRows] = useState<BundleRow[]>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const gridRef = useGridApiRef();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setRows(bundles);
  }, [bundles]);

  // DELETE
  const handleDeletion = async (id: GridRowId) => {
    try {
      await client.mutate({
        mutation: DELETE_BUNDLE,
        variables: { id }
      });
      setRows(rows.filter((row) => row.id !== id));
    } catch (err) {
      console.error('Error deleting bundle:', err);
      setErrorMessage('Failed to delete bundle');
    }
  };

  // UPDATE
  const handleUpdate = async (newRow: GridRowModel) => {
    const changes = {
      label: newRow.label,
      icon: newRow.icon || null,
      services: newRow.services?.map((s: any) => s.id) || []
    };

    await client.mutate({
      mutation: UPDATE_BUNDLE,
      variables: {
        bundle: newRow.id,
        changes
      }
    });

    return newRow;
  };

  // CREATE
  const handleCreate = async (newRow: GridRowModel) => {
    const input = {
      label: newRow.label || '',
      icon: newRow.icon || null,
      services: newRow.services?.map((s: any) => s.id) || []
    };

    const result = await client.mutate({
      mutation: CREATE_BUNDLE,
      variables: { input }
    });

    setRows((prev) =>
      prev.map((row) =>
        row.id === newRow.id ? { ...result.data.createBundle, isNew: false } : row
      )
    );

    return { ...result.data.createBundle, isNew: false };
  };

  const processRowUpdate = async (newRow: BundleRow) => {
    if (!newRow.isNew) {
      return handleUpdate(newRow);
    } else {
      return handleCreate(newRow);
    }
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'label',
      width: 500,
      editable: true
    },
    { // Potentially change UI so services are easier to see in some kind of pop up
      field: 'services',
      headerName: 'Services',
      width: 500,
      renderCell: (params) => <ServiceList services={params.row.services} />,
      renderEditCell: (params: GridRenderEditCellParams) => (
        <ServiceSelection allServices={services} selectedServices={params.row.services} {...params} />
      )
    },
    getActionsColumn({
      handleDelete: handleDeletion,
      handleEdit: (id) =>
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) =>
        setRowModesModel({
          ...rowModesModel,
          [id]: { mode: GridRowModes.View, ignoreModifications: true }
        }),
      handleSave: (id) =>
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } }),
      rowModesModel
    })
  ];

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        editMode="row"
        slots={{
          toolbar: GridToolBar as any
        }}
        slotProps={{
          toolbar: { setRowModesModel, setRows }
        }}
        apiRef={gridRef}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
