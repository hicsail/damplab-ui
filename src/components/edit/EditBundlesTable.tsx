import { useApolloClient } from '@apollo/client';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowId, GridRowModesModel, GridSlots } from '@mui/x-data-grid';
import { Alert, Button, Snackbar } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppContext } from '../../contexts/App';
import { ServiceList } from './ServiceList';
import { GridToolBar } from './GridToolBar';
import { DELETE_BUNDLE } from '../../gql/queries';

export interface EditBundlesTableProps {
  searchString?: string;
}

export const EditBundlesTable: React.FC<EditBundlesTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { bundles, refreshCatalog } = useContext(AppContext);
  const [rows, setRows] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRowModesModel] = useState<GridRowModesModel>({});

  useEffect(() => {
    setRows(bundles);
  }, [bundles]);

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

  const handleDelete = async (id: GridRowId) => {
    try {
      await client.mutate({
        mutation: DELETE_BUNDLE,
        variables: { bundle: id }
      });
      await refreshCatalog();
    } catch (_error) {
      setErrorMessage('Unable to delete bundle. Please try again.');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) => [
        <GridActionsCellItem
          key='edit'
          icon={<Edit />}
          label='Edit'
          onClick={() => navigate(`/edit/bundles/${id}`)}
          color='inherit'
        />,
        <GridActionsCellItem
          key='delete'
          icon={<Delete />}
          label='Delete'
          onClick={() => handleDelete(id)}
          color='inherit'
        />
      ]
    },
    {
      field: 'label',
      headerName: 'Name',
      width: 400,
      flex: 1
    },
    {
      field: 'icon',
      headerName: 'Icon',
      width: 220
    },
    {
      field: 'services',
      headerName: 'Services',
      width: 500,
      renderCell: (params) => <ServiceList services={params.row.services} />
    }
  ];

  return (
    <>
      <DataGrid
        rows={filteredRows}
        columns={columns}
        slots={{ toolbar: GridToolBar as GridSlots['toolbar'] }}
        slotProps={{
          toolbar: {
            setRowModesModel,
            addButtonLabel: 'Add new bundle',
            onAdd: () => navigate('/edit/bundles/new'),
            showEditModeHint: false
          }
        }}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity='error' sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
