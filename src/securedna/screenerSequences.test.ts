import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { screenerSequencesFrom } from './screenerSequences';

const bytes = (name: string) => {
  const b = readFileSync(new URL(`../../test-fixtures/sequence-files/${name}`, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

describe('screenerSequencesFrom', () => {
  it('reads a SnapGene .dna file from its bytes (F1)', () => {
    const rows = screenerSequencesFrom(bytes('construct.dna'), 'construct.dna');
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toMatchObject({ type: 'dna', userId: '' });
    expect(rows?.[0].seq.length).toBeGreaterThan(0);
  });
  it('reads a FASTA file', () => expect(screenerSequencesFrom(bytes('three-records.fasta'), 'three-records.fasta')).toHaveLength(3));
  it('returns null for a file that is not a sequence file, without a parser message', () => expect(screenerSequencesFrom(bytes('notes.txt'), 'notes.txt')).toBeNull());
});
