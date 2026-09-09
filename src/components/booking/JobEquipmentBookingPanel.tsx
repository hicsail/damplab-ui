import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { addDays, startOfWeek } from 'date-fns';
import { GET_INVENTORY_AVAILABILITY, GET_JOB_EQUIPMENT_BOOKING } from '../../gql/queries';
import { CANCEL_BOOKING, CREATE_JOB_EQUIPMENT_BOOKING, SET_JOB_BOOKING_BLOCK, UPDATE_JOB_EQUIPMENT_BOOKING } from '../../gql/mutations';
import { blockedMessage, defaultSlotFor, formatBookingWindow, LOCKED_MESSAGES } from '../../utils/jobEquipmentBooking';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import ReasonDialog from '../ReasonDialog';
import JobEquipmentBookingDialog from './JobEquipmentBookingDialog';
import BookingWeekGrid, { BusySlot } from './BookingWeekGrid';

interface Props {
  jobId: string;
  /** Staff pages render read-only, plus the pause switch when the caller may pause. */
  staffView?: boolean;
  /** The job pages collapse settled cards; the booking page wants this one open. */
  defaultExpanded?: boolean;
}

/**
 * The job's equipment-booking calendar: one card per equipment-use operation.
 *
 * Every gate here has a server-side twin — `jobEquipmentBooking` returns HIDDEN and
 * no data to a caller who is not on the job, and the three mutations re-check.
 * What this buys is that nobody is walked through a dialog they will be refused at
 * the end of.
 *
 * Other people's holds on the item come from `inventoryAvailability`, the same pool
 * the server refuses against. Without them the grid showed only this job's own
 * bookings, and a week the lab had already reserved looked wide open until Save.
 */
export default function JobEquipmentBookingPanel({ jobId, staffView = false, defaultExpanded = true }: Props): React.JSX.Element | null {
  const { can } = usePermissions();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedItem, setSelectedItem] = useState<Record<string, string>>({});
  const [bookingFor, setBookingFor] = useState<any | null>(null);
  const [proposed, setProposed] = useState<{ start: Date; end: Date } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_JOB_EQUIPMENT_BOOKING, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network'
  });

  const view = data?.jobEquipmentBooking;
  const access = view?.access;
  const operations: any[] = view?.operations ?? [];
  const bookings: any[] = view?.bookings ?? [];
  const open = access?.status === 'OPEN';

  // The shared pool for the visible week. `inventoryAvailability` needs
  // inventory:read, which every role that can book already holds; a caller without
  // it simply sees no grey slots rather than an error.
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const { data: availData, refetch: refetchAvailability } = useQuery(GET_INVENTORY_AVAILABILITY, {
    variables: { from: weekStart, to: weekEnd },
    skip: !jobId || !open || !can(PERMISSIONS.InventoryRead),
    fetchPolicy: 'cache-and-network'
  });
  const conflicts: any[] = availData?.inventoryAvailability ?? [];

  const [createBooking, { loading: creating }] = useMutation(CREATE_JOB_EQUIPMENT_BOOKING);
  const [updateBooking, { loading: updating }] = useMutation(UPDATE_JOB_EQUIPMENT_BOOKING);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [setBlock] = useMutation(SET_JOB_BOOKING_BLOCK);

  const reload = async (): Promise<void> => {
    await Promise.all([refetch(), open && can(PERMISSIONS.InventoryRead) ? refetchAvailability() : Promise.resolve()]);
  };

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
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Equipment booking
          </Typography>
          <Alert severity="error">{formatGqlError(error, 'Could not load equipment booking.')}</Alert>
        </CardContent>
      </Card>
    );
  }

  // HIDDEN renders nothing at all — not an empty card, not a "no access" notice.
  if (!access || access.status === 'HIDDEN') return null;

  const pauseSwitch = access.canBlock ? (
    <FormControlLabel
      onClick={(e) => e.stopPropagation()}
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

  const closeDialog = (): void => {
    setBookingFor(null);
    setProposed(null);
    setEditing(null);
    setDialogError(null);
  };

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
      closeDialog();
      await reload();
    } catch (error) {
      setDialogError(formatSaveError(error, 'this booking'));
    }
  };

  const doCancel = async (id: string): Promise<void> => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking({ variables: { id } });
      await reload();
    } catch (error) {
      setActionError(formatSaveError(error, 'this cancellation'));
    }
  };

  /** Holds on the item that are not this job's own bookings (those are drawn in full). */
  const busyFor = (itemId: string, mine: any[]): BusySlot[] => {
    const own = new Set(mine.map((b) => `${new Date(b.startTime).getTime()}-${new Date(b.endTime).getTime()}`));
    return conflicts
      .filter((c) => String(c.itemId) === String(itemId))
      .filter((c) => !(c.source === 'BOOKING' && own.has(`${new Date(c.start).getTime()}-${new Date(c.end).getTime()}`)))
      .map((c) => ({ label: c.label, start: c.start, end: c.end }));
  };

  const dialogOperation = editing ? operations.find((op) => op.nodeId === editing.nodeId) : bookingFor;
  const toggle = (): void => setExpanded((v) => !v);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse Equipment booking' : 'Expand Equipment booking'}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1.5 : 0, cursor: 'pointer', userSelect: 'none' }}
        >
          <Typography variant="h6" sx={{ flex: 1 }}>
            Equipment booking
          </Typography>
          {pauseSwitch && (
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {pauseSwitch}
            </Box>
          )}
          <ExpandMoreIcon sx={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
        </Box>

        <Collapse in={expanded} unmountOnExit={false}>
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
              const mayBook = !staffView && op.canBook && schedulable.length > 0;
              const openDialog = (slot?: { start: Date; end: Date }): void => {
                setDialogError(null);
                setEditing(null);
                setProposed(slot ?? null);
                setBookingFor(op);
              };

              return (
                <Box key={op.nodeId} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
                    {mayBook && (
                      <Button size="small" variant="contained" onClick={() => openDialog()}>
                        Book time
                      </Button>
                    )}
                  </Stack>

                  {unschedulable.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Not schedulable here (billed by quantity): {unschedulable.map((i: any) => i.name).join(', ')}
                    </Typography>
                  )}

                  <BookingWeekGrid
                    weekStart={weekStart}
                    onWeekStart={setWeekStart}
                    bookings={mine}
                    busy={busyFor(itemId, mine)}
                    window={op.window}
                    canAct={mayBook}
                    onEdit={(b) => {
                      setDialogError(null);
                      setBookingFor(null);
                      setProposed(null);
                      setEditing(b);
                    }}
                    onCancel={doCancel}
                    onDayClick={mayBook ? (day) => openDialog(defaultSlotFor(day)) : undefined}
                  />
                </Box>
              );
            })}
        </Collapse>

        <JobEquipmentBookingDialog
          open={!!bookingFor || !!editing}
          title={editing ? 'Edit booking' : `Book ${dialogOperation?.label ?? 'equipment'}`}
          window={dialogOperation?.window ?? {}}
          items={dialogOperation?.items ?? []}
          fixedItemId={editing ? String(editing.inventoryItem) : undefined}
          initialItemId={bookingFor ? selectedItem[bookingFor.nodeId] : undefined}
          initialStart={editing ? new Date(editing.startTime) : (proposed?.start ?? null)}
          initialEnd={editing ? new Date(editing.endTime) : (proposed?.end ?? null)}
          initialNotes={editing?.notes ?? ''}
          busy={creating || updating}
          error={dialogError}
          onCancel={closeDialog}
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
      </CardContent>
    </Card>
  );
}
