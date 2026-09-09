import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { addDays, startOfMonth } from 'date-fns';
import { GET_INVENTORY_AVAILABILITY, GET_JOB_EQUIPMENT_BOOKING } from '../../gql/queries';
import { CANCEL_BOOKING, CREATE_JOB_EQUIPMENT_BOOKING, UPDATE_JOB_EQUIPMENT_BOOKING } from '../../gql/mutations';
import { blockedMessage, defaultSlotFor, formatBookingWindow, LOCKED_MESSAGES } from '../../utils/jobEquipmentBooking';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions';
import JobEquipmentBookingDialog from './JobEquipmentBookingDialog';
import BookingMonthGrid, { BusySlot, monthGrid } from './BookingMonthGrid';

interface Props {
  jobId: string;
}

/**
 * The booking page's calendar for one job: a month grid per equipment-use
 * operation, with the job's own bookings in full and everyone else's holds in
 * grey. Booking, moving and cancelling happen here; the job page only lists.
 *
 * Every gate has a server-side twin — `jobEquipmentBooking` returns HIDDEN and no
 * data to a caller who is not on the job, and the mutations re-check.
 */
export default function JobEquipmentBookingCalendar({ jobId }: Props): React.JSX.Element | null {
  const { can } = usePermissions();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedItem, setSelectedItem] = useState<Record<string, string>>({});
  const [bookingFor, setBookingFor] = useState<any | null>(null);
  const [proposed, setProposed] = useState<{ start: Date; end: Date } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // The shared pool for the visible grid. `inventoryAvailability` needs
  // inventory:read, which every role that can book already holds.
  const { first, dayCount } = useMemo(() => monthGrid(month), [month]);
  const gridEnd = useMemo(() => addDays(first, dayCount), [first, dayCount]);
  const canReadPool = can(PERMISSIONS.InventoryRead);
  const { data: availData, refetch: refetchAvailability } = useQuery(GET_INVENTORY_AVAILABILITY, {
    variables: { from: first, to: gridEnd },
    skip: !jobId || !open || !canReadPool,
    fetchPolicy: 'cache-and-network'
  });
  const conflicts: any[] = availData?.inventoryAvailability ?? [];

  const [createBooking, { loading: creating }] = useMutation(CREATE_JOB_EQUIPMENT_BOOKING);
  const [updateBooking, { loading: updating }] = useMutation(UPDATE_JOB_EQUIPMENT_BOOKING);
  const [cancelBooking] = useMutation(CANCEL_BOOKING);

  const reload = async (): Promise<void> => {
    await Promise.all([refetch(), open && canReadPool ? refetchAvailability() : Promise.resolve()]);
  };

  if (!jobId) return null;
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error && !view) return <Alert severity="error">{formatGqlError(error, 'Could not load equipment booking for this job.')}</Alert>;
  if (!access || access.status === 'HIDDEN') return <Alert severity="info">You are not on this job, so there is nothing to book here.</Alert>;

  const locked =
    access.status === 'SOW_NOT_SIGNED'
      ? LOCKED_MESSAGES.SOW_NOT_SIGNED
      : access.status === 'NOT_ELIGIBLE'
        ? LOCKED_MESSAGES.NOT_ELIGIBLE
        : access.status === 'BLOCKED'
          ? blockedMessage(access.reason)
          : null;
  if (locked) return <Alert severity={access.status === 'BLOCKED' ? 'warning' : 'info'}>{locked}</Alert>;

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
        await updateBooking({ variables: { id: editing._id, input: { startTime: values.startTime, endTime: values.endTime, notes: values.notes || undefined } } });
      } else {
        await createBooking({
          variables: {
            input: { jobId, nodeId: bookingFor.nodeId, inventoryItemId: values.inventoryItemId, startTime: values.startTime, endTime: values.endTime, notes: values.notes || undefined }
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
  const dialogItemName = (): string => {
    const items: any[] = dialogOperation?.items ?? [];
    const id = editing ? String(editing.inventoryItem) : (selectedItem[dialogOperation?.nodeId] ?? items.find((i) => i.schedulable)?.id);
    return items.find((i) => i.id === id)?.name ?? 'equipment';
  };

  return (
    <>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {operations.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No operation on this job books equipment.
        </Typography>
      )}

      {operations.map((op) => {
        const schedulable = (op.items ?? []).filter((i: any) => i.schedulable);
        const unschedulable = (op.items ?? []).filter((i: any) => !i.schedulable);
        const itemId = selectedItem[op.nodeId] ?? schedulable[0]?.id ?? '';
        const item = schedulable.find((i: any) => i.id === itemId);
        const mine = bookings.filter((b) => b.nodeId === op.nodeId && String(b.inventoryItem) === String(itemId));
        const mayBook = op.canBook && schedulable.length > 0;
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
              {item && schedulable.length === 1 && <Chip size="small" color="primary" variant="outlined" label={`Equipment: ${item.name}`} />}
              <Chip size="small" label={formatBookingWindow(op.window)} />
              {op.hoursPerWeek != null && <Chip size="small" label={`${op.hoursPerWeek} hrs/wk projected`} />}
              <Box sx={{ flex: 1 }} />
              {schedulable.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id={`item-${op.nodeId}`}>Equipment</InputLabel>
                  <Select labelId={`item-${op.nodeId}`} label="Equipment" value={itemId} onChange={(e) => setSelectedItem((s) => ({ ...s, [op.nodeId]: e.target.value }))}>
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
                  Book {item?.name ?? 'time'}
                </Button>
              )}
            </Stack>

            {!mayBook && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {schedulable.length === 0 ? 'Nothing on this operation is booked by the hour.' : 'You are not listed as a booker on this operation.'}
              </Typography>
            )}
            {unschedulable.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Not schedulable here (billed by quantity): {unschedulable.map((i: any) => i.name).join(', ')}
              </Typography>
            )}

            <BookingMonthGrid
              month={month}
              onMonth={setMonth}
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

      <JobEquipmentBookingDialog
        open={!!bookingFor || !!editing}
        title={editing ? `Edit booking — ${dialogItemName()}` : `Book ${dialogItemName()} — ${dialogOperation?.label ?? ''}`}
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
    </>
  );
}
