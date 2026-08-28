import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { GET_ACTIVE_INVENTORY_ITEMS, GET_CATALOG_SERVICES } from '../gql/queries';
import { INVENTORY_TYPE_OPTIONS } from '../components/edit/InventoryDetailFields';

/**
 * The client-facing services catalog (despite the filename — the route is
 * `/services-catalog` and the matrix gives `catalog:view` to everyone).
 *
 * It used to read `AppContext.services` — the wide, shared `GET_SERVICES` — and
 * render all four pricing tiers plus a full parameter dialog to every authenticated
 * user. It now runs `catalogServices`, a reduced server-side view, and **builds its
 * columns from what the query actually returned**: a caller without
 * `internal-fields:read` gets `pricing: null` and `parameters: null`, so those
 * columns are not rendered at all.
 *
 * That last part is the point. A client-side `can()` check here would be
 * presentation; the server deciding what comes back is enforcement.
 *
 * Two tabs now: **Operations** (services) and **Inventory** (equipment and
 * consumables). Inventory runs `activeInventoryItems`, which is deliberately ungated
 * on the backend — its field resolvers already null out `serialNumber`,
 * `hasServiceContract`, `serviceContractExpiration` and every pricing tier the caller
 * is not in, so the same query is safe for a client and a technician alike. The
 * inventory columns follow the same rule as the service ones: derived from what came
 * back, not from a permission looked up here.
 */

function formatMoney(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `$${numeric.toFixed(2)}`;
}

type CatalogTab = 'operations' | 'inventory';

interface InventoryRow {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  location?: string | null;
  quantity?: number | null;
  bookable?: boolean | null;
  rateType?: string | null;
  pricing?: {
    internal?: number | null;
    externalAcademic?: number | null;
    externalMarket?: number | null;
    externalNoSalary?: number | null;
    external?: number | null;
    legacy?: number | null;
  } | null;
  modelNumber?: string | null;
  tags?: string[] | null;
}

/**
 * The rate that applies to this caller.
 *
 * The server has already nulled every tier they are not in, so the first non-null
 * value *is* their price — there is no tier precedence to reimplement here, and
 * `external`/`legacy` are the shared fallbacks every resolution chain ends at.
 */
function ownInventoryPrice(row: InventoryRow): number | null | undefined {
  const pricing = row.pricing;
  if (!pricing) return null;
  return pricing.internal ?? pricing.externalAcademic ?? pricing.externalMarket ?? pricing.externalNoSalary ?? pricing.external ?? pricing.legacy;
}

interface CatalogRow {
  id: string;
  name: string;
  description?: string | null;
  serviceCategoryName?: string | null;
  unit?: string | null;
  price?: number | null;
  pricingModeLabel?: string | null;
  parameterCount?: number | null;
  pricing?: {
    internal?: number | null;
    externalAcademic?: number | null;
    externalMarket?: number | null;
    externalNoSalary?: number | null;
  } | null;
  parameters?: unknown;
}

export default function AdminServicesCatalog() {
  const [tab, setTab] = useState<CatalogTab>('operations');
  const { data, loading, error } = useQuery(GET_CATALOG_SERVICES, { fetchPolicy: 'cache-and-network' });
  // Skipped until the tab is opened: most visitors only ever want the services list,
  // and this is a second full round trip.
  const {
    data: inventoryData,
    loading: inventoryLoading,
    error: inventoryError,
  } = useQuery(GET_ACTIVE_INVENTORY_ITEMS, { fetchPolicy: 'cache-and-network', skip: tab !== 'inventory' });
  const [selectedService, setSelectedService] = useState<CatalogRow | null>(null);

  const rows: CatalogRow[] = useMemo(() => data?.catalogServices ?? [], [data]);
  const inventoryRows: InventoryRow[] = useMemo(() => inventoryData?.activeInventoryItems ?? [], [inventoryData]);

  /**
   * Whether the server sent the full tier table. Derived from the response, not
   * from a permission the browser looked up: if the field is null for every row,
   * there is nothing to show a column for.
   */
  const showsAllTiers = rows.some((row) => !!row.pricing);
  const showsParameters = rows.some((row) => row.parameters != null);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Service', flex: 1, minWidth: 200 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 260 },
    { field: 'serviceCategoryName', headerName: 'Category', width: 180 },
    {
      field: 'price',
      headerName: 'Your price',
      width: 140,
      type: 'number',
      // One column, not four: the caller's own rate, resolved server-side from
      // their pricing group.
      valueFormatter: (value) => formatMoney(value),
    },
    { field: 'unit', headerName: 'Unit', width: 120 },
    { field: 'pricingModeLabel', headerName: 'How price is set', width: 190 },
    ...(showsAllTiers
      ? ([
          {
            field: 'pricingInternal',
            headerName: 'Internal',
            width: 120,
            type: 'number',
            valueGetter: (_value, row) => (row as CatalogRow).pricing?.internal,
            valueFormatter: (value) => formatMoney(value),
          },
          {
            field: 'pricingExternalAcademic',
            headerName: 'External (Academic)',
            width: 170,
            type: 'number',
            valueGetter: (_value, row) => (row as CatalogRow).pricing?.externalAcademic,
            valueFormatter: (value) => formatMoney(value),
          },
          {
            field: 'pricingExternalMarket',
            headerName: 'External (Market)',
            width: 160,
            type: 'number',
            valueGetter: (_value, row) => (row as CatalogRow).pricing?.externalMarket,
            valueFormatter: (value) => formatMoney(value),
          },
          {
            field: 'pricingExternalNoSalary',
            headerName: 'External (No Salary)',
            width: 180,
            type: 'number',
            valueGetter: (_value, row) => (row as CatalogRow).pricing?.externalNoSalary,
            valueFormatter: (value) => formatMoney(value),
          },
        ] as GridColDef[])
      : []),
    {
      field: 'parameterCount',
      headerName: 'Parameters',
      width: 160,
      sortable: false,
      // The count is a shape fact, not a price, so everyone sees it. The dialog
      // behind it opens only when the server actually sent the definitions —
      // those carry per-parameter prices.
      renderCell: (params) => {
        const count = (params.row as CatalogRow).parameterCount ?? 0;
        const label = `${count} param${count === 1 ? '' : 's'}`;
        return showsParameters ? (
          <Chip size="small" label={label} variant="outlined" onClick={() => setSelectedService(params.row as CatalogRow)} />
        ) : (
          <Chip size="small" label={label} variant="outlined" />
        );
      },
    },
  ];

  /**
   * Same rule as the service columns: derived from the response. A caller without
   * `internal-fields:read` gets `pricing: null` on every row, so there is nothing to
   * put in a price column and it is not rendered.
   */
  const inventoryShowsPricing = inventoryRows.some((row) => ownInventoryPrice(row) != null);

  const inventoryColumns: GridColDef[] = [
    { field: 'name', headerName: 'Item', flex: 1, minWidth: 200 },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      // Reuses the editor's option list rather than a second label map, so a
      // client-facing page cannot end up calling a type something else.
      valueFormatter: (value: unknown) => INVENTORY_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? String(value ?? '—'),
    },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 240 },
    { field: 'location', headerName: 'Location', width: 160 },
    { field: 'quantity', headerName: 'Qty', width: 90, type: 'number' },
    {
      field: 'bookable',
      headerName: 'Bookable',
      width: 120,
      renderCell: (params) => (params.value ? <Chip size="small" color="success" variant="outlined" label="Yes" /> : <Chip size="small" variant="outlined" label="No" />),
    },
    ...(inventoryShowsPricing
      ? ([
          {
            field: 'ownPrice',
            headerName: 'Your rate',
            width: 130,
            valueGetter: (_value: unknown, row: InventoryRow) => ownInventoryPrice(row),
            renderCell: (params) => formatMoney(params.value),
          },
          { field: 'rateType', headerName: 'Charged', width: 130 },
        ] as GridColDef[])
      : []),
  ];

  const parameters = Array.isArray(selectedService?.parameters) ? (selectedService!.parameters as any[]) : [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4" gutterBottom>
        Catalog
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        {tab === 'operations'
          ? showsAllTiers
            ? 'DAMPLab services and their parameters. Prices are shown across the four customer categories, and "Your price" is the rate that applies to you.'
            : 'DAMPLab services. "Your price" is the rate that applies to your account.'
          : 'Equipment and consumables held by the lab. "Your rate" is what applies to your account; book time or quantity from Book Inventory.'}
      </Typography>

      <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Operations" value="operations" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }} />
        <Tab label="Inventory" value="inventory" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }} />
      </Tabs>

      {tab === 'operations' && error && <Alert severity="error">Could not load the catalog: {error.message}</Alert>}
      {tab === 'inventory' && inventoryError && <Alert severity="error">Could not load inventory: {inventoryError.message}</Alert>}

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            {tab === 'operations' ? (
              loading && rows.length === 0 ? (
                <CircularProgress />
              ) : (
                <DataGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                />
              )
            ) : inventoryLoading && inventoryRows.length === 0 ? (
              <CircularProgress />
            ) : (
              <DataGrid
                rows={inventoryRows}
                columns={inventoryColumns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!selectedService} onClose={() => setSelectedService(null)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedService?.name || 'Service parameters'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip size="small" variant="outlined" label={`Internal: ${formatMoney(selectedService?.pricing?.internal)}`} />
            <Chip size="small" variant="outlined" label={`External (Academic): ${formatMoney(selectedService?.pricing?.externalAcademic)}`} />
            <Chip size="small" variant="outlined" label={`External (Market): ${formatMoney(selectedService?.pricing?.externalMarket)}`} />
            <Chip size="small" variant="outlined" label={`External (No Salary): ${formatMoney(selectedService?.pricing?.externalNoSalary)}`} />
          </Box>

          {parameters.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No parameters are defined for this service.
            </Typography>
          ) : (
            <List dense>
              {parameters.map((p: any) => (
                <ListItem key={p.id || p.name}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{p.name}</Typography>
                        {p.required && <Chip label="Required" size="small" color="primary" />}
                        {typeof p.price === 'number' && (
                          <Chip label={`Param price: $${p.price.toFixed(2)}`} size="small" color="secondary" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={p.description || p.type}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
