import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import { GET_INVOICES_BY_JOB_ID, GET_JOB_BALANCE, GET_JOB_PAYMENTS } from '../../gql/queries';
import { RECORD_JOB_PAYMENT, VOID_JOB_PAYMENT } from '../../gql/mutations';
import { balanceHeading, balanceRailLabel, depositSummary, formatMoney, invoiceTitle, NO_INVOICE_ISSUED, paymentsCardFigures, paymentsCountLabel } from '../../utils/equipmentBilling';
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
 * The job page's Payments card. Charges, deposit and balance come from the
 * current issued invoice; payments are live (they belong to the job, never to
 * one invoice, and every invoice version restates them). Before any invoice
 * is issued the card says so and lists payments only.
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

  const invoicesQuery = useQuery(GET_INVOICES_BY_JOB_ID, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });

  // A payment recorded or voided reissues the job's invoice server-side, so
  // the Invoice card's list is refetched along with this card's own figures.
  const [recordPayment] = useMutation(RECORD_JOB_PAYMENT, { refetchQueries: ['GetInvoicesByJobId'] });
  const [voidPayment] = useMutation(VOID_JOB_PAYMENT, { refetchQueries: ['GetInvoicesByJobId'] });

  const balance = balanceQuery.data?.jobBalance;
  const payments: any[] = paymentsQuery.data?.jobPayments ?? [];
  const live = payments.filter((p) => !p.voidedAt);
  const figures = paymentsCardFigures<any>(invoicesQuery.data?.invoicesByJobId ?? [], payments);
  const invoicesFailed = !!invoicesQuery.error && !invoicesQuery.data;
  const due = figures.balance ?? 0;

  if (!jobId) return null;
  if ((balanceQuery.loading && !balanceQuery.data) || (invoicesQuery.loading && !invoicesQuery.data)) {
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
    await Promise.all([balanceQuery.refetch(), paymentsQuery.refetch(), invoicesQuery.refetch()]);
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

  // Demo only: "Refresh..." reads as checking for an online payment, but it
  // records the balance of the current invoice, as if the client had just paid.
  const demoRefresh = async (): Promise<void> => {
    setBusy(true);
    setActionError(null);
    try {
      const [freshInvoices, freshPayments] = await Promise.all([invoicesQuery.refetch(), paymentsQuery.refetch()]);
      const fresh = paymentsCardFigures<any>(freshInvoices.data?.invoicesByJobId ?? [], freshPayments.data?.jobPayments ?? []);
      const amountDue = fresh.balance ?? 0;
      if (fresh.invoice && amountDue > 0) {
        await recordPayment({
          variables: { input: { jobId, amount: amountDue, receivedOn: new Date().toISOString(), reference: 'Online card payment', note: null } }
        });
      }
      await refresh();
    } catch (error) {
      setActionError(formatSaveError(error, 'this payment'));
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
  const status = invoicesFailed ? 'Invoice unavailable' : figures.invoice ? balanceRailLabel(due) : NO_INVOICE_ISSUED;
  const description = figures.invoice
    ? `Charges ${formatMoney(figures.charges)} · Payments ${formatMoney(figures.payments)} · ${balanceHeading(due)} ${formatMoney(Math.abs(due))}`
    : invoicesFailed
      ? null
      : 'Charges and the balance appear here once the lab issues an invoice.';

  return (
    <>
      <ProcessCard
        title="Payments"
        defaultExpanded={payments.length > 0}
        customerBadge={live.length > 0 ? 'check' : null}
        staffBadge={due > 0 ? 'paper' : live.length > 0 ? 'check' : null}
        customerVersion={figures.invoice ? balanceRailLabel(due) : 'No invoice yet'}
        staffVersion={paymentsCountLabel(live.length)}
        statusPaneSx={{ bgcolor: chipStatusBackground(due > 0 ? 'warning' : live.length > 0 ? 'success' : 'default') }}
        statusPane={
          <StatusPaneHeader status={status} description={description}>
            {figures.deposit && Number(figures.deposit.outstanding) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {depositSummary(figures.deposit)}
              </Typography>
            )}
            {figures.invoice && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {`As stated on ${invoiceTitle(figures.invoice)}. Payments are live.`}
              </Typography>
            )}
            {balance.unconfirmedBookings > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {`${balance.unconfirmedBookings} booking${balance.unconfirmedBookings === 1 ? '' : 's'} not yet confirmed, so not on any invoice yet.`}
              </Typography>
            )}
            {invoicesFailed && <Alert severity="error" sx={{ mt: 1 }}>{formatGqlError(invoicesQuery.error, 'Could not load this job’s invoices.')}</Alert>}
            {actionError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            )}
          </StatusPaneHeader>
        }
        actions={
          staffView ? (
            <>
              <Can permission={PERMISSIONS.BillingWrite}>
                <Button variant="contained" size="small" startIcon={<PaymentsIcon />} onClick={openRecord} sx={railBtnSx}>
                  Record payment
                </Button>
              </Can>
              {figures.invoice && (
                <Can permission={PERMISSIONS.BillingWrite}>
                  <Button variant="outlined" size="small" startIcon={<RefreshIcon />} disabled={busy} onClick={demoRefresh} sx={railBtnSx}>
                    {busy ? 'Refreshing…' : 'Refresh...'}
                  </Button>
                </Can>
              )}
            </>
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
            <Typography variant="caption" color="text.secondary">
              If an invoice stands on this job, recording the payment issues a new version with it listed, and the client is emailed that version.
            </Typography>
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
            'If an invoice stands on this job, a new version is issued to restate the balance, and the client is emailed it.'
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
