import { readFileSync } from 'fs';
import { parseFile } from 'seqparse';
import { describe, expect, it } from 'vitest';
import { mapSeqparseAnnotationsToSaved } from './mapSeqparseAnnotations';
import { screenerSequencesFrom } from './screenerSequences';

const bytes = (name: string) => {
  const b = readFileSync(new URL(`../../test-fixtures/sequence-files/${name}`, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
/** What the Screener's original mapping produces for a parse of the same file. */
const expectedFrom = (name: string) =>
  (parseFile(new TextDecoder().decode(bytes(name)), { fileName: name, source: name.endsWith('.dna') ? bytes(name) : undefined } as any) as any[]).map((r) => ({ name: r.name, type: r.type, seq: r.seq, annotations: mapSeqparseAnnotationsToSaved(r.annotations) }));

describe('screenerSequencesFrom', () => {
  it('reads a SnapGene .dna file from its bytes, keeping type and annotations (F1)', async () => {
    const rows = await screenerSequencesFrom(bytes('construct.dna'), 'construct.dna');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: '', userId: '', ...expectedFrom('construct.dna')[0] });
    expect(rows[0].seq.length).toBeGreaterThan(0);
  });
  it('keeps a GenBank file annotations (the fixture has none, so a feature is written inline)', async () => {
    const gb = 'LOCUS       pX   61 bp    DNA     linear   SYN 01-JAN-2020\nFEATURES             Location/Qualifiers\n     CDS             1..30\n                     /label="orf"\nORIGIN\n        1 atggcgcgta cgtagctagc tagcatcgat cgatcgtagc tagctagcta gcatcgatcg g\n//\n';
    const rows = await screenerSequencesFrom(new TextEncoder().encode(gb).buffer as ArrayBuffer, 'x.GB');
    expect(rows[0].annotations?.length ?? 0).toBeGreaterThan(0);
    expect(rows[0].annotations).toEqual(mapSeqparseAnnotationsToSaved((parseFile(gb, { fileName: 'x.gb' } as any) as any[])[0].annotations));
  });
  it('keeps a protein FASTA records with their type instead of refusing them', async () => {
    const rows = await screenerSequencesFrom(bytes('proteins.fasta'), 'proteins.fasta');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((r) => r.type)).toEqual(expectedFrom('proteins.fasta').map((r) => r.type));
    expect(rows.some((r) => r.type === 'aa')).toBe(true);
  });
  it('keeps a FASTA record under a bare ">" header', async () => {
    const rows = await screenerSequencesFrom(new TextEncoder().encode('>\nATGGCGCGTACGTAGCTAGCTAGCATCG\n').buffer as ArrayBuffer, 'x.FASTA');
    expect(rows).toHaveLength(1);
  });
});
