import React from 'react';
import { Document, Page, StyleSheet, View, Text, Image, Font } from '@react-pdf/renderer';
import type { SOWData } from '../types/SOWTypes';

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

function normalizePricingMode(v: unknown): 'SERVICE' | 'PARAMETER' {
  if (typeof v === 'string' && v.toUpperCase() === 'PARAMETER') return 'PARAMETER';
  return 'SERVICE';
}

function formDataToMap(formData: unknown): Map<string, unknown> {
  const m = new Map<string, unknown>();
  if (Array.isArray(formData)) {
    for (const e of formData as Array<{ id?: string; value?: unknown }>) {
      if (e && typeof e.id === 'string') m.set(e.id, e.value);
    }
  } else if (formData && typeof formData === 'object') {
    for (const [k, v] of Object.entries(formData as Record<string, unknown>)) {
      m.set(k, v);
    }
  }
  return m;
}

/** Price multiplier params: show entered value(s); if all numeric, note combined × factor like pricing engine. */
function formatMultiplierNotes(parameters: any[] | undefined, formData: unknown): string[] {
  const lines: string[] = [];
  const map = formDataToMap(formData);
  if (!Array.isArray(parameters)) return lines;
  for (const p of parameters) {
    if (!p || p.isPriceMultiplier !== true || typeof p.id !== 'string') continue;
    const raw = map.get(p.id);
    if (raw === undefined || raw === null || raw === '') continue;
    const label = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : p.id;
    const allowMulti = p.allowMultipleValues === true;
    if (Array.isArray(raw)) {
      const strs = raw.map((v) => (v === null || v === undefined ? '' : String(v))).filter((s) => s !== '');
      if (!strs.length) continue;
      const nums = raw.map((v) =>
        typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
      );
      const allNum = nums.every((n) => Number.isFinite(n));
      if (allowMulti && allNum && nums.length > 1) {
        const sum = nums.reduce((a, b) => a + b, 0);
        lines.push(`${label}: ${strs.join(', ')} (×${sum} applied)`);
      } else {
        const multiNote = allowMulti && strs.length > 1 ? ' (multiple values)' : '';
        lines.push(`${label}: ${strs.join(', ')}${multiNote}`);
      }
    } else {
      lines.push(`${label}: ${String(raw)}`);
    }
  }
  return lines;
}

function formatParameterPricingLines(
  details: Array<{ label: string; quantity: number; unitPrice: number; total: number }> | undefined
): string[] {
  if (!Array.isArray(details) || !details.length) return [];
  return details.map((d) => {
    if (d.quantity > 1) {
      return `${d.label}: ${d.quantity} × ${formatCurrency(d.unitPrice)} = ${formatCurrency(d.total)}`;
    }
    return `${d.label}: ${formatCurrency(d.total)}`;
  });
}

/** PARAMETER mode: priced parameter lines + any multiplier params. SERVICE mode: multiplier lines only, or empty. */
function buildInvoicePricingNote(row: any): string {
  const mode = normalizePricingMode(row?.pricingMode);
  const multLines = formatMultiplierNotes(row?.parameters, row?.formData);
  if (mode === 'PARAMETER') {
    const paramLines = formatParameterPricingLines(row?.pricingDetails);
    return [...paramLines, ...multLines].join('\n').trim();
  }
  return multLines.join('\n').trim();
}

function matchSowService(invoiceLine: any, index: number, sowServices: any[] | undefined): any | null {
  if (!Array.isArray(sowServices) || !sowServices.length) return null;
  const sid = invoiceLine?.serviceId ?? invoiceLine?.id;
  const byId = sowServices.find((s) => s && (String(s.id) === String(sid)));
  if (byId) return byId;
  return sowServices[index] ?? null;
}

function mergeLineForPricing(invoiceLine: any, index: number, sow: SOWData | null): any {
  const sowSvc = sow?.services ? matchSowService(invoiceLine, index, sow.services as any[]) : null;
  if (!sowSvc) return invoiceLine;
  return {
    ...invoiceLine,
    pricingMode: sowSvc.pricingMode ?? invoiceLine.pricingMode,
    parameters: sowSvc.parameters ?? invoiceLine.parameters,
    formData: sowSvc.formData ?? invoiceLine.formData,
    pricingDetails: sowSvc.pricingDetails ?? invoiceLine.pricingDetails,
  };
}

export interface JobInvoiceDocumentProps {
  jobId: string;
  jobDisplayId?: string | null;
  jobName: string;
  customerCategory?:
    | 'INTERNAL_CUSTOMERS'
    | 'EXTERNAL_CUSTOMER_ACADEMIC'
    | 'EXTERNAL_CUSTOMER_MARKET'
    | 'EXTERNAL_CUSTOMER_NO_SALARY'
    | null;
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
      pricingMode?: 'SERVICE' | 'PARAMETER' | null;
      parameters?: any;
      formData?: any;
      pricingDetails?: Array<{ label: string; quantity: number; unitPrice: number; total: number }>;
    }>;
    totalCost?: number | null;
    billedToName?: string | null;
    billedToEmail?: string | null;
    billedToAddress?: string | null;
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

  const services = (invoice?.services?.length ? invoice.services : (sow?.services ?? [])) as any[];
  const invoiceTotal = Number(invoice?.totalCost) || services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

  const isInternal = customerCategory === 'INTERNAL_CUSTOMERS';
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
  const pricingCategoryLabel = getCustomerCategoryLabel(customerCategory);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
            const row = mergeLineForPricing(s, idx, sow);
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

          <View style={styles.totalRow}>
            <Text style={styles.strong}>Total&nbsp;&nbsp;{formatCurrency(invoiceTotal)}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.strong}>Note to customer</Text>
          <Text style={styles.text}>Service Prices for {fyShort}</Text>
          <Text style={styles.text}>Pricing category: {pricingCategoryLabel}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default JobInvoiceDocument;

