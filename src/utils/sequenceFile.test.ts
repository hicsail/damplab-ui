import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import source from './sequenceFile.ts?raw';
import { checkPickedFiles, checkSequenceFile, requiresSequenceCheck, sequenceCountLabel, sequenceRecordsFrom } from './sequenceFile';

const DNA_A = 'ATGGCGCGTACGTAGCTAGCTAGCATCGATCGATCGTAGCTAGCTAGCTAGCATCGATCGG';
const DNA_B = 'TTTACGCGTACGTAGCTAGCTAGCATCGATCGATCGTAGCTAGCTAGCTAGCATCGAAAA';
const fixture = (name: string) => readFileSync(new URL(`../../test-fixtures/sequence-files/${name}`, import.meta.url));
const asFile = (name: string) => new File([fixture(name)], name);

describe('sequenceFile', () => {
  it('accepts a three-record FASTA, a GenBank and a SnapGene file with their counts (behaviour 10)', async () => {
    expect(await checkSequenceFile(asFile('three-records.fasta'))).toEqual({ ok: true, count: 3 });
    expect(await checkSequenceFile(asFile('plasmid.gb'))).toEqual({ ok: true, count: 1 });
    expect(await checkSequenceFile(asFile('construct.dna'))).toEqual({ ok: true, count: 1 });
    expect(await checkSequenceFile(new File([fixture('construct.dna')], 'CONSTRUCT.DNA'))).toEqual({ ok: true, count: 1 });
  });
  it('refuses prose as not a sequence file (behaviour 8)', async () =>
    expect(await checkSequenceFile(asFile('notes.txt'))).toEqual({ ok: false, reason: 'notes.txt is not a sequence file we can read (FASTA, GenBank, SnapGene, …)' }));
  it('refuses a protein-only FASTA as having no DNA (behaviour 9)', async () =>
    expect(await checkSequenceFile(asFile('proteins.fasta'))).toEqual({ ok: false, reason: 'proteins.fasta has no DNA sequence in it' }));
  it('counts only the DNA of a mixed file', async () => expect(await checkSequenceFile(asFile('mixed.fasta'))).toEqual({ ok: true, count: 2 }));
  it('keeps degenerate-base DNA (Review Focus 2)', () =>
    expect(sequenceRecordsFrom(new TextEncoder().encode('>d\nATGGCGCGTACGTAGCTAGCTAGCATCGATRGATCGTAGCTAGCTAGCTAGCATCGATCGG\n').buffer as ArrayBuffer, 'd.fasta')).toMatchObject({ skipped: 0, records: [{ name: 'd' }] }));
  it('keeps a FASTA record under an empty header (ruling R3)', async () => {
    const bytes = new TextEncoder().encode(`>a\n${DNA_A}\n>\n${DNA_B}\n`);
    const result = sequenceRecordsFrom(bytes.buffer as ArrayBuffer, 'e.fasta');
    expect(result).toEqual({
      records: [
        { name: 'a', seq: DNA_A },
        { name: '', seq: DNA_B }
      ],
      skipped: 0
    });
    expect(await checkSequenceFile(new File([bytes], 'e.fasta'))).toEqual({ ok: true, count: 2 });
  });
  it('answers an accession ID synchronously, without fetching (behaviour 16)', () => {
    const buf = fixture('accession.txt');
    const result = sequenceRecordsFrom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, 'accession.txt');
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual({ error: 'unreadable' });
  });
  it('imports only the named parseFile export', () => expect(source).not.toMatch(/import \w+(,|\s+from)[^\n]*'seqparse'/));
  it('a mixed pick keeps the good files, names each bad one, and counts by localId (Review Focus 5)', async () => {
    const picked = ['three-records.fasta', 'notes.txt', 'mixed.fasta', 'proteins.fasta'].map((n, i) => ({ localId: `l${i}`, file: asFile(n) }));
    const { accepted, errors, counts } = await checkPickedFiles(picked);
    expect(accepted.map((p) => p.localId)).toEqual(['l0', 'l2']);
    expect(errors).toEqual(['notes.txt is not a sequence file we can read (FASTA, GenBank, SnapGene, …)', 'proteins.fasta has no DNA sequence in it']);
    expect(counts).toEqual({ l0: 3, l2: 2 });
  });
  it('checks only a flagged File Upload (behaviour 11)', () => {
    const params = [{ id: 'f', type: 'file', screening: true }, { id: 'g', type: 'file' }, { id: 't', type: 'string', screening: true }];
    expect(['f', 'g', 't', 'missing'].map((id) => requiresSequenceCheck(params, id))).toEqual([true, false, false, false]);
  });
  it('labels the count', () => expect([sequenceCountLabel(1), sequenceCountLabel(3)]).toEqual(['1 sequence found', '3 sequences found']));
});
