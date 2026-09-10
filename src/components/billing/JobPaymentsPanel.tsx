import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import { GET_JOB_BALANCE, GET_JOB_PAYMENTS } from '../../gql/queries';
import { RECORD_JOB_PAYMENT, VOID_JOB_PAYMENT } from '../../gql/mutations';
import { balanceHeading, balanceRailLabel, depositSummary, formatMoney, paymentsCountLabel } from '../../utils/equipmentBilling';
import { chipStatusBackground } from '../../utils/technicianProcessStatus';
import { formatGqlError, formatSaveError, isPermissionError } from '../../utils/gqlError';
import ProcessCard from '../technician/ProcessCard';
import StatusPaneHeader from '../technician/StatusPaneHeader';
import ReasonDialog from '../ReasonDialog';
import Can from '../PermissionGate';
import { PERMISSIONS } from '../../hooks/usePermissions';

interface Props {
  jobId: string;
  /** Staff pages get Record payment and the void control; the customer's page is read-only. */
  staffView?: boolean;
}

const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

/** `yyyy-MM-dd` for the date input's default value: today, in the browser's own calendar. */
const todayIso = (): string => format(new Date(), 'yyyy-MM-dd');

/**
 * The job page's Payments card: what the job has been charged, what has been
 * received against it, and the balance — live. Payments belong to the job,
 * never to one invoice; every invoice version restates them.
 *
 * Renders nothing at all when the caller may not read the job's billing — the
 * server answers ForbiddenException, exactly as `jobEquipmentBooking` answers
 * HIDDEN, and a "no access" card would tell a stranger the job exists.
 */
export default function JobPaymentsPanel({ jobId, staffView = false }: Props): React.JSX.Element | null {
  const [actionError, setActionError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState(todayIso());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [voidTarget, setVoidTarget] = useState<{ id: string; amount: number } | null>(null);

  const balanceQuery = useQuery(GET_JOB_BALANCE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const paymentsQuery = useQuery(GET_JOB_PAYMENTS, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });

  const [recordPayment] = useMutation(RECORD_JOB_PAYMENT);
  const [voidPayment] = useMutation(VOID_JOB_PAYMENT);

  const balance = balanceQuery.data?.jobBalance;
  const payments: any[] = paymentsQuery.data?.jobPayments ?? [];
  const live = payments.filter((p) => !p.voidedAt);

  if (!jobId) return null;
  if (balanceQuery.loading && !balanceQuery.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!balance) {
    // A permission refusal is the caller having no business with this job's
    // money — nothing at all, not an error card, exactly as `jobEquipmentBooking`
    // answers HIDDEN. Any other failure, with nothing cached to fall back on, is
    // worth telling the caller about.
    if (balanceQuery.error && !isPermissionError(balanceQuery.error)) {
      return (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Payments
            </Typography>
            <Alert severity="error">{formatGqlError(balanceQuery.error, 'Could not load payments.')}</Alert>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const refresh = async (): Promise<void> => {
    await Promise.all([balanceQuery.refetch(), paymentsQuery.refetch()]);
  };

  const closeRecord = (): void => {
    setRecording(false);
    setAmount('');
    setReference('');
    setNote('');
    setReceivedOn(todayIso());
    setRecordError(null);
  };

  const openRecord = (): void => {
    setRecordError(null);
    setRecording(true);
  };

  const submitPayment = async (): Promise<void> => {
    setBusy(true);
    setRecordError(null);
    try {
      await recordPayment({
        variables: {
          input: {
            jobId,
            amount: Number(amount),
            // Noon rather than midnight: a date-only string parsed as UTC
            // midnight renders as the previous day in every negative-offset
            // timezone, which is where this lab is.
            receivedOn: new Date(`${receivedOn}T12:00:00`).toISOString(),
            reference: reference.trim() || null,
            note: note.trim() || null
          }
        }
      });
      closeRecord();
      await refresh();
    } catch (error) {
      // Stays open with the refusal visible in the dialog itself — closing here
      // would drop the error behind the modal backdrop, where the status pane's
      // own alert can't be seen until the user reopens the dialog.
      setRecordError(formatSaveError(error, 'this payment'));
    } finally {
      setBusy(false);
    }
  };

  const submitVoid = async (reason: string): Promise<void> => {
    if (!voidTarget) return;
    setBusy(true);
    try {
      await voidPayment({ variables: { id: voidTarget.id, reason } });
      setVoidTarget(null);
      await refresh();
    } catch (error) {
      setVoidTarget(null);
      setActionError(formatSaveError(error, 'this void'));
    } finally {
      setBusy(false);
    }
  };

  const amountValid = Number(amount) > 0;
  const status = balanceRailLabel(balance.balanceDue);
  const description = `Charges to date ${formatMoney(balance.chargesToDate)} · Payments to date ${formatMoney(balance.paymentsToDate)} · ${balanceHeading(balance.balanceDue)} ${formatMoney(Math.abs(Number(balance.balanceDue) || 0))}`;

  return (
    <>
      <ProcessCard
        title="Payments"
        defaultExpanded={payments.length > 0}
        customerBadge={live.length > 0 ? 'check' : null}
        staffBadge={Number(balance.balanceDue) > 0 ? 'paper' : live.length > 0 ? 'check' : null}
        customerVersion={balanceRailLabel(balance.balanceDue)}
        staffVersion={paymentsCountLabel(live.length)}
        statusPaneSx={{ bgcolor: chipStatusBackground(Number(balance.balanceDue) > 0 ? 'warning' : live.length > 0 ? 'success' : 'default') }}
        statusPane={
          <StatusPaneHeader status={status} description={description}>
            {Number(balance.depositOutstanding) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {depositSummary({ label: 'Deposit', amount: balance.depositAmount, dueDate: balance.depositDueDate, outstanding: balance.depositOutstanding })}
              </Typography>
            )}
            {/* The invoice is a snapshot; this card is live. Said outright, so a
                booking confirmed after issue moving these figures reads as
                expected rather than as the two disagreeing. */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Live figures. The invoice states them as they stood when it was issued.
            </Typography>
            {balance.unconfirmedBookings > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {`${balance.unconfirmedBookings} booking${balance.unconfirmedBookings === 1 ? '' : 's'} not yet confirmed, so not on this balance.`}
              </Typography>
            )}
            {actionError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            )}
          </StatusPaneHeader>
        }
        actions={
          staffView ? (
            <Can permission={PERMISSIONS.BillingWrite}>
              <Button variant="contained" size="small" startIcon={<PaymentsIcon />} onClick={openRecord} sx={railBtnSx}>
                Record payment
              </Button>
            </Can>
          ) : undefined
        }
        details={
          paymentsQuery.error && !paymentsQuery.data ? (
            <Alert severity="error">{formatGqlError(paymentsQuery.error, 'Could not load payments.')}</Alert>
          ) : payments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No payments have been recorded against this job yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {payments.map((p) => {
                const voided = !!p.voidedAt;
                return (
                  <Card key={p.id} variant="outlined" sx={{ opacity: voided ? 0.7 : 1 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontWeight: 600, textDecoration: voided ? 'line-through' : 'none' }}>{formatMoney(p.amount)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {p.receivedOn ? format(new Date(p.receivedOn), 'MMM d, yyyy') : ''}
                          {p.reference ? ` · ${p.reference}` : ''}
                          {p.invoiceNumber ? ` · Invoice ${p.invoiceNumber}` : ''}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          {p.recordedBy ? `recorded by ${p.recordedBy}` : ''}
                        </Typography>
                        {staffView && !voided && (
                          <Can permission={PERMISSIONS.BillingWrite}>
                            <Tooltip title="Void this payment">
                              <IconButton size="small" color="error" disabled={busy} onClick={() => setVoidTarget({ id: String(p.id), amount: Number(p.amount) })}>
                                <CloseIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </Can>
                        )}
                      </Stack>
                      {p.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {p.note}
                        </Typography>
                      )}
                      {voided && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                          {`VOID — ${p.voidReason || 'no reason recorded'}`}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )
        }
      />

      <Dialog open={recording} onClose={() => (busy ? undefined : closeRecord())} maxWidth="xs" fullWidth>
        <DialogTitle>Record a payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              required
              label="Amount"
              type="number"
              value={amount}
              disabled={busy}
              error={amount !== '' && !amountValid}
              helperText={amount !== '' && !amountValid ? 'Payment amount must be greater than zero.' : ' '}
              onChange={(e) => setAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              required
              label="Date received"
              type="date"
              value={receivedOn}
              disabled={busy}
              onChange={(e) => setReceivedOn(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Reference" placeholder="Check #1042" value={reference} disabled={busy} onChange={(e) => setReference(e.target.value)} />
            <TextField label="Note" multiline minRows={2} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
            {recordError && <Alert severity="error">{recordError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeRecord} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy || !amountValid || !receivedOn} onClick={submitPayment}>
            {busy ? 'Recording…' : 'Record payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {voidTarget && (
        <ReasonDialog
          open
          title={`Void the ${formatMoney(voidTarget.amount)} payment?`}
          warning={
            'The payment is kept and shown struck through with your reason, so the balance moving back up is explicable.\n\n' +
            'The current invoice is not changed — it states the balance as at its own date. Issue a new version to restate it.'
          }
          fieldLabel="Reason (the client sees this)"
          confirmLabel="Void payment"
          busy={busy}
          onCancel={() => setVoidTarget(null)}
          onConfirm={submitVoid}
        />
      )}
    </>
  );
}
