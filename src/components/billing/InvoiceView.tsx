import React from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import {
  buildStatementTotals,
  dueDateLabel,
  dueRows,
  equipmentEstimateNote,
  equipmentFormula,
  formatMoney,
  invoiceKindOf,
  invoiceStatusChipColor,
  invoiceStatusLabel,
  invoiceStatusOf,
  invoiceTitle,
  paymentLineLabel,
  pricingDetailLines,
  serviceFormula,
  shortDate,
  signedMoney
} from '../../utils/equipmentBilling';

/**
 * One line of the invoice: what it is on the left, the figure on the right.
 * Every row — lines, payments and totals alike — is this, so the invoice has
 * exactly one right edge.
 */
function Line({ label, details = [], amount, strong = false, divider = true }: { label: string; details?: Array<string | null | undefined>; amount: string; strong?: boolean; divider?: boolean }): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, py: 0.75, borderBottom: divider ? 1 : 0, borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={strong ? 600 : 400}>
          {label}
        </Typography>
        {details.filter(Boolean).map((detail, i) => (
          <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {detail}
          </Typography>
        ))}
      </Box>
      <Typography variant="body2" fontWeight={strong ? 600 : 400} sx={{ whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {amount}
      </Typography>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2">{title}</Typography>
      {children}
    </Box>
  );
}

/**
 * An invoice, rendered in the page — the same figures the PDF prints, so the
 * download is a copy of what is on screen rather than the only way to read it.
 *
 * Reads the invoice's own snapshot and nothing live: a version states the job
 * as it stood when it was issued. `preview` is the issue dialog's not-yet-issued
 * version, which has no status to announce yet.
 */
export default function InvoiceView({ invoice, preview = false }: { invoice: any; preview?: boolean }): React.JSX.Element {
  const status = invoiceStatusOf(invoice);
  const isStatement = invoiceKindOf(invoice) === 'STATEMENT';
  const services: any[] = invoice?.services ?? [];
  const adjustments: any[] = (invoice?.adjustments ?? []).filter((a: any) => Number(a?.appliedAmount) !== 0);
  const equipment: any[] = invoice?.equipmentLines ?? [];
  const custom: any[] = invoice?.customLines ?? [];
  const payments: any[] = invoice?.payments ?? [];
  const totals = isStatement ? buildStatementTotals(invoice) : [{ label: 'Total', amount: formatMoney(invoice?.totalCost) }];
  const due = isStatement ? dueRows(invoice) : [];
  const deposit = invoice?.deposit ?? null;
  const depositOutstanding = Number(deposit?.outstanding) || 0;
  const replacedBy = invoice?.supersededByNumber ? invoiceTitle({ jobDisplayId: invoice?.jobDisplayId, invoiceNumber: invoice.supersededByNumber }) : 'a newer version';

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" fontWeight={600}>
          {invoiceTitle(invoice)}
        </Typography>
        {preview ? (
          <Chip size="small" variant="outlined" label={status === 'PAID' ? 'Preview · will show as Paid' : 'Preview'} color={status === 'PAID' ? 'success' : 'default'} />
        ) : (
          <Chip size="small" label={invoiceStatusLabel(status)} color={invoiceStatusChipColor(status)} variant={status === 'SUPERSEDED' ? 'outlined' : 'filled'} />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {[preview ? 'Not issued yet' : `Issued ${shortDate(invoice?.invoiceDate)}`, invoice?.billedToName ? `Billed to ${invoice.billedToName}` : ''].filter(Boolean).join(' · ')}
      </Typography>

      {!preview && status === 'VOID' && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {`Void — this invoice is not payable.${invoice?.voidReason ? ` ${invoice.voidReason}` : ''}`}
        </Alert>
      )}
      {!preview && status === 'SUPERSEDED' && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {`Superseded by ${replacedBy}${invoice?.supersededAt ? ` on ${shortDate(invoice.supersededAt)}` : ''}. Kept for the record; not payable.`}
        </Alert>
      )}
      {!preview && status === 'PAID' && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Paid — the payments recorded on this job cover this invoice.
        </Alert>
      )}

      {deposit && (
        <Box sx={{ mt: 2, px: 1.5, py: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
          <Line
            label={deposit.label || 'Deposit'}
            details={[
              [dueDateLabel(deposit.dueDate), depositOutstanding > 0 ? `${formatMoney(depositOutstanding)} outstanding` : 'Covered by the payments received'].filter(Boolean).join(' · '),
              'Part of the total below, asked for by its own date — not in addition to it.'
            ]}
            amount={formatMoney(deposit.amount)}
            divider={false}
          />
        </Box>
      )}

      {(services.length > 0 || adjustments.length > 0) && (
        // "Operations", the app's word for services. Said outright rather than
        // left to the page-wide text rewrite in entry.client.tsx, which does not
        // reach the issue dialog's portal.
        <Section title="Operations">
          {services.map((s: any, i: number) => (
            <Line
              key={`svc-${i}`}
              label={s.name}
              details={[[s.category, s.description].filter(Boolean).join(' · '), ...pricingDetailLines(s), equipmentEstimateNote(s.description)]}
              amount={serviceFormula(s)}
            />
          ))}
          {adjustments.map((a: any, i: number) => (
            <Line key={`adj-${i}`} label={a.description || (a.type === 'DISCOUNT' ? 'Discount' : 'Additional cost')} details={[a.reason]} amount={signedMoney(a.appliedAmount)} />
          ))}
        </Section>
      )}

      {equipment.length > 0 && (
        <Section title="Equipment usage">
          {equipment.map((line: any, i: number) => (
            <Line key={line.bookingId || i} label={[line.itemName ?? 'Equipment', shortDate(line.startTime)].filter(Boolean).join(' · ')} details={[line.operationLabel]} amount={equipmentFormula(line)} />
          ))}
        </Section>
      )}

      {custom.length > 0 && (
        <Section title="Other charges and discounts">
          {custom.map((line: any, i: number) => (
            <Line key={line.chargeId || i} label={line.label} details={[line.note]} amount={signedMoney(line.amount)} />
          ))}
        </Section>
      )}

      {payments.length > 0 && (
        <Section title="Payments">
          {payments.map((payment: any, i: number) => (
            <Line key={payment.paymentId || i} label={paymentLineLabel(payment)} amount={`-${formatMoney(payment.amount)}`} />
          ))}
        </Section>
      )}

      <Box sx={{ mt: 1.5, ml: 'auto', maxWidth: 360, borderTop: 2, borderColor: 'divider' }}>
        {totals.map((row, i) => (
          <Line key={row.label} label={row.label} amount={row.amount} strong={i === totals.length - 1} divider={false} />
        ))}
      </Box>

      {due.length > 0 && (
        <Section title="When it is due">
          {due.map((row, i) => (
            <Line key={i} label={[dueDateLabel(row.dueDate) || 'No date given', row.label].filter(Boolean).join(' · ')} amount={formatMoney(row.amount)} />
          ))}
        </Section>
      )}
    </Box>
  );
}
