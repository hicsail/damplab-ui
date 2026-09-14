import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { format } from 'date-fns';
import { GET_BILLABLE_BOOKINGS, GET_BILLABLE_OWNERS } from '../gql/queries';
import { GENERATE_USAGE_BILLING } from '../gql/mutations';

function usageDetail(b: any): string {
  if (b.kind === 'TIMED') {
    const hrs = b.actualHours ?? (b.startTime && b.endTime ? (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000 : 0);
    const h = Math.round(hrs * 100) / 100;
    return b.rateSnapshot != null ? `${h} hr${h === 1 ? '' : 's'} @ $${b.rateSnapshot.toFixed(2)}/hr` : `${h} hrs`;
  }
  const q = b.actualQuantity ?? b.quantity ?? 0;
  return b.rateSnapshot != null ? `${q} unit${q === 1 ? '' : 's'} @ $${b.rateSnapshot.toFixed(2)}/unit` : `${q} units`;
}

export default function UsageBilling() {
  const { data: ownersData, loading: ownersLoading, refetch: refetchOwners } = useQuery(GET_BILLABLE_OWNERS, { fetchPolicy: 'cache-and-network' });
  const [ownerSub, setOwnerSub] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ sow: any; invoice: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useQuery(GET_BILLABLE_BOOKINGS, {
    variables: { ownerSub },
    skip: !ownerSub,
    fetchPolicy: 'cache-and-network'
  });

  const [generate, { loading: generating }] = useMutation(GENERATE_USAGE_BILLING);

  const owners: any[] = ownersData?.billableOwners ?? [];
  const bookings: any[] = bookingsData?.billableBookings ?? [];
  const selectedOwner = owners.find((o) => o.ownerSub === ownerSub);

  const selectedTotal = useMemo(
    () => bookings.filter((b) => selected.has(b._id)).reduce((sum, b) => sum + (b.cost ?? 0), 0),
    [bookings, selected]
  );

  const pickOwner = (sub: string) => {
    setOwnerSub(sub);
    setSelected(new Set());
    setResult(null);
    setError(null);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /**
   * Select-all covers only what can actually be billed.
   *
   * A booking with no `rateSnapshot` has no cost, and the server refuses to bill it
   * rather than charging $0 — so including it here would tick a box that guarantees
   * the Generate button fails.
   */
  const billable = useMemo(() => bookings.filter((b: any) => b.rateSnapshot != null), [bookings]);
  const billableCount = billable.length;

  const toggleAll = () => {
    setSelected((prev) => (prev.size === billableCount ? new Set() : new Set(billable.map((b: any) => b._id))));
  };

  const handleGenerate = async () => {
    if (!ownerSub || selected.size === 0) return;
    setError(null);
    try {
      const res = await generate({ variables: { input: { ownerSub, bookingIds: Array.from(selected) } } });
      setResult(res.data?.generateUsageBilling ?? null);
      setSelected(new Set());
      await Promise.all([refetchBookings(), refetchOwners()]);
    } catch (e: any) {
      setError(e?.graphQLErrors?.[0]?.message || e?.message || 'Could not generate billing.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <ReceiptLongIcon color="primary" />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Billing</Typography>
          <Typography variant="body2" color="text.secondary">
            Pick a user, select their confirmed inventory usage, and generate a SOW + invoice. Only confirmed, unbilled usage appears here.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Generated <strong>{result.sow?.sowNumber}</strong> and invoice <strong>{result.invoice?.invoiceNumber}</strong> — total ${Number(result.invoice?.totalCost ?? 0).toFixed(2)}.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* Owners with billable usage */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Users with usage</Typography>
            {ownersLoading && !ownersData ? (
              <CircularProgress size={22} />
            ) : owners.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No confirmed, unbilled usage.</Typography>
            ) : (
              <List dense disablePadding>
                {owners.map((o) => (
                  <ListItemButton key={o.ownerSub} selected={o.ownerSub === ownerSub} onClick={() => pickOwner(o.ownerSub)}>
                    <ListItemText primary={o.ownerName || o.ownerEmail} secondary={`${o.bookingCount} item(s) · $${Number(o.totalCost).toFixed(2)}`} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Selected owner's billable usage */}
        <Card variant="outlined">
          <CardContent>
            {!ownerSub ? (
              <Typography variant="body2" color="text.secondary">Select a user to see their billable usage.</Typography>
            ) : (
              <>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {selectedOwner?.ownerName || selectedOwner?.ownerEmail}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Chip label={`Selected: $${selectedTotal.toFixed(2)}`} color="primary" variant="outlined" />
                  <Button variant="contained" disabled={selected.size === 0 || generating} onClick={handleGenerate}>
                    {generating ? 'Generating…' : `Generate SOW + invoice (${selected.size})`}
                  </Button>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                {bookingsLoading && !bookingsData ? (
                  <CircularProgress size={22} />
                ) : bookings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No unbilled usage for this user.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox checked={billableCount > 0 && selected.size === billableCount} indeterminate={selected.size > 0 && selected.size < billableCount} onChange={toggleAll} />
                        </TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Usage</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((b) => {
                        // No rate was resolved when this was booked — its owner was
                        // in no pricing group. The server refuses to bill it rather
                        // than charging $0, so say so here instead of letting staff
                        // tick it and meet the refusal at Generate.
                        const unrated = b.rateSnapshot == null;
                        return (
                          <TableRow key={b._id} hover selected={selected.has(b._id)}>
                            <TableCell padding="checkbox">
                              <Tooltip title={unrated ? 'This booking has no rate and cannot be billed.' : ''} disableHoverListener={!unrated}>
                                <span>
                                  <Checkbox checked={selected.has(b._id)} disabled={unrated} onChange={() => toggle(b._id)} />
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{b.inventoryName}</TableCell>
                            <TableCell>{usageDetail(b)}</TableCell>
                            <TableCell>{(b.usedOn || b.startTime) ? format(new Date(b.usedOn || b.startTime), 'MMM d, yyyy') : '—'}</TableCell>
                            <TableCell align="right">
                              {unrated ? (
                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                                  No rate — owner has no pricing group
                                </Typography>
                              ) : b.cost != null ? (
                                `$${Number(b.cost).toFixed(2)}`
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
