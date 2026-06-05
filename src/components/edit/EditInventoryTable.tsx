import { useApolloClient, useQuery } from '@apollo/client';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowId, GridRowModesModel, GridSlots } from '@mui/x-data-grid';
import { Alert, Chip, Snackbar, Stack } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { GridToolBar } from './GridToolBar';
import { DELETE_INVENTORY_ITEM, GET_INVENTORY_ITEMS } from '../../gql/queries';

export interface EditInventoryTableProps {
  searchString?: string;
}

export const EditInventoryTable: React.FC<EditInventoryTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const client = useApolloClient();
  // The inventory list isn't on AppContext yet (unlike services/bundles), so we
  // query directly and refetch after mutations. If the catalog grows enough
  // that this gets called a lot, lift to AppContext.
  const { data, refetch } = useQuery(GET_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network' });
  const [rows, setRows] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRowModesModel] = useState<GridRowModesModel>({});

  useEffect(() => {
    setRows(data?.inventoryItems ?? []);
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchString.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row?.name, row?.type, row?.description, row?.location]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      return haystack.includes(q);
    });
  }, [rows, searchString]);

  const handleDelete = async (id: GridRowId) => {
    try {
      await client.mutate({ mutation: DELETE_INVENTORY_ITEM, variables: { item: id } });
      await refetch();
    } catch (_error) {
      setErrorMessage('Unable to delete inventory item. Please try again.');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) => [
        <GridActionsCellItem key='edit' icon={<Edit />} label='Edit' onClick={() => navigate(`/edit/inventory/${id}`)} color='inherit' />,
        <GridActionsCellItem key='delete' icon={<Delete />} label='Delete' onClick={() => handleDelete(id)} color='inherit' />
      ]
    },
    { field: 'name', headerName: 'Name', width: 240, flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 140,
      renderCell: (params) => (params.row.type ? <Chip size='small' label={String(params.row.type)} /> : null)
    },
    { field: 'location', headerName: 'Location', width: 200 },
    { field: 'description', headerName: 'Description', width: 320, flex: 1 },
    {
      field: 'isDeleted',
      headerName: 'Status',
      width: 110,
      renderCell: (params) =>
        params.row.isDeleted ? (
          <Chip size='small' color='default' label='Deleted' />
        ) : (
          <Chip size='small' color='success' label='Active' />
        )
    }
  ];

  return (
    <Stack spacing={1}>
      <DataGrid
        rows={filteredRows}
        columns={columns}
        slots={{ toolbar: GridToolBar as GridSlots['toolbar'] }}
        slotProps={{
          toolbar: {
            setRowModesModel,
            addButtonLabel: 'Add new inventory item',
            onAdd: () => navigate('/edit/inventory/new'),
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
    </Stack>
  );
};
