import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Stack, TextField, Tooltip, Typography } from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModes,
  GridRowModesModel,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarFilterButton,
  type GridColumnVisibilityModel
} from '@mui/x-data-grid';
import { Cancel, Edit, Save } from '@mui/icons-material';

import { LIST_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT } from '../gql/queries';
import { SET_USER_KEYCLOAK_ACCESS_TIER, SET_USER_KEYCLOAK_CUSTOMER_CATEGORY, SET_USER_SHOW_BIOSECURITY, UPDATE_CUSTOMER_PROFILE } from '../gql/mutations';
import type { UpdateCustomerProfileInput } from '../gql/graphql';
import { ACCESS_TIER_HINTS, ACCESS_TIER_LABELS, ASSIGNABLE_ACCESS_TIERS } from '../constants/accessTiers';
import { UserContext } from '../contexts/UserContext';
import { formatGqlError } from '../utils/gqlError';
import {
  CUSTOMER_COLUMNS,
  ENUM_OPTIONS,
  PRICING_OPTIONS,
  RowSaveError,
  narrowSearchResults,
  readColumnVisibility,
  rowFromUser,
  saveRow,
  storeColumnVisibility,
  type CustomerRow,
  type CustomerUser
} from '../utils/customerManagement';
import { EditRowModeHint } from '../components/edit/EditRowModeHint';

const DEFAULT_LIST_CATEGORY = 'STAFF';

const LIST_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All users' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
  { value: 'EXTERNAL_CUSTOMER_DEFAULT', label: 'Default external (signup)' },
  { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External — academic' },
  { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External — market' },
  { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External — no salary' },
];

function Toolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
    </GridToolbarContainer>
  );
}

export default function CustomerManagement() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [listCategory, setListCategory] = useState<string>(DEFAULT_LIST_CATEGORY);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [columnVisibility, setColumnVisibility] = useState<GridColumnVisibilityModel>(() => readColumnVisibility());
  const [saveError, setSaveError] = useState<string | null>(null);
  /**
   * Set when a tier write succeeded but the realm had no group -> role mapping, so
   * the user gained nothing. Worth its own banner: everything else about the request
   * looked like success.
   */
  const [unmappedRoleUser, setUnmappedRoleUser] = useState<string | null>(null);
  /**
   * Fields a failed Save did manage to write, per row. The grid's "old row" is the
   * pre-edit one, so without this a retry would re-send the call that already
   * succeeded. Cleared on a full save, and on Cancel (with a refetch, so the row
   * shows what the server now holds).
   */
  const savedSoFar = useRef<Record<string, Partial<CustomerRow>>>({});

  const { userProps } = useContext(UserContext);
  const ownSubject = userProps?.subject;

  const [runSearch, { data, loading, error }] = useLazyQuery(SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, { fetchPolicy: 'network-only' });
  // No offset/limit: the server returns the whole category, so sort and filter span every user.
  const { data: listData, loading: listLoading, error: listError, refetch: refetchList } = useQuery(LIST_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, {
    variables: { category: listCategory },
    fetchPolicy: 'network-only'
  });

  const [setCategory] = useMutation(SET_USER_KEYCLOAK_CUSTOMER_CATEGORY);
  // A separate mutation from pricing: no request can carry the other axis's value.
  const [setAccessTier] = useMutation(SET_USER_KEYCLOAK_ACCESS_TIER);
  const [setShowBiosecurity] = useMutation(SET_USER_SHOW_BIOSECURITY);
  const [updateProfile] = useMutation(UPDATE_CUSTOMER_PROFILE);

  const isSearching = lastQuery.length >= 2;

  const onSearch = useCallback(() => {
    const q = searchInput.trim();
    if (q.length < 2) return;
    setLastQuery(q);
    void runSearch({ variables: { search: q, max: 200 } });
  }, [runSearch, searchInput]);

  const reload = useCallback(() => {
    if (lastQuery.length >= 2) void runSearch({ variables: { search: lastQuery, max: 200 } });
    else void refetchList();
  }, [lastQuery, runSearch, refetchList]);

  const onListCategoryChange = useCallback((event: SelectChangeEvent<string>) => {
    setListCategory(event.target.value);
    setLastQuery('');
  }, []);

  const rows: CustomerRow[] = useMemo(() => {
    const users = ((isSearching ? data?.searchKeycloakUsersForCustomerManagement : listData?.listKeycloakUsersForCustomerManagement?.items) ?? []) as CustomerUser[];
    // Search results come back unfiltered; the list is already the category.
    return (isSearching ? narrowSearchResults(users, listCategory) : users).map(rowFromUser);
  }, [isSearching, data, listData, listCategory]);

  const processRowUpdate = async (after: CustomerRow, original: CustomerRow): Promise<CustomerRow> => {
    setSaveError(null);
    setUnmappedRoleUser(null);
    const before = { ...original, ...savedSoFar.current[after.id] };
    try {
      const { accessRoleMapped } = await saveRow(before, after, {
        setCategory: (category) => setCategory({ variables: { userId: after.id, category } }),
        setTier: async (tier) => (await setAccessTier({ variables: { userId: after.id, tier } })).data?.setUserKeycloakAccessTier,
        setShowBiosecurity: (enabled) => setShowBiosecurity({ variables: { userId: after.id, enabled } }),
        updateProfile: (input) => updateProfile({ variables: { userId: after.id, input: input as UpdateCustomerProfileInput } })
      });
      // The group write can succeed and grant nothing, when the realm has no group -> role mapping.
      if (accessRoleMapped === false) setUnmappedRoleUser(after.name);
      delete savedSoFar.current[after.id];
      reload();
      return after;
    } catch (e) {
      if (e instanceof RowSaveError) {
        savedSoFar.current[after.id] = { ...savedSoFar.current[after.id], ...e.saved };
        // The tier write may have succeeded and granted nothing before a later call failed.
        if (e.accessRoleMapped === false) setUnmappedRoleUser(after.name);
      }
      throw e;
    }
  };

  const onProcessRowUpdateError = (e: unknown): void => {
    // The grid keeps the row in edit mode; show the server's own words (incl. the self-demotion refusal).
    setSaveError(formatGqlError(e instanceof RowSaveError ? e.failure : e));
  };

  const onRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) event.defaultMuiPrevented = true;
    // Escape discards the edit like Cancel does, so it must also drop a partial save's bookkeeping.
    if (params.reason === GridRowEditStopReasons.escapeKeyDown) discardSavedSoFar(params.id);
  };

  const discardSavedSoFar = (id: GridRowId): void => {
    if (savedSoFar.current[String(id)]) {
      delete savedSoFar.current[String(id)];
      reload();
    }
  };

  const startEdit = (id: GridRowId): void => setRowModesModel((m) => ({ ...m, [id]: { mode: GridRowModes.Edit } }));
  const save = (id: GridRowId): void => setRowModesModel((m) => ({ ...m, [id]: { mode: GridRowModes.View } }));
  const cancel = (id: GridRowId): void => {
    setRowModesModel((m) => ({ ...m, [id]: { mode: GridRowModes.View, ignoreModifications: true } }));
    discardSavedSoFar(id);
  };

  const labelOf = (options: { value: string; label: string }[], value: string): string => options.find((o) => o.value === value)?.label ?? '';

  const columns: GridColDef<CustomerRow>[] = useMemo(() => {
    const dataColumns = CUSTOMER_COLUMNS.map((spec): GridColDef<CustomerRow> => {
      const base = { field: spec.field, headerName: spec.headerName, minWidth: 140, flex: spec.kind === 'readonly' ? 1 : undefined };
      switch (spec.kind) {
        case 'readonly':
          return { ...base, editable: false };
        case 'text':
          return { ...base, type: 'string', editable: true };
        case 'boolean':
          return { ...base, type: 'boolean', editable: true, minWidth: 120 };
        case 'enum': {
          const options = [{ value: '', label: '—' }, ...ENUM_OPTIONS[spec.field as keyof typeof ENUM_OPTIONS]];
          return { ...base, type: 'singleSelect', editable: true, valueOptions: options, getOptionValue: (o: any) => o.value, getOptionLabel: (o: any) => o.label };
        }
        case 'pricing':
          return {
            ...base,
            minWidth: 220,
            type: 'singleSelect',
            editable: true,
            valueOptions: PRICING_OPTIONS,
            getOptionValue: (o: any) => o.value,
            getOptionLabel: (o: any) => o.label,
            renderCell: (p) => (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                <span>{p.row.pricingCategory ? labelOf(PRICING_OPTIONS, p.row.pricingCategory) : 'None'}</span>
                {p.row.isDefaultExternalCustomer && <Chip size="small" label="Default external" color="warning" variant="outlined" />}
              </Stack>
            )
          };
        case 'tier':
          return {
            ...base,
            minWidth: 180,
            type: 'singleSelect',
            editable: true,
            valueOptions: ASSIGNABLE_ACCESS_TIERS.map((t) => ({ value: t, label: ACCESS_TIER_LABELS[t] })),
            getOptionValue: (o: any) => o.value,
            getOptionLabel: (o: any) => o.label,
            renderCell: (p) => {
              // An administrator who lowers their own tier loses customers:manage and cannot undo it.
              const own = Boolean(ownSubject) && p.row.id === ownSubject;
              return (
                <Tooltip title={own ? 'You cannot change your own access tier — you would lose the permission needed to change it back.' : ACCESS_TIER_HINTS[p.row.accessTier] ?? ''}>
                  <span>{ACCESS_TIER_LABELS[p.row.accessTier] ?? p.row.accessTier}</span>
                </Tooltip>
              );
            }
          };
        default:
          return { ...base };
      }
    });
    const actions: GridColDef<CustomerRow> = {
      field: 'actions',
      type: 'actions',
      hideable: false, // Save and Cancel live here; hiding the column would strand an edit.
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) =>
        rowModesModel[id]?.mode === GridRowModes.Edit
          ? [
              <GridActionsCellItem key="save" icon={<Save />} label="Save" sx={{ color: 'primary.main' }} onClick={() => save(id)} />,
              <GridActionsCellItem key="cancel" icon={<Cancel />} label="Cancel" onClick={() => cancel(id)} color="inherit" />
            ]
          : [<GridActionsCellItem key="edit" icon={<Edit />} label="Edit" onClick={() => startEdit(id)} color="inherit" />]
    };
    // Actions first: with 23 columns, a trailing Save would sit off-screen.
    return [actions, ...dataColumns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowModesModel, ownSubject, reload]);

  const isBusy = loading || listLoading;
  const combinedError = error ?? listError;

  return (
    <Box sx={{ p: 3, maxWidth: 'none', mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Stack>

      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search Keycloak users by name, username, or email, then set either of two independent things: their{' '}
        <strong>pricing category</strong>, which decides what they are billed, and their <strong>access tier</strong>,
        which decides what they may do. Changing one never changes the other. Pricing changes apply in Keycloak
        immediately and existing jobs keep the category stored at submission time; <strong>access changes take effect
        at the user&rsquo;s next sign-in</strong>, because Keycloak does not invalidate tokens already issued.{' '}
        <strong>Biosecurity</strong> is separate again: shown for everyone until you turn it off. They see the
        change the next time they load the app.{' '}
        <strong>Can book without approval</strong> lets a client&rsquo;s equipment bookings skip the lab&rsquo;s
        approval; it applies to their next booking.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="list-category-label">Show users</InputLabel>
          <Select
            labelId="list-category-label"
            label="Show users"
            value={listCategory}
            onChange={onListCategoryChange}
          >
            {LIST_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Search users"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="At least 2 characters"
          size="small"
          sx={{ minWidth: 280 }}
        />
        <Button variant="contained" onClick={onSearch} disabled={searchInput.trim().length < 2 || isBusy}>
          Search
        </Button>
      </Stack>

      {combinedError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {combinedError.message}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}
      {unmappedRoleUser && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setUnmappedRoleUser(null)}>
          {unmappedRoleUser} was added to the access group, but the matching realm role is not on their account — so the
          change grants nothing. In Keycloak, open the group and add its realm role under <em>Role mapping</em>, then
          apply the tier again.
        </Alert>
      )}

      {!isBusy && isSearching && rows.length === 0 && !combinedError && <Typography color="text.secondary">No users found.</Typography>}

      <Stack spacing={1}>
        <EditRowModeHint />
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isBusy}
          autoHeight
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={setRowModesModel}
          onRowEditStop={onRowEditStop}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={onProcessRowUpdateError}
          isCellEditable={(p) => !(p.field === 'accessTier' && Boolean(ownSubject) && p.row.id === ownSubject)}
          columnVisibilityModel={columnVisibility}
          onColumnVisibilityModelChange={(model) => {
            setColumnVisibility(model);
            storeColumnVisibility(model);
          }}
          initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
          pageSizeOptions={[25, 50, 100]}
          slots={{ toolbar: Toolbar }}
          disableRowSelectionOnClick
        />
      </Stack>
    </Box>
  );
}
