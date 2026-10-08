import React, { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, FormControlLabel, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';
import { GET_JOB_BALANCE, GET_JOB_EQUIPMENT_BOOKING, GET_JOB_PAYMENTS } from '../../gql/queries';
import { APPROVE_BOOKING, CANCEL_BOOKING, CONFIRM_BOOKING_USAGE, DECLINE_BOOKING, SET_JOB_BOOKING_BLOCK } from '../../gql/mutations';
import {
  awaitingApproval,
  blockedMessage,
  bookedHours,
  bookingHistoryLines,
  bookingStatusColor,
  bookingStatusLabel,
  confirmedUsageLabel,
  declinedReason,
  isBookingOver,
  lastApproval,
  LOCKED_MESSAGES
} from '../../utils/jobEquipmentBooking';
import { confirmedUsageSuffix } from '../../utils/equipmentBilling';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import { chipStatusBackground } from '../../utils/technicianProcessStatus';
import ProcessCard from '../technician/ProcessCard';
import StatusPaneHeader from '../technician/StatusPaneHeader';
import ReasonDialog from '../ReasonDialog';
import ConfirmUsageDialog from './ConfirmUsageDialog';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';

interface Props {
  jobId: string;
  /** Staff pages render read-only, plus the pause switch when the caller may pause. */
  staffView?: boolean;
}

const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

const ACTION_LABEL: Record<string, string> = {
  CREATED: 'Booked',
  UPDATED: 'Changed',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  USAGE_CONFIRMED: 'Usage confirmed',
  CANCELLED: 'Cancelled'
};

const slot = (start?: string | null, end?: string | null): string =>
  `${start ? format(new Date(start), 'MMM d, h:mm a') : ''} – ${end ? format(new Date(end), 'MMM d, h:mm a') : ''}`;

/** One booking's audit trail, oldest first; the job page is the only place it is shown. */
function BookingHistory({ entries }: { entries: any[] }): React.JSX.Element {
  return (
    <Stack spacing={0.75} sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
      {entries.map((h, i) => (
        <Box key={i}>
          <Typography variant="caption" sx={{ display: 'block' }}>
            <b>{ACTION_LABEL[h.action] ?? h.action}</b> · {h.at ? format(new Date(h.at), 'MMM d, yyyy h:mm a') : ''}
            {h.byName ? ` · ${h.byName}` : ''}
          </Typography>
          {h.action === 'UPDATED' && (h.previousStartTime || h.previousEndTime) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Was {slot(h.previousStartTime, h.previousEndTime)}
              {h.previousNotes ? ` · “${h.previousNotes}”` : ''}
            </Typography>
          )}
          {h.reason && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Reason: {h.reason}
            </Typography>
          )}
          {h.action === 'USAGE_CONFIRMED' && (h.actualHours != null || h.actualQuantity != null) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Recorded {h.actualHours != null ? `${h.actualHours} hrs` : `${h.actualQuantity} units`}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

/**
 * The job page's equipment-booking card: the same shape as the Job, SOW and
 * Invoices cards — party rail, status pane, actions, details — and the record of
 * every booking ever made on the job, cancelled ones included, each with its
 * history. Booking itself happens on the Book inventory page, which the
 * customer's action button opens on this job.
 *
 * Every gate has a server-side twin — `jobEquipmentBooking` returns HIDDEN and no
 * data to a caller who is not on the job, and the mutations re-check. Cancel is
 * offered to every customer on the job; the server's own rule (whoever made the
 * booking, anyone on the job, or staff) refuses the rest with its message.
 */
export default function JobEquipmentBookingPanel({ jobId, staffView = false }: Props): React.JSX.Element | null {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const { can } = usePermissions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [declining, setDeclining] = useState<any | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_JOB_EQUIPMENT_BOOKING, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network'
  });
  // The confirmed-usage half of this card's status line. Its own query, and
  // errorPolicy 'all', because the same panel renders for a caller the balance
  // query refuses — they simply see the line without the suffix rather than an
  // error where a booking list should be.
  const { data: balanceData } = useQuery(GET_JOB_BALANCE, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [confirmUsage, { loading: confirming }] = useMutation(CONFIRM_BOOKING_USAGE);
  const [setBlock] = useMutation(SET_JOB_BOOKING_BLOCK);
  const [approveBooking] = useMutation(APPROVE_BOOKING);
  const [declineBooking] = useMutation(DECLINE_BOOKING);

  const view = data?.jobEquipmentBooking;
  const access = view?.access;
  const operations: any[] = view?.operations ?? [];
  const bookings: any[] = [...(view?.bookings ?? [])].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const live = bookings.filter((b) => b.status !== 'CANCELLED');

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
  const hours = bookedHours(live);
  // Staff still owe usage confirmation on every live booking before a job can be
  // invoiced; the pane only goes green (and collapses) once none are left.
  const staffAllConfirmed = live.length > 0 && live.every((b) => b.usageConfirmed);
  const staffNeedsConfirmation = staffView && live.length > 0 && !staffAllConfirmed;
  const upcoming = live.find((b) => new Date(b.endTime).getTime() > Date.now());
  const operationLabel = (b: any): string => operations.find((op) => op.nodeId === b.nodeId)?.label ?? '';
  // Anyone on the job, and staff, until the booking has ended or been billed
  // (server twin: BookingService.cancel refuses an ended booking for everyone).
  const mayCancel = (b: any): boolean => b.status !== 'CANCELLED' && b.billingStatus !== 'BILLED' && !isBookingOver(b);
  // Editing needs the calendar (the busy slots, the window), so the pencil opens
  // the booking page on this job with the dialog already up for that booking.
  // Staff cannot move a job's booking (the server's verdict gives them no bookable operation).
  const mayEdit = (b: any): boolean => !staffView && open && mayCancel(b);
  // Confirming usage is what makes a booking chargeable — a billing act, so it is
  // the staff page's and `billing:view`'s. Any time, past or future, until billed;
  // an already-confirmed booking can be corrected until then.
  const canConfirm = staffView && can(PERMISSIONS.BillingView);
  // A tentative booking must be approved before its usage can be recorded (server twin: confirmUsage).
  const mayConfirm = (b: any): boolean => canConfirm && b.status !== 'CANCELLED' && b.status !== 'TENTATIVE' && b.billingStatus !== 'BILLED';
  // Answering a client's request is an Administrator's (server twin: approveBooking / declineBooking, inventory:write).
  const mayAnswer = (b: any): boolean => staffView && can(PERMISSIONS.InventoryWrite) && b.status === 'TENTATIVE';
  const pending = awaitingApproval(live);

  const doApprove = async (id: string): Promise<void> => {
    try {
      await approveBooking({ variables: { id } });
      await refetch();
    } catch (error) {
      setActionError(formatSaveError(error, 'this approval'));
    }
  };

  const submitConfirm = async (values: { actualHours?: number; actualQuantity?: number }): Promise<void> => {
    if (!confirmTarget) return;
    setConfirmError(null);
    try {
      await confirmUsage({ variables: { id: confirmTarget._id, actualHours: values.actualHours ?? null, actualQuantity: values.actualQuantity ?? null } });
      setConfirmTarget(null);
      // The balance and the Payments card read their own documents; refetch by
      // document so every card on the page sees the new charge.
      await Promise.all([refetch(), apolloClient.refetchQueries({ include: [GET_JOB_BALANCE, GET_JOB_PAYMENTS] })]);
    } catch (error) {
      setConfirmError(formatSaveError(error, 'this usage confirmation'));
    }
  };
  const editOnBookingPage = (b: any): void => void navigate(`/book-inventory?job=${encodeURIComponent(jobId)}&edit=${encodeURIComponent(b._id)}`);
  // Staff see a booking in context — its month, its equipment, the other holds around it — highlighted.
  const showOnBookingPage = (b: any): void => void navigate(`/book-inventory?job=${encodeURIComponent(jobId)}&highlight=${encodeURIComponent(b._id)}`);

  const doCancel = async (id: string): Promise<void> => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await refetch();
    } catch (error) {
      setActionError(formatSaveError(error, 'this cancellation'));
    }
  };

  const usage = confirmedUsageSuffix(balanceData?.jobBalance);
  const status = `${live.length === 0 ? 'No bookings in place' : `${live.length} booking${live.length === 1 ? '' : 's'} · ${hours} hrs`}${pending.length ? ` · ${pending.length} awaiting approval` : ''}${usage}`;
  const description = locked
    ? locked
    : pending.length
      ? staffView
        ? 'A booking is waiting on the lab: approve or decline it below. Its time is held until then.'
        : 'Your booking request is held for you until the lab approves it; you will be notified either way.'
    : upcoming
      ? `Next: ${upcoming.notes || upcoming.inventoryName} · ${format(new Date(upcoming.startTime), 'MMM d, h:mm a')}`
      : live.length === 0
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
        defaultDetailsOpen={staffNeedsConfirmation}
        customerBadge={live.length > 0 ? 'check' : null}
        staffBadge={paused ? 'paper' : open ? 'check' : null}
        customerVersion={`${hours} hrs booked`}
        staffVersion={paused ? 'Paused' : open ? 'Bookable' : 'Not open'}
        statusPaneSx={{
          bgcolor: chipStatusBackground(paused ? 'warning' : (staffView ? staffAllConfirmed : open && live.length > 0) ? 'success' : 'default')
        }}
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
              {bookings.map((b) => {
                const cancelled = b.status === 'CANCELLED';
                const history: any[] = bookingHistoryLines(b);
                const usage = b.usageConfirmed && !cancelled ? confirmedUsageLabel(b) : null;
                const approval = staffView && !cancelled && b.status !== 'TENTATIVE' ? lastApproval(b) : null;
                const showHistory = !!historyOpen[b._id];
                return (
                  <Card key={b._id} variant="outlined" sx={{ opacity: cancelled ? 0.7 : 1 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {/* Row 1: what was booked. Row 2: its status, slot, cost and actions. */}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, textDecoration: cancelled ? 'line-through' : 'none' }} noWrap title={b.notes || b.inventoryName}>
                          {b.notes || b.inventoryName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {b.inventoryName}
                          {operationLabel(b) ? ` · ${operationLabel(b)}` : ''}
                          {b.createdByName ? ` · booked by ${b.createdByName}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={usage ? usage.label : bookingStatusLabel(b)}
                          color={bookingStatusColor(b)}
                          variant={cancelled || b.status === 'TENTATIVE' ? 'outlined' : 'filled'}
                        />
                        {b.billingStatus === 'BILLED' && <Chip size="small" label="Billed" color="info" variant="outlined" />}
                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: cancelled ? 'line-through' : 'none' }}>
                          {slot(b.startTime, b.endTime)}
                        </Typography>
                        {b.cost != null && !cancelled && <Typography variant="body2">${Number(b.cost).toFixed(2)}</Typography>}
                        <Box sx={{ flex: 1 }} />
                        {history.length > 0 && (
                          <Tooltip title={showHistory ? 'Hide history' : `History (${history.length})`}>
                            <IconButton size="small" onClick={() => setHistoryOpen((s) => ({ ...s, [b._id]: !showHistory }))} aria-expanded={showHistory}>
                              <HistoryIcon fontSize="inherit" />
                              <ExpandMoreIcon sx={{ fontSize: 14, transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {approval && (
                          <Tooltip title={`Approved${approval.byName ? ` by ${approval.byName}` : ''}${approval.at ? ` on ${format(new Date(approval.at as string), 'MMM d, h:mm a')}` : ''}`}>
                            <ThumbUpAltIcon fontSize="small" color="success" sx={{ mx: 0.5 }} aria-label="Approved" />
                          </Tooltip>
                        )}
                        {mayAnswer(b) && (
                          <>
                            <Tooltip title="Approve this booking">
                              <IconButton size="small" color="success" onClick={() => void doApprove(b._id)} aria-label="Approve booking">
                                <ThumbUpAltOutlinedIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Decline this booking">
                              <IconButton size="small" color="error" onClick={() => setDeclining(b)} aria-label="Decline booking">
                                <DoNotDisturbOnOutlinedIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {mayConfirm(b) && (
                          <Tooltip title={b.usageConfirmed ? 'Adjust recorded usage' : 'Record actual usage for billing'}>
                            <IconButton
                              size="small"
                              // Orange, not green: an unconfirmed booking is waiting on staff, not done.
                              color={b.usageConfirmed ? 'default' : 'warning'}
                              onClick={() => {
                                setConfirmError(null);
                                setConfirmTarget(b);
                              }}
                            >
                              <CheckCircleIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {staffView && !cancelled && (
                          <Tooltip title="Open on the booking page">
                            <IconButton size="small" onClick={() => showOnBookingPage(b)} aria-label="Open on the booking page">
                              <OpenInNewIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {mayEdit(b) && (
                          <Tooltip title="Change this booking">
                            <IconButton size="small" onClick={() => editOnBookingPage(b)}>
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {mayCancel(b) && (
                          <Tooltip title="Cancel booking">
                            <IconButton size="small" color="error" onClick={() => doCancel(b._id)}>
                              <CloseIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                      {declinedReason(b) && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                          Declined: {declinedReason(b)}
                        </Typography>
                      )}
                      {history.length > 0 && (
                        <Collapse in={showHistory} unmountOnExit>
                          <BookingHistory entries={history} />
                        </Collapse>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )
        }
      />

      <ConfirmUsageDialog
        open={!!confirmTarget}
        booking={confirmTarget}
        busy={confirming}
        error={confirmError}
        onCancel={() => {
          setConfirmTarget(null);
          setConfirmError(null);
        }}
        onConfirm={submitConfirm}
      />

      <ReasonDialog
        open={!!declining}
        title="Decline this booking"
        warning="The slot is freed and the booking cancelled. The client is notified with your reason."
        fieldLabel="Reason (the client sees this)"
        confirmLabel="Decline booking"
        onCancel={() => setDeclining(null)}
        onConfirm={async (reason) => {
          const target = declining;
          setDeclining(null);
          if (!target) return;
          try {
            await declineBooking({ variables: { id: target._id, reason } });
            await refetch();
          } catch (error) {
            setActionError(formatSaveError(error, 'this decline'));
          }
        }}
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
