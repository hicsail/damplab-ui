import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { addDays, format } from 'date-fns';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, IconButton, List, ListItem, ListItemText, Tooltip, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CancelIcon from '@mui/icons-material/Cancel';
import { GET_INVOICES_BY_JOB_ID, GET_JOB_BALANCE, GET_JOB_CHARGES } from '../../gql/queries';
import { CREATE_INVOICE, VOID_INVOICE, VOID_JOB_CHARGE } from '../../gql/mutations';
import {
  balanceHeading,
  currentInvoice,
  depositSummary,
  dueDateLabel,
  formatMoney,
  invoiceStatusChipColor,
  invoiceStatusLabel,
  invoiceStatusOf,
  invoiceTitle,
  invoiceVersionOf,
  isLegacyInvoice
} from '../../utils/equipmentBilling';
import type { CustomLineDraft, DepositDraft } from '../../utils/jobCharges';
import { buildCustomLineInputs, buildDepositInput, chargeKindLabel, emptyCustomLine, noonIso, sortChargesForDisplay } from '../../utils/jobCharges';
import { chipStatusBackground } from '../../utils/technicianProcessStatus';
import { formatGqlError, formatSaveError, isPermissionError } from '../../utils/gqlError';
import JobInvoiceDocument from '../JobInvoiceDocument';
import ProcessCard from '../technician/ProcessCard';
import StatusPaneHeader from '../technician/StatusPaneHeader';
import ReasonDialog from '../ReasonDialog';
import Can from '../PermissionGate';
import { PERMISSIONS } from '../../hooks/usePermissions';
import InvoiceView from './InvoiceView';
import { IssueInvoiceDialog } from './JobChargeDialogs';

interface Props {
  jobId: string;
  jobDisplayId?: string | null;
  jobName: string;
  customerCategory?: string | null;
  /** The Statement of Work, for the PDF's fiscal-year label and bill-to fallbacks — never for figures. */
  sow: any | null;
  /** Staff pages get Issue, Void and the charge void control; the customer's page is read-only. */
  staffView?: boolean;
  /** Why no version can be issued yet (the SOW is not countersigned), or null. Staff only. */
  issueBlockedReason?: string | null;
  documentStale?: boolean;
  /** Called after an issue or a void, so the page can refresh what it shows around this card. */
  onChanged?: () => unknown;
}

const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

/** A signed amount: a discount prints "-$50.00", never "$-50.00". */
function signedMoney(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return value < 0 ? `-${formatMoney(Math.abs(value))}` : formatMoney(value);
}

/**
 * The job's Invoice card, on both the staff and the customer page.
 *
 * One invoice stands at a time. Issuing a new version restates the whole job
 * and marks the previous one Superseded; the current version is shown in the
 * page, with the PDF as a download, and every earlier version stays listed
 * below it. Status is Paid once the payments recorded on the job cover it —
 * staff settle a remainder by issuing a version with a discount line.
 */
export default function InvoicePanel({ jobId, jobDisplayId, jobName, customerCategory, sow, staffView = false, issueBlockedReason = null, documentStale, onChanged }: Props): React.JSX.Element {
  const invoicesQuery = useQuery(GET_INVOICES_BY_JOB_ID, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const balanceQuery = useQuery(GET_JOB_BALANCE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
  // errorPolicy 'all': a caller refused the charges simply sees no Charges block.
  const chargesQuery = useQuery(GET_JOB_CHARGES, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });

  const [createInvoice, { loading: issuing }] = useMutation(CREATE_INVOICE);
  const [voidInvoice] = useMutation(VOID_INVOICE);
  const [voidJobCharge, { loading: voidingCharge }] = useMutation(VOID_JOB_CHARGE);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [customLines, setCustomLines] = useState<CustomLineDraft[]>([]);
  const [deposit, setDeposit] = useState<DepositDraft | null>(null);
  const [voidTarget, setVoidTarget] = useState<any | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [chargeVoidTarget, setChargeVoidTarget] = useState<{ id: string; label: string } | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);

  const invoices: any[] = invoicesQuery.data?.invoicesByJobId ?? [];
  const current = currentInvoice<any>(invoices);
  const history = invoices.filter((inv) => inv !== current);
  const status = current ? invoiceStatusOf(current) : null;
  const balance = balanceQuery.data?.jobBalance ?? null;
  const charges: any[] = chargesQuery.data?.jobCharges ?? [];
  const liveCharges = charges.filter((c) => !c.voidedAt);
  const existingCustom = sortChargesForDisplay(liveCharges.filter((c) => c.kind === 'CUSTOM'));
  const existingDeposit = liveCharges.filter((c) => c.kind === 'DEPOSIT').slice(-1)[0] ?? null;

  const refreshAll = async (): Promise<void> => {
    await Promise.all([invoicesQuery.refetch(), balanceQuery.refetch(), chargesQuery.refetch(), onChanged?.()]);
  };

  const openIssue = (): void => {
    // Every opening starts clean, so a half-typed line from a cancelled attempt
    // is never submitted with the next one.
    setIssueError(null);
    setDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    setCustomLines([emptyCustomLine()]);
    setDeposit(null);
    setIssueOpen(true);
  };

  const submitIssue = async (): Promise<void> => {
    if (!dueDate) return;
    setIssueError(null);
    const input: any = { jobId, dueDate: noonIso(dueDate) };
    const lines = buildCustomLineInputs(customLines);
    if (lines.length > 0) input.customLines = lines;
    const depositInput = buildDepositInput(deposit);
    if (depositInput) input.deposit = depositInput;
    try {
      await createInvoice({ variables: { input } });
      await refreshAll();
      setIssueOpen(false);
    } catch (err) {
      // Stays open with the refusal visible in the dialog itself.
      setIssueError(formatSaveError(err, 'this invoice'));
    }
  };

  const submitVoidInvoice = async (reason: string): Promise<void> => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await voidInvoice({ variables: { invoiceId: voidTarget.id, reason } });
      setVoidTarget(null);
      await refreshAll();
    } catch (err) {
      window.alert(formatGqlError(err, 'Could not void the invoice.'));
    } finally {
      setVoiding(false);
    }
  };

  const submitVoidCharge = async (reason: string): Promise<void> => {
    if (!chargeVoidTarget) return;
    try {
      await voidJobCharge({ variables: { id: chargeVoidTarget.id, reason } });
      setChargeVoidTarget(null);
      await refreshAll();
    } catch (err) {
      window.alert(formatGqlError(err, 'Could not void the charge.'));
    }
  };

  const pdfLink = (invoice: any, label: string, asButton: boolean): React.JSX.Element => (
    <PDFDownloadLink
      document={<JobInvoiceDocument jobId={jobId} jobDisplayId={jobDisplayId ?? null} jobName={jobName} customerCategory={(customerCategory as any) ?? undefined} sow={sow} invoice={invoice} />}
      fileName={`Invoice-${invoice.invoiceNumber || invoice.id}.pdf`}
      style={asButton ? { textDecoration: 'none', width: '100%' } : undefined}
    >
      {({ loading }) =>
        asButton ? (
          <Button color="primary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} disabled={loading} sx={railBtnSx}>
            {loading ? 'Preparing PDF…' : label}
          </Button>
        ) : loading ? (
          'Preparing…'
        ) : (
          label
        )
      }
    </PDFDownloadLink>
  );

  const versionLabel = current ? `v${invoiceVersionOf(current) ?? ''}` : '—';
  const badge = status === 'PAID' ? 'check' : status === 'ISSUED' ? 'paper' : null;
  const statusPane = current ? (
    <StatusPaneHeader
      status={invoiceStatusLabel(status!)}
      reference={invoiceTitle(current)}
      description={
        status === 'PAID'
          ? 'Paid · the payments recorded on this job cover this invoice'
          : `${balanceHeading(current.balanceDue)} ${formatMoney(Math.abs(Number(current.balanceDue) || 0))}${dueDateLabel(current.dueDate) ? ` · ${dueDateLabel(current.dueDate)}` : ''}`
      }
    >
      {status !== 'PAID' && Number(current.deposit?.outstanding) > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {depositSummary(current.deposit)}
        </Typography>
      )}
    </StatusPaneHeader>
  ) : invoices.length > 0 ? (
    <StatusPaneHeader status="No invoice stands" description="The last invoice was voided. Nothing is payable until a new version is issued." />
  ) : (
    <StatusPaneHeader
      status="No invoice yet"
      description={staffView ? 'Issue one once the Statement of Work is countersigned.' : 'The lab has not invoiced this job yet. It appears here when they do.'}
    />
  );

  const chargesRefused = charges.length === 0 && !!chargesQuery.error && isPermissionError(chargesQuery.error);

  return (
    <>
      <ProcessCard
        title="Invoice"
        defaultExpanded={invoices.length > 0}
        customerBadge={badge}
        staffBadge={badge}
        customerVersion={versionLabel}
        staffVersion={versionLabel}
        statusPaneSx={{ bgcolor: chipStatusBackground(status === 'PAID' ? 'success' : status === 'ISSUED' ? 'info' : 'default') }}
        statusPane={statusPane}
        actions={
          <>
            {staffView && (
              <Can permission={PERMISSIONS.BillingWrite}>
                <Tooltip title={issueBlockedReason ?? ''} disableHoverListener={!issueBlockedReason}>
                  {/* A span, because MUI cannot attach a tooltip to a disabled button. */}
                  <span style={{ display: 'block' }}>
                    <Button variant="contained" size="small" startIcon={<ReceiptLongIcon />} disabled={!jobId || !!issueBlockedReason} onClick={openIssue} sx={railBtnSx}>
                      {current ? 'Issue new version' : 'Issue invoice'}
                    </Button>
                  </span>
                </Tooltip>
                {issueBlockedReason && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {issueBlockedReason}
                  </Typography>
                )}
              </Can>
            )}
            {current ? (
              pdfLink(current, 'Download PDF', true)
            ) : (
              <Button color="secondary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} disabled sx={railBtnSx}>
                Download PDF
              </Button>
            )}
            {staffView && current && (
              <Can permission={PERMISSIONS.BillingWrite}>
                <Button color="warning" size="small" variant="outlined" startIcon={<CancelIcon />} disabled={voiding} onClick={() => setVoidTarget(current)} sx={railBtnSx}>
                  Void invoice
                </Button>
              </Can>
            )}
          </>
        }
        details={
          <>
            {invoicesQuery.error && !invoicesQuery.data ? (
              <Alert severity="error">{formatGqlError(invoicesQuery.error, 'Could not load the invoices.')}</Alert>
            ) : current ? (
              <InvoiceView invoice={current} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {invoices.length > 0 ? 'No invoice stands on this job right now.' : 'No invoice has been issued for this job yet.'}
              </Typography>
            )}

            {history.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2">Earlier versions</Typography>
                <List dense>
                  {history.map((inv) => {
                    const rowStatus = invoiceStatusOf(inv);
                    return (
                      <ListItem
                        key={inv.id}
                        sx={{ pl: 0 }}
                        secondaryAction={
                          <Button size="small" onClick={() => setViewing(inv)}>
                            View
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Box component="span">{invoiceTitle(inv)}</Box>
                              <Chip size="small" label={invoiceStatusLabel(rowStatus)} color={invoiceStatusChipColor(rowStatus)} variant="outlined" />
                              {isLegacyInvoice(inv) && <Chip size="small" variant="outlined" label="Legacy" />}
                            </Box>
                          }
                          secondary={
                            <>
                              {`Issued ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ''} · ${formatMoney(inv.totalCost)} · `}
                              {pdfLink(inv, 'PDF', false)}
                              {rowStatus === 'VOID' && (
                                <Typography component="span" variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                                  {`VOID — ${inv.voidReason || 'no reason recorded'}`}
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}

            {!chargesRefused && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Charges on the job
                </Typography>
                {charges.length === 0 ? (
                  chargesQuery.loading ? null : chargesQuery.error ? (
                    <Alert severity="error">{formatGqlError(chargesQuery.error, 'Could not load the charges.')}</Alert>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No custom charges, discounts or deposit on this job.
                    </Typography>
                  )
                ) : (
                  <List dense>
                    {sortChargesForDisplay(charges).map((c: any) => {
                      const voided = !!c.voidedAt;
                      return (
                        <ListItem
                          key={c.id}
                          sx={{ pl: 0, opacity: voided ? 0.6 : 1 }}
                          secondaryAction={
                            staffView && !voided ? (
                              <Can permission={PERMISSIONS.BillingWrite}>
                                <Tooltip title="Void this charge">
                                  <IconButton size="small" color="warning" disabled={voidingCharge} onClick={() => setChargeVoidTarget({ id: String(c.id), label: String(c.label ?? '') })}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Can>
                            ) : null
                          }
                        >
                          <ListItemText
                            slotProps={voided ? { primary: { sx: { textDecoration: 'line-through' } } } : undefined}
                            primary={`${chargeKindLabel(c.kind)} · ${c.label} · ${signedMoney(c.amount)}${c.kind === 'DEPOSIT' && dueDateLabel(c.dueDate) ? ` · ${dueDateLabel(c.dueDate)}` : ''}`}
                            secondary={
                              c.note || voided ? (
                                <>
                                  {/* `component="span"`: `secondary` renders inside a <p>. */}
                                  {c.note && (
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {c.note}
                                    </Typography>
                                  )}
                                  {voided && (
                                    <Typography component="span" variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                                      {`VOID — ${c.voidReason || 'no reason recorded'}`}
                                    </Typography>
                                  )}
                                </>
                              ) : undefined
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>
            )}
          </>
        }
      />

      {staffView && (
        <IssueInvoiceDialog
          open={issueOpen}
          busy={issuing}
          error={issueError}
          supersedes={current ? invoiceTitle(current) : null}
          balance={balance}
          balanceLoading={balanceQuery.loading}
          balanceError={balanceQuery.error}
          existingCustom={existingCustom}
          existingDeposit={existingDeposit}
          customLines={customLines}
          onCustomLines={setCustomLines}
          deposit={deposit}
          onDeposit={setDeposit}
          dueDate={dueDate}
          onDueDate={setDueDate}
          documentStale={documentStale}
          onCancel={() => setIssueOpen(false)}
          onConfirm={submitIssue}
        />
      )}

      {voidTarget && (
        <ReasonDialog
          open
          title={`Void ${invoiceTitle(voidTarget)}?`}
          warning={
            'The invoice is kept and keeps its number — nothing is deleted. Nothing else changes: the job’s charges and payments stay, and no invoice stands until you issue a new version.\n\n' +
            'The client sees it marked VOID, and the reason you give below is printed on it.'
          }
          confirmLabel="Void invoice"
          busy={voiding}
          onCancel={() => setVoidTarget(null)}
          onConfirm={submitVoidInvoice}
        />
      )}

      {chargeVoidTarget && (
        <ReasonDialog
          open
          title={`Void the ${chargeVoidTarget.label} charge?`}
          warning={
            'The charge is kept and shown struck through with your reason.\n\n' + 'The current invoice is not changed — issue a new version to restate the job without it.'
          }
          confirmLabel="Void charge"
          busy={voidingCharge}
          onCancel={() => setChargeVoidTarget(null)}
          onConfirm={submitVoidCharge}
        />
      )}

      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md" fullWidth>
        <DialogContent>{viewing && <InvoiceView invoice={viewing} />}</DialogContent>
        <DialogActions>
          {viewing && pdfLink(viewing, 'Download PDF', false)}
          <Button onClick={() => setViewing(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
