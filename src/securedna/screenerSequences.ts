import { parseSequenceBytes } from '../utils/sequenceFile';
import { mapSeqparseAnnotationsToSaved } from './mapSeqparseAnnotations';
import type { Sequence } from './types';

/**
 * The Screener's rows for one picked file: seqparse's own records (type and annotations kept),
 * read through the shared `parseSequenceBytes` so a SnapGene `.dna` file parses. Throws when the
 * file cannot be parsed; the caller shows its own message, never seqparse's.
 */
export async function screenerSequencesFrom(bytes: ArrayBuffer, filename: string): Promise<Sequence[]> {
  const parsed = await parseSequenceBytes(bytes, filename);
  return parsed.map((seq) => ({
    id: '',
    name: seq.name,
    type: seq.type,
    seq: seq.seq,
    annotations: mapSeqparseAnnotationsToSaved(seq.annotations),
    userId: '',
    created_at: new Date(),
    updated_at: new Date()
  }));
}
