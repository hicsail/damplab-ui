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
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 6,
  },
  colDate: { width: 75 },
  colProd: { width: 140 },
  colDesc: { width: 190 },
  colQty: { width: 40, textAlign: 'right' },
  colRate: { width: 70, textAlign: 'right' },
  colAmount: { width: 90, textAlign: 'right' },
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

function extractTrailingDigits(s: string | undefined | null): string | null {
  const str = (s ?? '').toString();
  const m = str.match(/(\d+)\D*$/); // trailing digits
  return m?.[1] ?? null;
}

function getSowShortNumber(sowNumber: string | undefined | null, fallbackInvoice: string): string {
  const digits = extractTrailingDigits(sowNumber ?? '');
  if (!digits) return fallbackInvoice;
  const n = Number(digits);
  if (!Number.isFinite(n)) return fallbackInvoice;
  return `0${String(n).padStart(2, '0')}`; // 0## format
}

export interface JobInvoiceDocumentProps {
  jobId: string;
  jobName: string;
  customerCategory?:
    | 'INTERNAL_CUSTOMERS'
    | 'EXTERNAL_CUSTOMER_ACADEMIC'
    | 'EXTERNAL_CUSTOMER_MARKET'
    | 'EXTERNAL_CUSTOMER_NO_SALARY'
    | null;
  sow: SOWData | null;
}

const JobInvoiceDocument: React.FC<JobInvoiceDocumentProps> = ({ jobId, jobName, customerCategory, sow }) => {
  const invoiceDate = new Date();
  const invoiceNo = getInvoiceNumber(jobId);

  const startDate = safeParseISODate(sow?.timeline?.startDate) ?? invoiceDate;
  const fyShort = getFYShort(startDate);

  const sowShort = getSowShortNumber(sow?.sowNumber ?? undefined, invoiceNo);
  const billedToName = sow?.clientName ?? 'Client';
  const billedToEmail = sow?.clientEmail ?? '';
  const { line1, line2 } = splitAddressLines(sow?.clientAddress ?? '');

  const services = sow?.services ?? [];
  const invoiceTotal = services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

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
            <Text>{'youremail@bu.edu'}</Text>
            <Text>{'610 Commonwealth Ave'}</Text>
            <Text>{'Boston, MA 02215'}</Text>
            <Text>{'+# (###) ###-####'}</Text>
            <Text>{'damplab.org'}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source="/BU-Logo-Sow.png" style={{ width: 58, height: 58, marginRight: 6 }} />
            <Image source="/Damplab-logo-Sow.png" style={{ width: 70, height: 36 }} />
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sowLine}>
            {'SOW '}{sowShort} {' | '}{jobName}
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

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colProd}>Product or Service</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {services.map((s, idx) => {
            const rate = Number(s.cost) || 0;
            const qty = 1;
            const amount = rate * qty;
            return (
              <View key={s.id || idx} style={styles.row}>
                <Text style={styles.colDate}>{formatMMDDYYYY(invoiceDate)}</Text>
                <Text style={styles.colProd}>{s.name}</Text>
                <Text style={styles.colDesc}>
                  {s.category}
                  {s.description ? ` - ${s.description}` : ''}
                </Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colRate}>{formatCurrency(rate)}</Text>
                <Text style={styles.colAmount}>{formatCurrency(amount)}</Text>
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

