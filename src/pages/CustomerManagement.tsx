import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useLazyQuery, useMutation } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import { SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT } from '../gql/queries';
import { SET_USER_KEYCLOAK_CUSTOMER_CATEGORY } from '../gql/mutations';

const MAX_RESULTS = 25;

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None (clear category groups)' },
  { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
  { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External — academic' },
  { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External — market' },
  { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External — no salary' },
];

type SearchRow = {
  id: string;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  customerCategory?: string | null;
};

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
  const [pendingByUser, setPendingByUser] = useState<Record<string, string>>({});

  const [runSearch, { data, loading, error }] = useLazyQuery(SEARCH_KEYCLOAK_USERS_FOR_CUSTOMER_MANAGEMENT, {
    fetchPolicy: 'network-only',
  });

  const [setCategory, { loading: saving, error: saveError, reset: resetSaveError }] = useMutation(
    SET_USER_KEYCLOAK_CUSTOMER_CATEGORY
  );

  const rows: SearchRow[] = useMemo(
    () => (data?.searchKeycloakUsersForCustomerManagement ?? []) as SearchRow[],
    [data?.searchKeycloakUsersForCustomerManagement]
  );

  const onSearch = useCallback(() => {
    const q = searchInput.trim();
    if (q.length < 2) return;
    setLastQuery(q);
    void runSearch({ variables: { search: q, max: MAX_RESULTS } });
  }, [runSearch, searchInput]);

  const refetchLast = useCallback(() => {
    if (lastQuery.length >= 2) {
      void runSearch({ variables: { search: lastQuery, max: MAX_RESULTS } });
    }
  }, [lastQuery, runSearch]);

  const onSelectChange = useCallback((userId: string, event: SelectChangeEvent<string>) => {
    setPendingByUser((prev) => ({ ...prev, [userId]: event.target.value }));
  }, []);

  const onApply = useCallback(
    async (userId: string, row: SearchRow) => {
      resetSaveError();
      const chosen = pendingByUser[userId] ?? normCategory(row.customerCategory);
      try {
        await setCategory({
          variables: {
            userId,
            category: chosen === '' ? null : chosen,
          },
        });
        setPendingByUser((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        refetchLast();
      } catch {
        /* Apollo surfaces error in saveError */
      }
    },
    [pendingByUser, refetchLast, resetSaveError, setCategory]
  );

  const isDirty = (row: SearchRow) => {
    const chosen = pendingByUser[row.id] ?? normCategory(row.customerCategory);
    return chosen !== normCategory(row.customerCategory);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Stack>

      <Typography variant="h4" gutterBottom>
        Customer management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search Keycloak users by name, username, or email. Assign a pricing customer category (Keycloak groups) or clear
        all pricing groups for that user. Changes apply in Keycloak immediately; existing jobs keep the category stored at
        submission time.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField
          label="Search users"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="At least 2 characters"
          size="small"
          sx={{ minWidth: 280 }}
        />
        <Button variant="contained" onClick={onSearch} disabled={searchInput.trim().length < 2 || loading}>
          Search
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => resetSaveError()}>
          {saveError.message}
        </Alert>
      )}

      {!loading && lastQuery && rows.length === 0 && !error && (
        <Typography color="text.secondary">No users found.</Typography>
      )}

      {rows.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Update</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const selectValue = pendingByUser[row.id] ?? normCategory(row.customerCategory);
              return (
                <TableRow key={row.id}>
                  <TableCell>{displayName(row)}</TableCell>
                  <TableCell>{row.username ?? '—'}</TableCell>
                  <TableCell>{row.email ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <FormControl size="small" fullWidth>
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
      )}
    </Box>
  );
}
