import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import { GET_JOB_EQUIPMENT_BOOKING } from '../../gql/queries';
import { CANCEL_BOOKING, SET_JOB_BOOKING_BLOCK } from '../../gql/mutations';
import { blockedMessage, bookedHours, LOCKED_MESSAGES } from '../../utils/jobEquipmentBooking';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import { chipStatusBackground } from '../../utils/technicianProcessStatus';
import ProcessCard from '../technician/ProcessCard';
import StatusPaneHeader from '../technician/StatusPaneHeader';
import ReasonDialog from '../ReasonDialog';

interface Props {
  jobId: string;
  /** Staff pages render read-only, plus the pause switch when the caller may pause. */
  staffView?: boolean;
}

const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'info'> = {
  RESERVED: 'warning',
  IN_USE: 'warning',
  COMPLETED: 'success'
};

/**
 * The job page's equipment-booking card: the same shape as the Job, SOW and
 * Invoices cards — party rail, status pane, actions, details — listing the
 * bookings already in place. Booking itself happens on the Book inventory page,
 * which the customer's action button opens on this job.
 *
 * Every gate has a server-side twin — `jobEquipmentBooking` returns HIDDEN and no
 * data to a caller who is not on the job, and the mutations re-check.
 */
export default function JobEquipmentBookingPanel({ jobId, staffView = false }: Props): React.JSX.Element | null {
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_JOB_EQUIPMENT_BOOKING, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network'
  });
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [setBlock] = useMutation(SET_JOB_BOOKING_BLOCK);

  const view = data?.jobEquipmentBooking;
  const access = view?.access;
  const operations: any[] = view?.operations ?? [];
  const bookings: any[] = [...(view?.bookings ?? [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (!jobId) return null;
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error && !view) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Equipment Booking
          </Typography>
          <Alert severity="error">{formatGqlError(error, 'Could not load equipment booking.')}</Alert>
        </CardContent>
      </Card>
    );
  }
  // HIDDEN renders nothing at all — not an empty card, not a "no access" notice.
  if (!access || access.status === 'HIDDEN') return null;

  const open = access.status === 'OPEN';
  const paused = access.status === 'BLOCKED';
  const locked =
    access.status === 'SOW_NOT_SIGNED'
      ? LOCKED_MESSAGES.SOW_NOT_SIGNED
      : access.status === 'NOT_ELIGIBLE'
        ? LOCKED_MESSAGES.NOT_ELIGIBLE
        : paused
          ? blockedMessage(access.reason)
          : null;
  const hours = bookedHours(bookings);
  const upcoming = bookings.find((b) => new Date(b.endTime).getTime() > Date.now());
  const operationLabel = (b: any): string => operations.find((op) => op.nodeId === b.nodeId)?.label ?? '';
  const mayCancel = (b: any): boolean => !staffView && b.billingStatus !== 'BILLED' && !!operations.find((op) => op.nodeId === b.nodeId)?.canBook;

  const doCancel = async (id: string): Promise<void> => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await refetch();
    } catch (error) {
      setActionError(formatSaveError(error, 'this cancellation'));
    }
  };

  const status = bookings.length === 0 ? 'No bookings yet' : `${bookings.length} booking${bookings.length === 1 ? '' : 's'} · ${hours} hrs`;
  const description = locked
    ? locked
    : upcoming
      ? `Next: ${upcoming.notes || upcoming.inventoryName} · ${format(new Date(upcoming.startTime), 'MMM d, h:mm a')}`
      : bookings.length === 0
        ? 'Time booked against this job is billed to it at the operation’s rate.'
        : 'No upcoming bookings.';

  const actions = staffView ? (
    access.canBlock ? (
      <FormControlLabel
        sx={{ ml: 0 }}
        control={
          <Switch
            size="small"
            checked={paused}
            onChange={async (e) => {
              if (e.target.checked) {
                setPausing(true);
                return;
              }
              try {
                await setBlock({ variables: { jobId, blocked: false, reason: null } });
                await refetch();
              } catch (error) {
                setActionError(formatSaveError(error, 'this change'));
              }
            }}
          />
        }
        label={paused ? 'Booking paused' : 'Pause booking'}
      />
    ) : undefined
  ) : (
    <Button
      variant="contained"
      size="small"
      startIcon={<EventAvailableIcon />}
      disabled={!open || !access.canBook}
      onClick={() => navigate(`/book-inventory?job=${encodeURIComponent(jobId)}`)}
      sx={railBtnSx}
    >
      Book Time
    </Button>
  );

  return (
    <>
      <ProcessCard
        title="Equipment Booking"
        defaultExpanded={bookings.length > 0}
        customerBadge={bookings.length > 0 ? 'check' : null}
        staffBadge={paused ? 'paper' : open ? 'check' : null}
        customerVersion={`${hours} hrs booked`}
        staffVersion={paused ? 'Paused' : open ? 'Bookable' : 'Not open'}
        statusPaneSx={{ bgcolor: chipStatusBackground(paused ? 'warning' : open && bookings.length > 0 ? 'success' : 'default') }}
        statusPane={
          <StatusPaneHeader
            status={status}
            chips={paused ? <Chip size="small" label="Paused" color="warning" /> : open ? <Chip size="small" label="Bookable" color="success" variant="outlined" /> : undefined}
            description={description}
          >
            {actionError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            )}
          </StatusPaneHeader>
        }
        actions={actions}
        details={
          bookings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {open ? 'Nothing booked yet. Use Book Time to reserve equipment on this job.' : 'Nothing booked on this job.'}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {bookings.map((b) => (
                <Card key={b._id} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }} noWrap title={b.notes || b.inventoryName}>
                          {b.notes || b.inventoryName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {b.inventoryName}
                          {operationLabel(b) ? ` · ${operationLabel(b)}` : ''}
                          {b.createdByName ? ` · booked by ${b.createdByName}` : ''}
                        </Typography>
                      </Box>
                      <Chip size="small" label={b.usageConfirmed ? 'Confirmed' : b.status} color={b.usageConfirmed ? 'success' : (STATUS_COLOR[b.status] ?? 'default')} />
                      {b.billingStatus === 'BILLED' && <Chip size="small" label="Billed" color="info" variant="outlined" />}
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {b.startTime ? format(new Date(b.startTime), 'MMM d, h:mm a') : ''} – {b.endTime ? format(new Date(b.endTime), 'MMM d, h:mm a') : ''}
                      </Typography>
                      {b.cost != null && <Typography variant="body2">${Number(b.cost).toFixed(2)}</Typography>}
                      {mayCancel(b) && (
                        <Tooltip title="Cancel booking">
                          <IconButton size="small" color="error" onClick={() => doCancel(b._id)}>
                            <CloseIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )
        }
      />

      <ReasonDialog
        open={pausing}
        title="Pause equipment booking"
        warning="No new bookings can be made or moved on this job until you resume. Existing bookings are left alone."
        fieldLabel="Reason (the client sees this)"
        confirmLabel="Pause booking"
        onCancel={() => setPausing(false)}
        onConfirm={async (reason) => {
          try {
            await setBlock({ variables: { jobId, blocked: true, reason } });
            setPausing(false);
            await refetch();
          } catch (error) {
            setPausing(false);
            setActionError(formatSaveError(error, 'this change'));
          }
        }}
      />
    </>
  );
}
