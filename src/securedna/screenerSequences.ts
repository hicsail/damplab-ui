import { sequenceRecordsFrom } from '../utils/sequenceFile';
import type { Sequence } from './types';

/**
 * The Screener's rows for one picked file, or `null` when it is not a readable sequence file with
 * DNA in it. Reads the bytes through the same contract as the job-file check (`sequenceRecordsFrom`),
 * so a SnapGene `.dna` file parses; seqparse's own message is never surfaced.
 */
export function screenerSequencesFrom(bytes: ArrayBuffer, filename: string): Sequence[] | null {
  const result = sequenceRecordsFrom(bytes, filename);
  if ('error' in result) return null;
  return result.records.map((r) => ({
    id: '',
    name: r.name,
    type: 'dna' as const,
    seq: r.seq,
    userId: '',
    created_at: new Date(),
    updated_at: new Date()
  }));
}
