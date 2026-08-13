import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { SowVersion, sowStatusLabel, versionDisplayLabel } from './sowTypes';

/**
 * PDF rendering of a SOW version.
 *
 * Carries no wording of its own: every sentence comes from the version's stored
 * fields, which are the same strings the web view shows. That is the point of the
 * rewrite — the page, the record and the signed PDF cannot disagree, because
 * there is only one copy of the text.
 *
 * The only formatting convention is the one the editor advertises: a line
 * beginning "- " is a bullet.
 */

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4, color: '#111' },
  logoBox: { marginBottom: 10 },
  logo: { width: 138, height: 59 },
  org: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  address: { fontSize: 10, color: '#444', marginBottom: 14 },
  meta: { fontSize: 9, color: '#666', marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 5 },
  paragraph: { marginBottom: 4, textAlign: 'left' },
  bullet: { marginBottom: 3, marginLeft: 12, flexDirection: 'row' },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  signatureRow: { flexDirection: 'row', marginTop: 24, gap: 24 },
  signatureBox: { flex: 1, borderTop: '1pt solid #999', paddingTop: 6 },
  signatureImage: { width: 160, height: 44, marginBottom: 4 },
  signatureLabel: { fontSize: 9, color: '#666' },
  ruled: { borderBottom: '1pt solid #bbb', height: 14, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#888', textAlign: 'center' }
});

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Renders one stored field value, honouring the "- " bullet convention. */
function Body({ value }: { value: string }): React.JSX.Element {
  const lines = (value ?? '').split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        if (line.trim() === '') return <View key={i} style={{ height: 5 }} />;
        if (line.trimStart().startsWith('- ')) {
          return (
            <View key={i} style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{line.trimStart().slice(2)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

/** Sections that appear in the PDF: enabled only, in document order. */
export function pdfSections(version: SowVersion): SowVersion['fields'] {
  return [...(version.fields ?? [])].filter((f) => f.isEnabled).sort((a, b) => a.order - b.order);
}

interface Props {
  version: SowVersion;
  sowNumber?: string;
  /** Served from /public so the PDF does not depend on a third-party host. */
  logoUrl?: string;
}

export default function SowPdfDocument({ version, sowNumber, logoUrl = '/Damplab-logo-Sow.png' }: Props): React.JSX.Element {
  const fields = pdfSections(version);
  const client = version.clientSignature;
  const staff = version.staffSignature;

  return (
    <Document>
      <Page style={styles.page}>
        <View>
          <View style={styles.logoBox}>
            <Image style={styles.logo} src={logoUrl} />
          </View>
          <Text style={styles.org}>DAMP Lab</Text>
          <Text style={styles.address}>610 Commonwealth Avenue, 4th Floor, Boston, MA 02215</Text>
        </View>

        <Text style={styles.meta}>
          {sowNumber ? `${sowNumber} · ` : ''}Version {versionDisplayLabel(version)} · {sowStatusLabel(version.status)}
        </Text>

        {fields.map((f) => (
          <View key={f.key} wrap={false}>
            <Text style={styles.sectionTitle}>{f.label}</Text>
            <Body value={f.value} />
          </View>
        ))}

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Client</Text>
            {client ? (
              <View>
                {/* Migrated SOWs keep the signature the customer actually drew. */}
                {client.legacySignatureDataUrl?.startsWith('data:') && <Image src={client.legacySignatureDataUrl} style={styles.signatureImage} />}
                <Text>{client.name}</Text>
                <Text style={styles.signatureLabel}>Signed {formatDate(client.signedAt)}</Text>
              </View>
            ) : (
              <View>
                <View style={styles.ruled} />
                <Text style={styles.signatureLabel}>Name</Text>
                <View style={styles.ruled} />
                <Text style={styles.signatureLabel}>Date</Text>
              </View>
            )}
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Trustees of Boston University</Text>
            {staff ? (
              <View>
                {staff.legacySignatureDataUrl?.startsWith('data:') && <Image src={staff.legacySignatureDataUrl} style={styles.signatureImage} />}
                <Text>{staff.name}</Text>
                <Text style={styles.signatureLabel}>Countersigned {formatDate(staff.signedAt)}</Text>
              </View>
            ) : (
              <View>
                <View style={styles.ruled} />
                <Text style={styles.signatureLabel}>Name</Text>
                <View style={styles.ruled} />
                <Text style={styles.signatureLabel}>Date</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          DAMP Lab · {sowNumber ?? 'Statement of Work'} · version {versionDisplayLabel(version)}
        </Text>
      </Page>
    </Document>
  );
}
