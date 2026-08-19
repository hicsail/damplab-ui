import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Typography } from '@mui/material';
import { GET_SOW_PRESET_SECTIONS } from '../../gql/queries';

/**
 * The prose sections of a SOW, one row each, as a way in to that section's
 * library of text blocks.
 *
 * Read-only by design: a section is not a thing staff create or delete — the
 * document decides which sections exist. Everything editable lives one level
 * down, on the section page.
 */

export interface EditSowSectionsTableProps {
  searchString?: string;
}

interface SowPresetSectionRow {
  key: string;
  label: string;
  presetCount: number;
  defaultName?: string | null;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

function formatEdited(row: SowPresetSectionRow): string {
  if (!row.updatedAt) return '—';
  const when = new Date(row.updatedAt).toLocaleDateString();
  return row.updatedByName ? `${when} by ${row.updatedByName}` : when;
}

export const EditSowSectionsTable: React.FC<EditSowSectionsTableProps> = ({ searchString = '' }) => {
  const { data, loading } = useQuery(GET_SOW_PRESET_SECTIONS);
  const navigate = useNavigate();

  const rows: SowPresetSectionRow[] = useMemo(() => data?.sowPresetSections ?? [], [data]);

  const filteredRows = useMemo(() => {
    const q = searchString.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.label.toLowerCase().includes(q) || (row.defaultName ?? '').toLowerCase().includes(q));
  }, [rows, searchString]);

  const columns: GridColDef[] = [
    { field: 'label', headerName: 'Section', width: 320 },
    { field: 'presetCount', headerName: 'Text blocks', width: 130, type: 'number' },
    {
      field: 'defaultName',
      headerName: 'Default block',
      width: 260,
      // A section with no blocks is not an error — three of them start that way,
      // and the SOW falls back to its built-in wording until staff add one.
      renderCell: (params) =>
        params.row.defaultName ?? (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            None yet
          </Typography>
        )
    },
    { field: 'updatedAt', headerName: 'Last edited', width: 260, valueGetter: (_value, row) => formatEdited(row) }
  ];

  return (
    <DataGrid
      rows={filteredRows}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.key}
      disableRowSelectionOnClick
      onRowClick={(params) => navigate(`/edit/sow-sections/${params.row.key}`)}
      sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
    />
  );
};
