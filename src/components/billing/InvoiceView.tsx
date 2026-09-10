import React from 'react';
import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import {
  buildStatementTotals,
  depositSummary,
  dueDateLabel,
  formatHours,
  formatMoney,
  invoiceKindOf,
  invoiceStatusChipColor,
  invoiceStatusLabel,
  invoiceStatusOf,
  invoiceTitle
} from '../../utils/equipmentBilling';

/** A signed amount: a discount prints "-$50.00", never "$-50.00". */
function signedMoney(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return value < 0 ? `-${formatMoney(Math.abs(value))}` : formatMoney(value);
}

function dateOnly(value: unknown): string {
  if (!value) return '';
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

const moneyCell = { whiteSpace: 'nowrap' as const, width: 120 };

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>{children}</Box>
    </Box>
  );
}

/**
 * An invoice, rendered in the page — the same figures the PDF prints, so the
 * download is a copy of what is on screen rather than the only way to read it.
 *
 * Reads the invoice's own snapshot and nothing live: a version states the job
 * as it stood when it was issued.
 */
export default function InvoiceView({ invoice }: { invoice: any }): React.JSX.Element {
  const status = invoiceStatusOf(invoice);
  const isStatement = invoiceKindOf(invoice) === 'STATEMENT';
  const services: any[] = invoice?.services ?? [];
  const adjustments: any[] = (invoice?.adjustments ?? []).filter((a: any) => Number(a?.appliedAmount) !== 0);
  const equipment: any[] = invoice?.equipmentLines ?? [];
  const custom: any[] = invoice?.customLines ?? [];
  const totals = isStatement ? buildStatementTotals(invoice) : [{ label: 'Total', amount: formatMoney(invoice?.totalCost) }];
  const replacedBy = invoice?.supersededByNumber ? invoiceTitle({ jobDisplayId: invoice?.jobDisplayId, invoiceNumber: invoice.supersededByNumber }) : 'a newer version';

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" fontWeight={600}>
          {invoiceTitle(invoice)}
        </Typography>
        <Chip size="small" label={invoiceStatusLabel(status)} color={invoiceStatusChipColor(status)} variant={status === 'SUPERSEDED' ? 'outlined' : 'filled'} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {[`Issued ${dateOnly(invoice?.invoiceDate)}`, dueDateLabel(invoice?.dueDate), invoice?.billedToName ? `Billed to ${invoice.billedToName}` : ''].filter(Boolean).join(' · ')}
      </Typography>

      {status === 'VOID' && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {`Void — this invoice is not payable.${invoice?.voidReason ? ` ${invoice.voidReason}` : ''}`}
        </Alert>
      )}
      {status === 'SUPERSEDED' && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {`Superseded by ${replacedBy}${invoice?.supersededAt ? ` on ${dateOnly(invoice.supersededAt)}` : ''}. Kept for the record; not payable.`}
        </Alert>
      )}
      {status === 'PAID' && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Paid — the payments recorded on this job cover this invoice.
        </Alert>
      )}

      {(services.length > 0 || adjustments.length > 0) && (
        <Section title="Services">
          <Table size="small">
            <TableBody>
              {services.map((s: any, i: number) => (
                <TableRow key={`svc-${i}`}>
                  <TableCell>
                    <Typography variant="body2">{s.name}</Typography>
                    {(s.category || s.description) && (
                      <Typography variant="caption" color="text.secondary">
                        {[s.category, s.description].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={moneyCell}>
                    {formatMoney(s.cost)}
                  </TableCell>
                </TableRow>
              ))}
              {adjustments.map((a: any, i: number) => (
                <TableRow key={`adj-${i}`}>
                  <TableCell>
                    <Typography variant="body2">{a.description || (a.type === 'DISCOUNT' ? 'Discount' : 'Additional cost')}</Typography>
                    {a.reason && (
                      <Typography variant="caption" color="text.secondary">
                        {a.reason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={moneyCell}>
                    {signedMoney(a.appliedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {equipment.length > 0 && (
        <Section title="Equipment usage">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Equipment</TableCell>
                <TableCell>Used</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right" sx={moneyCell}>
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {equipment.map((line: any, i: number) => (
                <TableRow key={line.bookingId || i}>
                  <TableCell>
                    <Typography variant="body2">{line.itemName ?? 'Equipment'}</Typography>
                    {line.operationLabel && (
                      <Typography variant="caption" color="text.secondary">
                        {line.operationLabel}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateOnly(line.startTime)}</TableCell>
                  <TableCell align="right">{line.actualHours != null ? formatHours(line.actualHours) : ''}</TableCell>
                  <TableCell align="right">{line.rate != null ? formatMoney(line.rate) : ''}</TableCell>
                  <TableCell align="right" sx={moneyCell}>
                    {formatMoney(line.cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {custom.length > 0 && (
        <Section title="Other charges and discounts">
          <Table size="small">
            <TableBody>
              {custom.map((line: any, i: number) => (
                <TableRow key={line.chargeId || i}>
                  <TableCell>
                    <Typography variant="body2">{line.label}</Typography>
                    {line.note && (
                      <Typography variant="caption" color="text.secondary">
                        {line.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={moneyCell}>
                    {signedMoney(line.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
        {totals.map((row, i) => (
          <Box key={row.label} sx={{ display: 'flex', gap: 3, minWidth: 260, justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight={i === totals.length - 1 ? 600 : 400}>
              {row.label}
            </Typography>
            <Typography variant="body2" fontWeight={i === totals.length - 1 ? 600 : 400}>
              {row.amount}
            </Typography>
          </Box>
        ))}
      </Box>

      {invoice?.deposit && (
        <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2">Deposit</Typography>
          <Typography variant="body2">{depositSummary(invoice.deposit)}</Typography>
          <Typography variant="caption" color="text.secondary">
            Part of the total above, asked for by its own date — not in addition to it.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
