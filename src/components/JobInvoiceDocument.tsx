import React from 'react';
import { Document, Page, StyleSheet, View, Text, Image, Font } from '@react-pdf/renderer';
import type { SOWData } from '../types/SOWTypes';
import { RUN_COUNT_PARAM_NAME } from '../utils/servicePricing';
import type { CustomerCategory } from '../utils/customerCategory';

Font.register({ family: 'Courier-New', fonts: [{ src: '/fonts/Courier-New.ttf' }] });

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Courier-New',
    fontSize: 10,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerRight: {
    width: 160,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    // react-pdf doesn't reliably support `gap`, so we use margins on images instead.
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 6,
  },
  /**
   * The VOID treatment. Deliberately three signals, not one: a diagonal watermark
   * across the page, a banner in the flow, and the reason in words. A voided
   * invoice remains downloadable so a client can retrieve the copy they were sent,
   * which makes "obviously not payable" the whole job of this styling — and colour
   * alone would not survive a greyscale print.
   */
  voidWatermark: {
    position: 'absolute',
    top: 300,
    left: 60,
    fontSize: 90,
    fontWeight: 800,
    color: '#d32f2f',
    opacity: 0.16,
    transform: 'rotate(-30deg)',
  },
  voidBanner: {
    borderWidth: 2,
    borderColor: '#d32f2f',
    padding: 6,
    marginBottom: 10,
  },
  voidBannerTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#d32f2f',
    marginBottom: 2,
  },
  monoBold: {
    fontWeight: 800,
  },
  block: {
    marginBottom: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginVertical: 10,
  },
  sowLine: {
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 6,
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: {
    marginBottom: 2,
  },
  strong: { fontWeight: 800 },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 6,
    paddingTop: 2,
    marginTop: 6,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    width: '100%',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  /** Fixed-width cells + gutter; row alignItems:center vertically centers shorter cells vs tall pricing blocks. */
  cellDate: {
    width: 52,
    marginRight: 6,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'center',
  },
  /** Service name + description stacked (reads top-to-bottom). */
  cellService: {
    width: 168,
    marginRight: 6,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 8,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 2,
    width: '100%',
  },
  serviceMeta: {
    fontSize: 7,
    lineHeight: 1.25,
    color: '#333333',
    width: '100%',
  },
  cellPricing: {
    width: 168,
    marginRight: 6,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'center',
  },
  cellRate: {
    width: 54,
    marginRight: 6,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cellAmount: {
    width: 60,
    flexShrink: 0,
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cellText: {
    fontSize: 8,
    lineHeight: 1.2,
  },
  cellTextHeader: {
    fontSize: 8,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  cellTextHeaderRight: {
    fontSize: 8,
    fontWeight: 800,
    lineHeight: 1.2,
    textAlign: 'right',
    width: '100%',
  },
  cellTextRight: {
    fontSize: 8,
    lineHeight: 1.2,
    textAlign: 'right',
    width: '100%',
  },
  pricingLine: {
    fontSize: 7,
    marginBottom: 2,
    lineHeight: 1.25,
    width: '100%',
  },
  pricingLineLast: {
    fontSize: 7,
    lineHeight: 1.25,
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  note: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
});

function safeParseISODate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoStringSafe(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  return null;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatMMDDYYYY(d: Date): string {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

function formatCurrency(n: number): string {
  // react-pdf doesn't support full Intl formatting reliably in all environments;
  // keep it deterministic.
  const fixed = Number(n || 0).toFixed(2);
  return `$${fixed}`;
}

// BU fiscal year: FY runs July 1 - June 30 (common convention). Adjust if your org uses a different definition.
function getFYShort(startDate: Date): string {
  const year = startDate.getFullYear();
  const month = startDate.getMonth(); // 0..11
  const fiscalYear = month >= 6 ? year + 1 : year;
  return `FY${pad2(fiscalYear % 100)}`;
}

function getInvoiceNumber(jobId: string): string {
  if (typeof window === 'undefined') return '001';
  const mapKey = 'damplab-invoice-by-job';
  const counterKey = 'damplab-invoice-counter';
  try {
    const rawMap = localStorage.getItem(mapKey);
    const map = rawMap ? (JSON.parse(rawMap) as Record<string, string>) : {};
    if (map[jobId]) return map[jobId];
    const rawCounter = localStorage.getItem(counterKey);
    const next = (rawCounter ? Number(rawCounter) : 0) + 1;
    localStorage.setItem(counterKey, String(next));
    const invoiceNo = `0${String(next).padStart(2, '0')}`; // e.g. 001, 002, ...
    map[jobId] = invoiceNo;
    localStorage.setItem(mapKey, JSON.stringify(map));
    return invoiceNo;
  } catch {
    return '001';
  }
}

function splitAddressLines(addr: string | undefined | null): { line1: string; line2: string } {
  const cleaned = (addr ?? '').toString().trim();
  if (!cleaned) return { line1: '', line2: '' };
  const parts = cleaned.split(/\r?\n|,/).map((p) => p.trim()).filter(Boolean);
  return { line1: parts[0] ?? '', line2: parts.slice(1).join(', ') };
}

/**
 * The line's pricing basis, worded exactly as the SOW's Fee Schedule words it.
 *
 * The two documents describe the same figures, so they have to describe them the
 * same way: buildFeeSchedule (damplab-backend/src/sow/sow-field-calculator.ts)
 * prints "$50.00 x 4 = $200.00" and itemises a parameter-priced line beneath it,
 * and so does this.
 */
/**
 * What the VOID banner says, as text.
 *
 * Extracted so it can be tested: react-pdf primitives do not render under the unit
 * suite, and a voided invoice stays downloadable, so "does this document actually
 * say it is void" is the one thing about it worth pinning.
 *
 * Returns null when the invoice is live — the caller renders nothing at all then,
 * rather than an empty banner.
 */
export function buildVoidNotice(invoice: { voidedAt?: string | Date | null; voidedBy?: string | null; voidReason?: string | null } | null | undefined): { title: string; attribution: string; reason: string } | null {
  if (!invoice?.voidedAt) return null;
  const at = safeParseISODate(toIsoStringSafe(invoice.voidedAt));
  const by = invoice.voidedBy?.trim();
  return {
    title: 'VOID — THIS INVOICE IS NOT PAYABLE',
    attribution: `Voided${at ? ` on ${formatMMDDYYYY(at)}` : ''}${by ? ` by ${by}` : ''}.`,
    // Never blank: an unexplained VOID reads as a rendering fault rather than a
    // decision. The mutation requires a reason, so this only covers legacy rows.
    reason: `Reason: ${invoice.voidReason?.trim() || 'not recorded'}`
  };
}

/**
 * The lines and the money an invoice prints — from the invoice, and only the invoice.
 *
 * This used to fall back to `sow.services` when the invoice carried none, and the
 * fallback fed the totals rather than merely the line list: a document that took it
 * printed the SOW's raw line sum with **every adjustment dropped**, i.e. a total
 * with the discount silently removed. All four call sites sit inside
 * `invoices.length` guards, but a legacy invoice with an empty `services` array
 * reaches it, and that is the document where being wrong matters most.
 *
 * `subtotal` and `totalCost` still fall back to the line sum, because invoices
 * generated before adjustments were carried across genuinely have neither — that
 * fallback stays within the invoice's own figures, which is the difference.
 */
export function invoiceMoney(invoice: { services?: unknown[] | null; subtotal?: number | null; totalCost?: number | null } | null | undefined): {
  services: any[];
  lineItemSum: number;
  subtotal: number;
  total: number;
} {
  const services = (invoice?.services ?? []) as any[];
  const lineItemSum = services.reduce((sum, s) => sum + (Number((s as any)?.cost) || 0), 0);
  return {
    services,
    lineItemSum,
    subtotal: invoice?.subtotal != null ? Number(invoice.subtotal) : lineItemSum,
    total: invoice?.totalCost != null ? Number(invoice.totalCost) : lineItemSum
  };
}

/**
 * Which customer category an invoice was billed under.
 *
 * The invoice's own frozen record wins; the live job is only the fallback, for
 * invoices written before the backend recorded this. Exported so the choice is
 * testable — it decides INTERNAL vs EXTERNAL in the header and which payment
 * instructions print, which is the part a re-categorised job used to get wrong.
 */
export function billedCustomerCategory(
  invoice: { customerCategory?: string | null } | null | undefined,
  liveJobCategory: string | null | undefined
): string | null {
  const frozen = invoice?.customerCategory?.trim();
  if (frozen) return frozen;
  return liveJobCategory?.trim() || null;
}

export function buildInvoicePricingNote(row: any): string {
  const lines: string[] = [];

  // What the unit price was made of, for a parameter-priced line.
  //
  // The multiplier form below is suppressed at a multiplier of 1, which is the
  // normal case for a service priced off its selected options — so such a line
  // printed its total and nothing else, and the customer could not see what they
  // were being billed for. These rows say the same thing the SOW's Fee Schedule
  // now says, in the same order.
  const details = Array.isArray(row?.pricingDetails) ? row.pricingDetails : [];
  for (const detail of details) {
    const label = String(detail?.label ?? '').trim();
    if (!label) continue;
    lines.push(`${label} — ${formatMultiplier(Number(detail?.quantity) || 0)} x ${formatCurrency(Number(detail?.unitPrice) || 0)} = ${formatCurrency(Number(detail?.total) || 0)}`);
  }

  // The null guard is the important half. `unitCost` and `multiplier` are optional
  // on both the SOW line and the invoice line — absent on anything written before
  // unit prices were recorded — and a unit price of 0 is legitimate, so "absent"
  // and "free" must stay distinguishable. A line with no breakdown quotes its
  // total and says nothing more, rather than deriving a unit price by dividing and
  // inventing a figure no document ever stated.
  const unitCost = row?.unitCost;
  const multiplier = Number(row?.multiplier);
  if (unitCost != null && Number.isFinite(multiplier) && multiplier !== 1) {
    lines.push(`${formatCurrency(Number(unitCost))} x ${formatMultiplier(multiplier)} = ${formatCurrency(Number(row?.cost) || 0)}`);
    // The run count is the commonest multiplier by far, and naming it is the
    // difference between "x 4" and "x 4 runs".
    const runCount = Number(row?.runCount);
    if (Number.isFinite(runCount) && runCount > 1) lines.push(`${RUN_COUNT_PARAM_NAME}: ${runCount}`);
  }

  return lines.join('\n');
}

/** Trailing zeros off a multiplier, so "x 4" does not print as "x 4.00". */
function formatMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

export interface JobInvoiceDocumentProps {
  jobId: string;
  jobDisplayId?: string | null;
  jobName: string;
  customerCategory?: CustomerCategory | null;
  /**
   * The Statement of Work, for context this invoice does not carry itself:
   * `timeline.startDate` (the fiscal-year label) and the bill-to fallbacks.
   *
   * **Never for line items or money.** The invoice is the record of what was
   * billed; reading figures from the live SOW here is what printed a total with
   * no adjustments applied.
   */
  sow: SOWData | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate?: string | Date | null;
    jobDisplayId?: string | null;
    services: Array<{
      serviceId?: string | null;
      name: string;
      description?: string | null;
      cost: number;
      category?: string | null;
      /** How the unit price was arrived at, for a parameter-priced line. */
      pricingDetails?: Array<{ label: string; quantity: number; unitPrice: number; total: number }> | null;
    }>;
    subtotal?: number | null;
    adjustments?: Array<{
      type?: string | null;
      description?: string | null;
      reason?: string | null;
      amount?: number | null;
      appliedAmount?: number | null;
      prorationFactor?: number | null;
    }> | null;
    totalCost?: number | null;
    billedToName?: string | null;
    billedToEmail?: string | null;
    billedToAddress?: string | null;
    /**
     * Set once the invoice has been voided. Voiding never deletes the document —
     * invoice numbers are derived from a per-job count — and the copy already sent
     * to a client stays downloadable, so this file has to say so unmistakably.
     */
    voidedAt?: string | Date | null;
    voidedBy?: string | null;
    voidReason?: string | null;
    /**
     * The category these lines were BILLED under, frozen at generation. Preferred
     * over the `customerCategory` prop, which every call site fills from the *live*
     * job — so re-categorising a job used to rewrite the header and the payment
     * instructions on invoices already issued under the old category.
     */
    customerCategory?: string | null;
  } | null;
}

const JobInvoiceDocument: React.FC<JobInvoiceDocumentProps> = ({ jobId, jobDisplayId: jobDisplayIdProp, jobName, customerCategory, sow, invoice }) => {
  const invoiceDate = safeParseISODate(toIsoStringSafe(invoice?.invoiceDate)) ?? new Date();
  const invoiceNo = invoice?.invoiceNumber ?? getInvoiceNumber(jobId);
  const invoiceId = invoice?.id ?? '';

  const startDate = safeParseISODate(sow?.timeline?.startDate) ?? invoiceDate;
  const fyShort = getFYShort(startDate);

  const jobDisplayId = invoice?.jobDisplayId ?? jobDisplayIdProp ?? jobId;
  const billedToName = invoice?.billedToName ?? sow?.clientName ?? 'Client';
  const billedToEmail = invoice?.billedToEmail ?? sow?.clientEmail ?? '';
  const { line1, line2 } = splitAddressLines(invoice?.billedToAddress ?? sow?.clientAddress ?? '');

  const { services, subtotal } = invoiceMoney(invoice);
  // Only adjustments that actually move money get a row; SPECIAL_TERM is a note
  // (appliedAmount 0) and is listed separately below the total.
  const allAdjustments = Array.isArray(invoice?.adjustments) ? invoice!.adjustments! : [];
  const monetaryAdjustments = allAdjustments.filter((a) => Number(a?.appliedAmount) !== 0);
  const noteAdjustments = allAdjustments.filter((a) => Number(a?.appliedAmount) === 0 && (a?.description || a?.reason));
  const invoiceTotal = invoiceMoney(invoice).total;
  // True when the adjustment was scaled because this invoice covers only part of the job.
  const isProrated = monetaryAdjustments.some((a) => {
    const f = Number(a?.prorationFactor);
    return Number.isFinite(f) && f > 0 && f < 0.999;
  });

  /**
   * The invoice's own record first, the live job only as a fallback.
   *
   * This is not cosmetic. It decides INTERNAL vs EXTERNAL in the header and which
   * payment block prints — an internal ISR or an external remittance address — so
   * reading the live job made a re-categorised job reprint an old invoice telling
   * an external customer to file an internal ISR. The prop stays as the fallback
   * for invoices written before the backend started recording this.
   */
  const billedCategory = billedCustomerCategory(invoice, customerCategory) as CustomerCategory | null;
  const isInternal = billedCategory === 'INTERNAL_CUSTOMERS';
  const getCustomerCategoryLabel = (category?: JobInvoiceDocumentProps['customerCategory']): string => {
    switch (category) {
      case 'INTERNAL_CUSTOMERS':
        return 'Internal customers';
      case 'EXTERNAL_CUSTOMER_ACADEMIC':
        return 'External (Academic)';
      case 'EXTERNAL_CUSTOMER_MARKET':
        return 'External (Market)';
      case 'EXTERNAL_CUSTOMER_NO_SALARY':
        return 'External (No salary)';
      default:
        return 'Customer category';
    }
  };
  const pricingCategoryLabel = getCustomerCategoryLabel(billedCategory);

  const voidNotice = buildVoidNotice(invoice);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {voidNotice && <Text style={styles.voidWatermark} fixed>VOID</Text>}
        {voidNotice && (
          <View style={styles.voidBanner}>
            <Text style={styles.voidBannerTitle}>{voidNotice.title}</Text>
            <Text style={styles.text}>{voidNotice.attribution}</Text>
            <Text style={styles.text}>{voidNotice.reason}</Text>
          </View>
        )}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{isInternal ? 'INTERNAL INVOICE' : 'EXTERNAL INVOICE'}</Text>
            <Text style={styles.monoBold}>(Internal) Boston University - DAMP Lab</Text>
            <Text>{'damplab@bu.edu'}</Text>
            <Text>{'610 Commonwealth Ave'}</Text>
            <Text>{'Boston, MA 02215'}</Text>
            <Text>{'damplab.org'}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source="/BU-Logo-Sow.png" style={{ width: 58, height: 58, marginRight: 6 }} />
            <Image source="/Damplab-logo-Sow.png" style={{ width: 70, height: 36 }} />
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sowLine}>
            {'Job #'}{jobDisplayId} {' | '}{jobName}
          </Text>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.strong}>Billed to:</Text>
              <Text style={styles.text}>{billedToName}</Text>
              <Text style={styles.text}>{billedToEmail}</Text>
              <Text style={styles.text}>{line1}</Text>
              {line2 ? <Text style={styles.text}>{line2}</Text> : null}
            </View>

            <View style={{ width: 200 }}>
              <Text style={styles.strong}>Invoice no.: {invoiceNo}</Text>
              <Text style={styles.text}>Job ID: {jobDisplayId}</Text>
              <Text style={styles.text}>Terms: Net 30</Text>
              <Text style={styles.text}>Invoice date: {formatMMDDYYYY(invoiceDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.strong}>Invoice Details:</Text>
          {isInternal ? (
            <View>
              <Text style={styles.text}>If Client is internal: Please submit an ISR to DAMP Lab North (provider #00521)</Text>
              <Text style={styles.text}>Include the invoice number in the ISR Notepad and line-item description</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.text}>If client is external:</Text>
              <Text style={styles.text}>Please see invoice attached below. If you like to pay by check please send checks to:</Text>
              <Text style={styles.text}>Boston University</Text>
              <Text style={styles.text}>Miscellaneous Receivables</Text>
              <Text style={styles.text}>P.O. Box 28770</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.cellDate}>
              <Text style={styles.cellTextHeader} wrap>
                Date
              </Text>
            </View>
            <View style={styles.cellService}>
              <Text style={styles.cellTextHeader} wrap>
                Service
              </Text>
              <Text style={[styles.cellText, { marginTop: 3 }]} wrap>
                Description
              </Text>
            </View>
            <View style={styles.cellPricing}>
              <Text style={styles.cellTextHeader} wrap>
                Pricing details
              </Text>
            </View>
            <View style={styles.cellRate}>
              <Text style={styles.cellTextHeaderRight} wrap>
                Rate
              </Text>
            </View>
            <View style={styles.cellAmount}>
              <Text style={styles.cellTextHeaderRight} wrap>
                Amount
              </Text>
            </View>
          </View>

          {services.map((s, idx) => {
            const row = s;
            const rate = Number(row.cost) || 0;
            const amount = rate;
            const pricingNote = buildInvoicePricingNote(row);
            return (
              <View key={row.serviceId || row.id || idx} style={styles.row}>
                <View style={styles.cellDate}>
                  <Text style={styles.cellText} wrap>
                    {formatMMDDYYYY(invoiceDate)}
                  </Text>
                </View>
                <View style={styles.cellService}>
                  <Text style={styles.serviceName} wrap>
                    {row.name}
                  </Text>
                  <Text style={styles.serviceMeta} wrap>
                    {row.category ?? ''}
                    {row.description ? `${row.category ? ' · ' : ''}${row.description}` : ''}
                  </Text>
                </View>
                <View style={styles.cellPricing}>
                  {pricingNote
                    ? (() => {
                        const lines = pricingNote.split('\n');
                        return lines.map((line, i) => (
                          <Text
                            key={i}
                            style={i === lines.length - 1 ? styles.pricingLineLast : styles.pricingLine}
                            wrap
                          >
                            {line}
                          </Text>
                        ));
                      })()
                    : null}
                </View>
                <View style={styles.cellRate}>
                  <Text style={styles.cellTextRight} wrap>
                    {formatCurrency(rate)}
                  </Text>
                </View>
                <View style={styles.cellAmount}>
                  <Text style={styles.cellTextRight} wrap>
                    {formatCurrency(amount)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Only show a Subtotal line when something adjusts it, so an invoice
              with no adjustments keeps its original single-Total look. */}
          {monetaryAdjustments.length > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.text}>Subtotal&nbsp;&nbsp;{formatCurrency(subtotal)}</Text>
              </View>
              {monetaryAdjustments.map((adj, i) => {
                const applied = Number(adj?.appliedAmount) || 0;
                const label = adj?.description || (adj?.type === 'DISCOUNT' ? 'Discount' : 'Additional cost');
                return (
                  <View style={styles.totalRow} key={`adj-${i}`}>
                    <Text style={styles.text}>
                      {label}
                      {adj?.reason ? ` (${adj.reason})` : ''}
                      &nbsp;&nbsp;
                      {applied < 0 ? `-${formatCurrency(Math.abs(applied))}` : formatCurrency(applied)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.strong}>Total&nbsp;&nbsp;{formatCurrency(invoiceTotal)}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.strong}>Note to customer</Text>
          <Text style={styles.text}>Service Prices for {fyShort}</Text>
          <Text style={styles.text}>Pricing category: {pricingCategoryLabel}</Text>
          {isProrated && (
            <Text style={styles.text}>
              This invoice covers part of the job; pricing adjustments are applied in proportion to the services billed here.
            </Text>
          )}
          {noteAdjustments.map((adj, i) => (
            <Text style={styles.text} key={`term-${i}`}>
              {adj?.description || 'Special term'}
              {adj?.reason ? ` — ${adj.reason}` : ''}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default JobInvoiceDocument;

