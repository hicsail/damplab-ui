import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { LIST_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT } from '../gql/queries';
import { SET_USER_KEYCLOAK_ACCESS_TIER, SET_USER_KEYCLOAK_CUSTOMER_CATEGORY } from '../gql/mutations';
import { ACCESS_TIERS, ACCESS_TIER_HINTS, ACCESS_TIER_LABELS, ASSIGNABLE_ACCESS_TIERS } from '../constants/accessTiers';
import { UserContext } from '../contexts/UserContext';

const MAX_RESULTS = 25;

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

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None (clear category groups)' },
  { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
  { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External — academic' },
  { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External — market' },
  { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External — no salary' },
];

/**
 * The access tiers the STAFF list filter covers.
 *
 * The server is the source of truth here: the list query resolves STAFF from
 * `KEYCLOAK_LAB_STAFF_GROUP_NAMES` (default `damplab-staff,technician`). This copy
 * only narrows *search* results, which the server returns unfiltered. If that env var
 * is ever changed, change this too or the two halves of the filter disagree.
 */
const STAFF_TIERS: readonly string[] = [ACCESS_TIERS.Administrator, ACCESS_TIERS.Technician];

type SearchRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  customerCategory?: string | null;
  isDefaultExternalCustomer?: boolean | null;
  accessTier?: string | null;
};

function normTier(t: string | null | undefined): string {
  return t ?? ACCESS_TIERS.Client;
}

function displayName(row: SearchRow): string {
  const parts = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return parts || row.username || row.email || row.id;
}

function normCategory(c: string | null | undefined): string {
  return c ?? '';
}

export default function CustomerManagement() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [listCategory, setListCategory] = useState<string>(DEFAULT_LIST_CATEGORY);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pendingByUser, setPendingByUser] = useState<Record<string, string>>({});
  const [pendingTierByUser, setPendingTierByUser] = useState<Record<string, string>>({});
  /**
   * Set when a tier write succeeded but the realm had no group -> role mapping, so
   * the user gained nothing. Worth its own banner: everything else about the request
   * looked like success.
   */
  const [unmappedRoleUser, setUnmappedRoleUser] = useState<string | null>(null);

  const { userProps } = useContext(UserContext);
  const ownSubject = userProps?.subject;

  const [runSearch, { data, loading, error }] = useLazyQuery(SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, {
    fetchPolicy: 'network-only',
  });

  const {
    data: listData,
    loading: listLoading,
    error: listError,
  } = useQuery(LIST_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, {
    variables: {
      category: listCategory,
      offset: page * rowsPerPage,
      limit: rowsPerPage,
    },
    fetchPolicy: 'network-only',
  });

  const [setCategory, { loading: savingCategory, error: categoryError, reset: resetCategoryError }] = useMutation(
    SET_USER_KEYCLOAK_CUSTOMER_CATEGORY
  );

  // A second mutation rather than one combined "update user" call. Pricing and access
  // are independent axes; two mutations mean no request can carry the other's value.
  const [setAccessTier, { loading: savingTier, error: tierError, reset: resetTierError }] = useMutation(
    SET_USER_KEYCLOAK_ACCESS_TIER
  );

  const saving = savingCategory || savingTier;
  const saveError = categoryError ?? tierError;
  const resetSaveError = useCallback(() => {
    resetCategoryError();
    resetTierError();
  }, [resetCategoryError, resetTierError]);

  const rows: SearchRow[] = useMemo(
    () => (data?.searchKeycloakUsersForCustomerManagement ?? []) as SearchRow[],
    [data?.searchKeycloakUsersForCustomerManagement]
  );

  const listRows: SearchRow[] = useMemo(
    () => (listData?.listKeycloakUsersForCustomerManagement?.items ?? []) as SearchRow[],
    [listData?.listKeycloakUsersForCustomerManagement?.items]
  );

  const hasNextPage: boolean = Boolean(listData?.listKeycloakUsersForCustomerManagement?.hasNextPage);

  const onSearch = useCallback(() => {
    const q = searchInput.trim();
    if (q.length < 2) return;
    setLastQuery(q);
    setPage(0);
    void runSearch({ variables: { search: q, max: Math.max(MAX_RESULTS, 200) } });
  }, [runSearch, searchInput]);

  const refetchLast = useCallback(() => {
    if (lastQuery.length >= 2) {
      void runSearch({ variables: { search: lastQuery, max: Math.max(MAX_RESULTS, 200) } });
    }
  }, [lastQuery, runSearch]);

  const onSelectChange = useCallback((userId: string, event: SelectChangeEvent<string>) => {
    setPendingByUser((prev) => ({ ...prev, [userId]: event.target.value }));
  }, []);

  const onTierChange = useCallback((userId: string, event: SelectChangeEvent<string>) => {
    setPendingTierByUser((prev) => ({ ...prev, [userId]: event.target.value }));
  }, []);

  const onListCategoryChange = useCallback((event: SelectChangeEvent<string>) => {
    setListCategory(event.target.value);
    setPage(0);
    setLastQuery('');
  }, []);

  const initialSelectValue = (row: SearchRow): string => {
    if (row.isDefaultExternalCustomer) return '';
    return normCategory(row.customerCategory);
  };

  const isCategoryDirty = (row: SearchRow) => (pendingByUser[row.id] ?? initialSelectValue(row)) !== initialSelectValue(row);
  const isTierDirty = (row: SearchRow) => (pendingTierByUser[row.id] ?? normTier(row.accessTier)) !== normTier(row.accessTier);
  const isDirty = (row: SearchRow) => isCategoryDirty(row) || isTierDirty(row);

  /**
   * Apply whichever of the two axes the admin actually changed.
   *
   * Each is skipped when clean, so pressing Apply after touching only the pricing
   * select never issues a tier write — which matters because a tier write rewrites
   * group membership, and the safest write is the one that does not happen.
   */
  const onApply = useCallback(
    async (userId: string, row: SearchRow) => {
      resetSaveError();
      setUnmappedRoleUser(null);
      const chosenCategory = pendingByUser[userId] ?? initialSelectValue(row);
      const chosenTier = pendingTierByUser[userId] ?? normTier(row.accessTier);
      try {
        if (isCategoryDirty(row)) {
          await setCategory({ variables: { userId, category: chosenCategory === '' ? null : chosenCategory } });
        }
        if (isTierDirty(row)) {
          const result = await setAccessTier({ variables: { userId, tier: chosenTier } });
          // The group write can succeed and grant nothing, when the realm has no
          // group -> role mapping. The server reads the roles back and tells us.
          if (result.data?.setUserKeycloakAccessTier?.accessRoleMapped === false) {
            setUnmappedRoleUser(displayName(row));
          }
        }
        setPendingByUser((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setPendingTierByUser((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        refetchLast();
      } catch {
        /* Apollo surfaces error in saveError */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingByUser, pendingTierByUser, refetchLast, resetSaveError, setCategory, setAccessTier]
  );

  const isSearching = lastQuery.length >= 2;

  const filteredRows: SearchRow[] = useMemo(() => {
    const base = isSearching ? rows : listRows;
    if (!isSearching) return base;
    if (listCategory === 'ALL') return base;
    // The STAFF filter used to be ignored while searching, because the row carried no
    // role information to filter on. It carries `accessTier` now, so a search with
    // STAFF selected finally means what it says.
    if (listCategory === DEFAULT_LIST_CATEGORY) return base.filter((r) => STAFF_TIERS.includes(normTier(r.accessTier)));
    if (listCategory === 'EXTERNAL_CUSTOMER_DEFAULT') {
      return base.filter((r) => r.isDefaultExternalCustomer === true);
    }
    return base.filter(
      (r) => normCategory(r.customerCategory) === listCategory && !r.isDefaultExternalCustomer
    );
  }, [isSearching, listCategory, listRows, rows]);

  const pagedRows: SearchRow[] = useMemo(() => {
    if (!isSearching) return filteredRows;
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, isSearching, page, rowsPerPage]);

  const isBusy = loading || listLoading;
  const combinedError = error ?? listError;

  const canGoPrev = page > 0;
  const canGoNext = isSearching
    ? (page + 1) * rowsPerPage < filteredRows.length
    : hasNextPage;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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
        at the user&rsquo;s next sign-in</strong>, because Keycloak does not invalidate tokens already issued.
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => resetSaveError()}>
          {saveError.message}
        </Alert>
      )}
      {unmappedRoleUser && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setUnmappedRoleUser(null)}>
          {unmappedRoleUser} was added to the access group, but the matching realm role is not on their account — so the
          change grants nothing. In Keycloak, open the group and add its realm role under <em>Role mapping</em>, then
          apply the tier again.
        </Alert>
      )}

      {!isBusy && isSearching && filteredRows.length === 0 && !combinedError && (
        <Typography color="text.secondary">No users found.</Typography>
      )}

      {filteredRows.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Pricing category</TableCell>
                <TableCell>Access tier</TableCell>
                <TableCell align="right">Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((row) => {
                const selectValue = pendingByUser[row.id] ?? initialSelectValue(row);
                const tierValue = pendingTierByUser[row.id] ?? normTier(row.accessTier);
                const isOwnRow = Boolean(ownSubject) && row.id === ownSubject;
                return (
                  <TableRow key={row.id}>
                    <TableCell>{displayName(row)}</TableCell>
                    <TableCell>{row.username ?? '—'}</TableCell>
                    <TableCell>{row.email ?? '—'}</TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel id={`cat-label-${row.id}`}>Pricing category</InputLabel>
                          <Select
                            labelId={`cat-label-${row.id}`}
                            label="Pricing category"
                            value={selectValue}
                            onChange={(e) => onSelectChange(row.id, e)}
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value || 'none'} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {row.isDefaultExternalCustomer && (
                          <Chip size="small" label="Default external" color="warning" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      {/* An administrator who lowers their own tier loses
                          customers:manage in the same stroke and cannot undo it. The
                          server refuses this too; disabling here just explains why. */}
                      <Tooltip title={isOwnRow ? 'You cannot change your own access tier — you would lose the permission needed to change it back.' : ''}>
                        <span>
                          <FormControl size="small" fullWidth disabled={isOwnRow}>
                            <InputLabel id={`tier-label-${row.id}`}>Access tier</InputLabel>
                            <Select
                              labelId={`tier-label-${row.id}`}
                              label="Access tier"
                              value={tierValue}
                              onChange={(e) => onTierChange(row.id, e)}
                            >
                              {ASSIGNABLE_ACCESS_TIERS.map((tier) => (
                                <MenuItem key={tier} value={tier}>
                                  {ACCESS_TIER_LABELS[tier]}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </span>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {ACCESS_TIER_HINTS[tierValue]}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!isDirty(row) || saving}
                        onClick={() => void onApply(row.id, row)}
                      >
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredRows.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center" justifyContent="flex-end">
          <Typography variant="body2" color="text.secondary">
            Page {page + 1}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="rows-per-page-label">Rows</InputLabel>
            <Select
              labelId="rows-per-page-label"
              label="Rows"
              value={String(rowsPerPage)}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 25, 50].map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" disabled={!canGoPrev || isBusy} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
            Previous
          </Button>
          <Button variant="outlined" disabled={!canGoNext || isBusy} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </Stack>
      )}
    </Box>
  );
}
