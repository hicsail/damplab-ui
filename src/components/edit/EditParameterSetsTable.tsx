import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DataGrid, GridColDef, GridRowModesModel, GridSlots } from '@mui/x-data-grid';
import { GET_PARAMETER_SETS } from '../../gql/queries';
import { GridToolBar } from './GridToolBar';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import { formatGqlError } from '../../utils/gqlError';
import { usedByLabel } from './parameterSetForm';

export interface EditParameterSetsTableProps {
  searchString?: string;
}

/** Pin 1: every set with its name, parameter count and how many operations use it. Row click opens it. */
export const EditParameterSetsTable: React.FC<EditParameterSetsTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const [, setRowModesModel] = useState<GridRowModesModel>({});
  const { data, loading, error } = useQuery(GET_PARAMETER_SETS, { fetchPolicy: 'cache-and-network' });

  const rows = useMemo(() => {
    const all = data?.parameterSets ?? [];
    const q = searchString.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) ||
        (s.parameters ?? []).some((p: any) => String(p?.name ?? p?.id ?? '').toLowerCase().includes(q))
    );
  }, [data, searchString]);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
    { field: 'parameterCount', headerName: 'Parameters', width: 130, valueGetter: (_v, row) => (row.parameters ?? []).length },
    { field: 'usedBy', headerName: 'Used by', width: 200, valueGetter: (_v, row) => usedByLabel((row.usedBy ?? []).length) },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 }
  ];

  return (
    <Stack spacing={2}>
      {/* A failed list query must not read as "there are no sets" — an empty grid
          looks the same as a genuinely empty catalog. */}
      {!!error && <Alert severity='error'>{formatGqlError(error)}</Alert>}
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        onRowClick={(params) => navigate(`/edit/parameter-sets/${params.row.id}`)}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        slots={{ toolbar: GridToolBar as GridSlots['toolbar'] }}
        slotProps={{
          toolbar: {
            canWrite,
            setRowModesModel,
            addButtonLabel: 'Add parameter set',
            onAdd: () => navigate('/edit/parameter-sets/new'),
            showEditModeHint: false
          }
        }}
      />
    </Stack>
  );
};
