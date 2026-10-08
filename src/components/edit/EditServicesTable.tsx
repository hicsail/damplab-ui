import { useApolloClient } from '@apollo/client';
import { DELETE_SERVICE } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowModesModel,
  GridActionsCellItem,
  GridSlots
} from '@mui/x-data-grid';
import { Box, Button, Snackbar, Alert, Stack, Typography } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { ServiceList } from './ServiceList';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { GridToolBar } from './GridToolBar';
import ConfirmDeleteDialog, { PendingDelete } from './ConfirmDeleteDialog';

import { useNavigate } from 'react-router';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import { formatSaveError } from '../../utils/gqlError';
import { withoutHidden } from '../../utils/paletteVisibility';
import { useShowHiddenOperations } from '../../hooks/useShowHiddenOperations';
import { ShowHiddenOperationsToggle } from './ShowHiddenOperationsToggle';
import { HiddenFromClientsChip } from './HiddenFromClientsChip';


type ServiceRow = Record<string, unknown> & { id: GridRowId; hiddenFromClients?: boolean | null };

function formatPricingSummary(row: Record<string, unknown>): string {
  const pricing = (row as any).pricing ?? {};
  const parts: string[] = [];
  const intVal = pricing.internal ?? (row as any).internalPrice;
  if (intVal != null && intVal !== '') parts.push(`Int ${intVal}`);
  const acad = pricing.externalAcademic ?? (row as any).externalAcademicPrice;
  if (acad != null && acad !== '') parts.push(`Acad ${acad}`);
  const mkt =
    pricing.externalMarket ?? pricing.external ?? (row as any).externalMarketPrice ?? (row as any).externalPrice;
  if (mkt != null && mkt !== '') parts.push(`Mkt ${mkt}`);
  const nosal = pricing.externalNoSalary ?? (row as any).externalNoSalaryPrice;
  if (nosal != null && nosal !== '') parts.push(`No sal ${nosal}`);
  const leg = pricing.legacy ?? (row as any).price;
  if (leg != null && leg !== '') parts.push(`Legacy ${leg}`);
  return parts.length ? parts.join(' · ') : '—';
}

export interface EditServicesTableProps {
  searchString?: string;
}

export const EditServicesTable: React.FC<EditServicesTableProps> = ({ searchString = '' }) => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const { canSeeHidden, showHidden, setShowHidden } = useShowHiddenOperations();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const { services, refreshCatalog } = useContext(AppContext);
  const client = useApolloClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [, setRowModesModel] = useState<GridRowModesModel>({});

  useEffect(() => {
    setRows(services as ServiceRow[]);
  }, [services]);

  const filteredRows = useMemo(() => {
    const visible = withoutHidden(rows, showHidden);
    const q = searchString.trim().toLowerCase();
    if (!q) return visible;

    return visible.filter((row) => {
      const name = String((row as any).name ?? '').toLowerCase();
      if (name.includes(q)) return true;

      const params = (row as any).parameters;
      if (Array.isArray(params)) {
        return params.some((p: any) => {
          const pid = String(p?.id ?? '').toLowerCase();
          const pname = String(p?.name ?? '').toLowerCase();
          return pid.includes(q) || pname.includes(q);
        });
      }

      return false;
    });
  }, [rows, searchString, showHidden]);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete<GridRowId> | null>(null);

  const handleDeletion = async (id: GridRowId) => {
    // Previously had no try/catch at all, so a refusal surfaced as an unhandled
    // rejection and the row simply stayed put with no explanation.
    try {
      await client.mutate({
        mutation: DELETE_SERVICE,
        variables: {
          service: id
        }
      });
      await refreshCatalog();
    } catch (error) {
      console.error('Delete service failed:', error);
      setErrorMessage(formatSaveError(error, 'this service'));
    }
  };

  const columns: GridColDef[] = [
    // Read tier keeps the table; it just loses the Actions column rather than
    // getting an Edit that opens a form it cannot save and a Delete that 403s.
    ...(canWrite
      ? [
          {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }: { id: GridRowId }) => [
              <GridActionsCellItem
                key="edit"
                icon={<Edit />}
                label="Edit"
                onClick={() => navigate(`/edit/services/${id}`)}
                color="inherit"
              />,
              <GridActionsCellItem
                key="delete"
                icon={<Delete />}
                label="Delete"
                onClick={() => setPendingDelete({ id, name: String(rows.find((row: any) => row.id === id)?.name ?? '') })}
                color="inherit"
              />
            ]
          } as GridColDef
        ]
      : []),
    {
      field: 'name',
      headerName: 'Name',
      width: 500,
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <>
          {params.row.name}
          {(params.row as any).hiddenFromClients && <HiddenFromClientsChip sx={{ ml: 1 }} />}
        </>
      )
    },
    {
      field: 'pricing',
      headerName: 'Pricing',
      width: 240,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {formatPricingSummary(params.row)}
        </Typography>
      )
    },
    {
      field: 'pricingMode',
      headerName: 'How Price Is Calculated',
      width: 220,
      valueGetter: (_value, row) => (row as any).pricingMode ?? 'SERVICE',
      valueFormatter: (value) => {
        if (value === 'PARAMETER') return 'Based on selected options';
        return 'Service price';
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 400,
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {(params.row as any).description ?? '—'}
        </Typography>
      )
    },
    {
      field: 'allowedConnections',
      headerName: 'Can Be Combined With',
      width: 320,
      renderCell: (params) => <ServiceList services={(params.row as any).allowedConnections} />
    },
    {
      field: 'parameters',
      headerName: 'Parameters',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(`/edit/services/${params.row.id}/parameters`)}
        >
          Configure ({(params.row as any).parameters?.length ?? 0})
        </Button>
      )
    },
    {
      field: 'deliverables',
      headerName: 'Deliverables',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const n = (params.row as any).deliverables?.length ?? 0;
        return (
          <Typography variant="body2" color="text.secondary">
            {n} item{n !== 1 ? 's' : ''} — edit service
          </Typography>
        );
      }
    }
  ];

  return (
    <>
      <Stack spacing={2}>
        {/* Download and upload moved to the Catalog Editor's workbook buttons (AdminEdit). */}
        {canSeeHidden && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ShowHiddenOperationsToggle showHidden={showHidden} setShowHidden={setShowHidden} />
          </Box>
        )}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          slots={{
            toolbar: GridToolBar as GridSlots['toolbar']
          }}
          slotProps={{
            toolbar: {
              canWrite,
              setRowModesModel,
              addButtonLabel: 'Add new service',
              onAdd: () => navigate('/edit/services/new'),
              showEditModeHint: false
            }
          }}
        />
      </Stack>
      <ConfirmDeleteDialog
        target={pendingDelete}
        noun='operation'
        detail='This removes the operation from the catalog, so it can no longer be added to jobs. Jobs that already use it keep it.'
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void handleDeletion(target.id);
        }}
      />
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity='error'
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
