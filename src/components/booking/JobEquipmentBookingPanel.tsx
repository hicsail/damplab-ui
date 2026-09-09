import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { GET_JOB_EQUIPMENT_BOOKING } from '../../gql/queries';
import { CANCEL_BOOKING, CREATE_JOB_EQUIPMENT_BOOKING, SET_JOB_BOOKING_BLOCK, UPDATE_JOB_EQUIPMENT_BOOKING } from '../../gql/mutations';
import { blockedMessage, bookingsForWeek, formatBookingWindow, isOutsideWindow, LOCKED_MESSAGES } from '../../utils/jobEquipmentBooking';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import ReasonDialog from '../ReasonDialog';
import JobEquipmentBookingDialog from './JobEquipmentBookingDialog';

interface Props {
  jobId: string;
  /** Staff pages render read-only, plus the pause switch when the caller may pause. */
  staffView?: boolean;
}

/**
 * The job's equipment-booking calendar: one card per equipment-use operation.
 *
 * Every gate here has a server-side twin — `jobEquipmentBooking` returns HIDDEN and
 * no data to a caller who is not on the job, and the three mutations re-check.
 * What this buys is that nobody is walked through a dialog they will be refused at
 * the end of.
 */
export default function JobEquipmentBookingPanel({ jobId, staffView = false }: Props): React.JSX.Element | null {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedItem, setSelectedItem] = useState<Record<string, string>>({});
  const [bookingFor, setBookingFor] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_JOB_EQUIPMENT_BOOKING, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network'
  });

  const [createBooking, { loading: creating }] = useMutation(CREATE_JOB_EQUIPMENT_BOOKING);
  const [updateBooking, { loading: updating }] = useMutation(UPDATE_JOB_EQUIPMENT_BOOKING);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [setBlock] = useMutation(SET_JOB_BOOKING_BLOCK);

  const view = data?.jobEquipmentBooking;
  const access = view?.access;
  const operations: any[] = view?.operations ?? [];
  const bookings: any[] = view?.bookings ?? [];
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  if (!jobId) return null;
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  // Only bail out to the error card when there is nothing cached to fall back on — a
  // failed background revalidate on cache-and-network shouldn't blow away a working
  // calendar, and shouldn't turn a HIDDEN user's blip into a visible error card.
  if (error && !view) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Equipment booking
        </Typography>
        <Alert severity="error">{formatGqlError(error, 'Could not load equipment booking.')}</Alert>
      </Paper>
    );
  }

  // HIDDEN renders nothing at all — not an empty card, not a "no access" notice.
  if (!access || access.status === 'HIDDEN') return null;

  const pauseSwitch = access.canBlock ? (
    <FormControlLabel
      control={
        <Switch
          checked={access.status === 'BLOCKED'}
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
      label="Pause booking"
    />
  ) : null;

  const locked =
    access.status === 'SOW_NOT_SIGNED'
      ? LOCKED_MESSAGES.SOW_NOT_SIGNED
      : access.status === 'NOT_ELIGIBLE'
        ? LOCKED_MESSAGES.NOT_ELIGIBLE
        : access.status === 'BLOCKED'
          ? blockedMessage(access.reason)
          : null;

  const submitBooking = async (values: { inventoryItemId: string; startTime: Date; endTime: Date; notes: string }): Promise<void> => {
    setDialogError(null);
    try {
      if (editing) {
        await updateBooking({
          variables: { id: editing._id, input: { startTime: values.startTime, endTime: values.endTime, notes: values.notes || undefined } }
        });
      } else {
        await createBooking({
          variables: {
            input: {
              jobId,
              nodeId: bookingFor.nodeId,
              inventoryItemId: values.inventoryItemId,
              startTime: values.startTime,
              endTime: values.endTime,
              notes: values.notes || undefined
            }
          }
        });
      }
      setBookingFor(null);
      setEditing(null);
      await refetch();
    } catch (error) {
      setDialogError(formatSaveError(error, 'this booking'));
    }
  };

  const doCancel = async (id: string): Promise<void> => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await refetch();
    } catch (error) {
      setActionError(formatSaveError(error, 'this cancellation'));
    }
  };

  const dialogOperation = editing ? operations.find((op) => op.nodeId === editing.nodeId) : bookingFor;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Equipment booking
        </Typography>
        <Box sx={{ flex: 1 }} />
        {pauseSwitch}
      </Stack>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {locked && <Alert severity={access.status === 'BLOCKED' ? 'warning' : 'info'}>{locked}</Alert>}

      {!locked && operations.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No operation on this job books equipment.
        </Typography>
      )}

      {!locked &&
        operations.map((op) => {
          const schedulable = (op.items ?? []).filter((i: any) => i.schedulable);
          const unschedulable = (op.items ?? []).filter((i: any) => !i.schedulable);
          const itemId = selectedItem[op.nodeId] ?? schedulable[0]?.id ?? '';
          const mine = bookings.filter((b) => b.nodeId === op.nodeId && String(b.inventoryItem) === String(itemId));
          const byDay = bookingsForWeek(mine, weekStart);

          return (
            <Box key={op.nodeId} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {op.label}
                </Typography>
                <Chip size="small" label={formatBookingWindow(op.window)} />
                {op.hoursPerWeek != null && <Chip size="small" label={`${op.hoursPerWeek} hrs/wk projected`} />}
                <Box sx={{ flex: 1 }} />
                {schedulable.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id={`item-${op.nodeId}`}>Equipment</InputLabel>
                    <Select
                      labelId={`item-${op.nodeId}`}
                      label="Equipment"
                      value={itemId}
                      onChange={(e) => setSelectedItem((s) => ({ ...s, [op.nodeId]: e.target.value }))}
                    >
                      {schedulable.map((i: any) => (
                        <MenuItem key={i.id} value={i.id}>
                          {i.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {!staffView && op.canBook && schedulable.length > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setDialogError(null);
                      setBookingFor(op);
                    }}
                  >
                    Book time
                  </Button>
                )}
              </Stack>

              {unschedulable.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Not schedulable here (billed by quantity): {unschedulable.map((i: any) => i.name).join(', ')}
                </Typography>
              )}

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Button size="small" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  This week
                </Button>
                <IconButton size="small" onClick={() => setWeekStart((w) => addDays(w, -7))}>
                  <ChevronLeftIcon fontSize="inherit" />
                </IconButton>
                <Typography variant="caption" sx={{ minWidth: 180, textAlign: 'center' }}>
                  {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </Typography>
                <IconButton size="small" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                  <ChevronRightIcon fontSize="inherit" />
                </IconButton>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(7, 1fr)' }, gap: 1, alignItems: 'start' }}>
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const list = byDay.get(key) ?? [];
                  const today = isSameDay(day, new Date());
                  return (
                    <Box
                      key={key}
                      sx={{ border: '1px solid', borderColor: today ? 'primary.main' : 'divider', borderRadius: 1, minHeight: 90, p: 0.75 }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        {format(day, 'EEE d')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {list.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                        {list.map((b: any) => {
                          const outside = isOutsideWindow(op.window, new Date(b.startTime), new Date(b.endTime));
                          return (
                            <Box key={b._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                {format(new Date(b.startTime), 'h:mm a')}–{format(new Date(b.endTime), 'h:mm a')}
                              </Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                {b.cost != null && <Typography variant="caption">${Number(b.cost).toFixed(2)}</Typography>}
                                {outside && (
                                  <Tooltip title="Outside the estimated window">
                                    <WarningAmberIcon color="warning" sx={{ fontSize: 14 }} />
                                  </Tooltip>
                                )}
                                <Box sx={{ flex: 1 }} />
                                {!staffView && op.canBook && b.billingStatus !== 'BILLED' && (
                                  <>
                                    <Tooltip title="Edit">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setDialogError(null);
                                          setEditing(b);
                                        }}
                                      >
                                        <EditIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel booking">
                                      <IconButton size="small" color="error" onClick={() => doCancel(b._id)}>
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}

      <JobEquipmentBookingDialog
        open={!!bookingFor || !!editing}
        title={editing ? 'Edit booking' : `Book ${dialogOperation?.label ?? 'equipment'}`}
        window={dialogOperation?.window ?? {}}
        items={dialogOperation?.items ?? []}
        fixedItemId={editing ? String(editing.inventoryItem) : undefined}
        initialStart={editing ? new Date(editing.startTime) : null}
        initialEnd={editing ? new Date(editing.endTime) : null}
        initialNotes={editing?.notes ?? ''}
        busy={creating || updating}
        error={dialogError}
        onCancel={() => {
          setBookingFor(null);
          setEditing(null);
          setDialogError(null);
        }}
        onConfirm={submitBooking}
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
    </Paper>
  );
}
