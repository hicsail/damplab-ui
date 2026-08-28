import { useApolloClient, useQuery } from '@apollo/client';
import { CREATE_CATEGORY, DELETE_CATEGORY, GET_CATEGORIES, UPDATE_CATEGORY } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowModel,
  GridSlots
} from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { GridToolBar } from './GridToolBar';
import { Alert, Snackbar, Stack } from '@mui/material';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import { formatSaveError } from '../../utils/gqlError';


export interface EditCategoriesTableProps {
  searchString?: string;
}

export const EditCategoriesTable: React.FC<EditCategoriesTableProps> = ({ searchString = '' }) => {
  const { data, refetch } = useQuery(GET_CATEGORIES);
  const [rows, setRows] = useState<any[]>([]);
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setRows(data.categories);
      return;
    }
    setRows([]);
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchString.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const label = String(row?.label ?? '').toLowerCase();
      if (label.includes(q)) return true;

      const svc = row?.services;
      if (Array.isArray(svc)) {
        return svc.some((s: any) => String(s?.name ?? '').toLowerCase().includes(q));
      }

      return false;
    });
  }, [rows, searchString]);

  const handleDeletion = async (id: GridRowId) => {
    // Previously had no try/catch, so a refusal was an unhandled rejection.
    try {
      await client.mutate({
        mutation: DELETE_CATEGORY,
        variables: {
          category: id
        }
      });
      refetch();
    } catch (error) {
      console.error('Delete category failed:', error);
      setErrorMessage(formatSaveError(error, 'this category'));
    }
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleUpdate = async (newRow: GridRowModel) => {
    // The services need to be a list of IDs
    const changes = {
      label: newRow.label,
      services: newRow.services.map((service: any) => service.id)
    };

    await client.mutate({
      mutation: UPDATE_CATEGORY,
      variables: {
        category: newRow.id,
        changes
      }
    });

    return newRow;
  };

  const handleCreate = async (newRow: GridRowModel) => {
    const newCateogry = {
      label: newRow.label || '',
      services: newRow.services ? newRow.services.map((service: any) => service.id) : []
    };

    await client.mutate({
      mutation: CREATE_CATEGORY,
      variables: {
        category: newCateogry
      }
    });

    refetch();

    return { ...newRow, isNew: false };
  }

  const processRowUpdate = async (newRow: GridRowModel) => {
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
      editable: canWrite
    },
    {
      field: 'services',
      headerName: 'Services',
      width: 500,
      editable: canWrite,
      renderCell: (params) => <ServiceList services={params.row.services} />,
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} {...params} />
    },
    getActionsColumn({
      handleDelete: (id) => handleDeletion(id),
      handleEdit: (id) => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) => setRowModesModel({
        ...rowModesModel,
        [id]: { mode: GridRowModes.View, ignoreModifications: true }
      }),
      handleSave: (id) => handleSave(id),
      rowModesModel,
      canWrite
    })
  ];

  return (
    <Stack spacing={1}>
      <DataGrid
        rows={filteredRows}
        columns={columns}
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
        onRowEditStop={handleRowEditStop}
        // A rejected processRowUpdate makes MUI revert the row. This used to only
        // console.log, so a refused save looked like the edit silently undid itself.
        onProcessRowUpdateError={(error) => {
          console.error('Save category failed:', error);
          setErrorMessage(formatSaveError(error, 'this category'));
        }}
        editMode="row"
        processRowUpdate={processRowUpdate}
        slots={{
          toolbar: GridToolBar as GridSlots['toolbar']
        }}
        slotProps={{
          toolbar: { canWrite, setRowModesModel, setRows },
        }}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
};
