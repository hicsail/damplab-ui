import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import SowPdfDocument, { pdfSections } from './SowPdfDocument';
import { SowField, SowVersion } from './sowTypes';

/**
 * Rendering in Node is the point of these tests: @react-pdf throws on an invalid
 * element tree (a bare string outside <Text>, for instance), and that is exactly
 * the failure a "Download PDF" button cannot reveal — it just never resolves.
 */

function field(key: string, value: string, over: Partial<SowField> = {}): SowField {
  return { key, label: key, kind: 'PROSE', order: 10, value, calculatedValue: value, isOverridden: false, isEnabled: true, allowsTextOverride: true, allowsEmpty: true, requiresInitials: false, ...over };
}

function version(fields: SowField[], over: Partial<SowVersion> = {}): SowVersion {
  return {
    id: 'v1',
    versionNumber: 1,
    status: 'FINAL',
    visibleToCustomer: true,
    createdByName: 'tech',
    createdAt: '2026-08-12T12:00:00.000Z',
    fields,
    inputs: { projectManager: '', projectLead: '', scopeOfWork: [], deliverables: [], periods: [], services: [], adjustments: [] },
    ...over
  };
}

describe('pdfSections', () => {
  it('omits sections the staff hid from the customer', () => {
    const v = version([field('a', 'shown'), field('b', 'hidden', { isEnabled: false, order: 20 })]);
    expect(pdfSections(v).map((f) => f.key)).toEqual(['a']);
  });

  it('emits sections in document order, not array order', () => {
    const v = version([field('c', 'x', { order: 30 }), field('a', 'x', { order: 10 }), field('b', 'x', { order: 20 })]);
    expect(pdfSections(v).map((f) => f.key)).toEqual(['a', 'b', 'c']);
  });

  it('survives a version with no fields', () => {
    expect(pdfSections(version([]))).toEqual([]);
  });
});

describe('rendering', () => {
  it('produces a PDF for an unsigned document', async () => {
    const v = version([field('billToAddress', '610 Commonwealth Avenue')], { status: 'SENT' });
    const buf = await renderToBuffer(<SowPdfDocument version={v} sowNumber="SOW 00004" />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(1000);
  }, 30000);

  it('renders bullets, blank lines and plain paragraphs together', async () => {
    const v = version([field('scopeOfWork', 'Intro paragraph.\n\n- First item\n- Second item\nTrailing line.')]);
    const buf = await renderToBuffer(<SowPdfDocument version={v} sowNumber="SOW 00004" />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);

  it('renders both signature blocks when the document is countersigned', async () => {
    const v = version([field('a', 'x')], {
      clientSignature: { name: 'Jane Rivera', signedAt: '2026-08-12T12:00:00.000Z' },
      staffSignature: { name: 'Courtney Tretheway', signedAt: '2026-08-12T13:00:00.000Z' }
    });
    const buf = await renderToBuffer(<SowPdfDocument version={v} sowNumber="SOW 00004" />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);

  it('renders a migrated drawn signature without throwing', async () => {
    // 1x1 transparent PNG — enough to exercise the <Image> path the migration feeds.
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const v = version([field('a', 'x')], { clientSignature: { name: 'Jane Rivera', signedAt: '2026-08-12T12:00:00.000Z', legacySignatureDataUrl: png } });
    const buf = await renderToBuffer(<SowPdfDocument version={v} sowNumber="SOW 00004" logoUrl={png} />);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);
});
