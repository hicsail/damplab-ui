import { parseFile } from 'seqparse';

export const SEQUENCE_FILE_UNREADABLE = 'is not a sequence file we can read (FASTA, GenBank, SnapGene, …)';
export const SEQUENCE_FILE_NO_DNA = 'has no DNA sequence in it';

export type SequenceRecords = { records: { name: string; seq: string }[]; skipped: number } | { error: 'unreadable' | 'no-dna' };

const NUCLEOTIDE_RATIO = 0.9;

type ParsedRecord = { type?: string; seq: string; name?: string };

function isDnaRecord(record: ParsedRecord): boolean {
  if (record.type === 'dna' || record.type === 'rna') return true;
  const stripped = record.seq.replace(/\s+/g, '').toUpperCase();
  if (stripped.length === 0) return false;
  let nucleotides = 0;
  for (const ch of stripped) if ('ACGTUN'.includes(ch)) nucleotides++;
  return nucleotides / stripped.length >= NUCLEOTIDE_RATIO;
}

/**
 * Browser twin of the backend's `extractSequenceRecords`
 * (`damplab-backend/src/job/sequence-file.util.ts`): reads the sequence records of a picked file,
 * offline and synchronously. Never throws and never fetches (only the named `parseFile` export is
 * imported, never seqparse's default export, which resolves accession IDs from NCBI).
 *
 * Contract:
 * 1. The filename's extension is lowercased before it is handed to seqparse.
 * 2. For `.dna` (SnapGene) files the bytes are passed as `source`.
 * 3. A parser exception yields `unreadable`; its message embeds the file and is dropped.
 * 4. Only records with a non-blank `seq` count. A record is DNA when seqparse types it `dna` or `rna`,
 *    or when at least 90% of its whitespace-stripped characters are in ACGTUN (seqparse types
 *    IUPAC-degenerate DNA as `aa`).
 * 5. Returns the DNA records (name trimmed) and `skipped`, the number of non-DNA records.
 * 6. With no DNA record: `unreadable` if there was at least one record and all are typed `unknown`
 *    (prose falls back to one `unknown` record), otherwise `no-dna`.
 *
 * For non-`.dna` files, header lines of only `>` are rewritten to `> ` first: seqparse silently drops
 * a FASTA record under a bare `>` header, which would let that DNA dodge screening.
 */
export function sequenceRecordsFrom(bytes: ArrayBuffer, filename: string): SequenceRecords {
  const fileName = filename.replace(/\.[^./\\]+$/, (e) => e.toLowerCase());
  const isSnapGene = fileName.endsWith('.dna');
  const options: { fileName: string; source?: ArrayBuffer } = { fileName };
  if (isSnapGene) options.source = bytes;

  let parsed: ParsedRecord[];
  try {
    const text = new TextDecoder().decode(bytes);
    parsed = parseFile(isSnapGene ? text : text.replace(/^>[ \t]*$/gm, '> '), options) as ParsedRecord[];
  } catch {
    return { error: 'unreadable' };
  }

  const candidates = (Array.isArray(parsed) ? parsed : []).filter((r) => typeof r.seq === 'string' && r.seq.trim() !== '');
  const dna = candidates.filter(isDnaRecord);
  if (dna.length === 0) {
    return { error: candidates.length > 0 && candidates.every((r) => r.type === 'unknown') ? 'unreadable' : 'no-dna' };
  }
  return { records: dna.map((r) => ({ name: (r.name ?? '').trim(), seq: r.seq })), skipped: candidates.length - dna.length };
}

export async function checkSequenceFile(file: File): Promise<{ ok: true; count: number } | { ok: false; reason: string }> {
  let result: SequenceRecords;
  try {
    result = sequenceRecordsFrom(await file.arrayBuffer(), file.name);
  } catch {
    result = { error: 'unreadable' };
  }
  if ('error' in result) {
    return { ok: false, reason: `${file.name} ${result.error === 'no-dna' ? SEQUENCE_FILE_NO_DNA : SEQUENCE_FILE_UNREADABLE}` };
  }
  return { ok: true, count: result.records.length };
}

export async function checkPickedFiles<T extends { file: File; localId: string }>(picked: T[]): Promise<{ accepted: T[]; errors: string[]; counts: Record<string, number> }> {
  const accepted: T[] = [];
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  const results = await Promise.all(picked.map((p) => checkSequenceFile(p.file)));
  picked.forEach((p, i) => {
    const r = results[i];
    if (r.ok) {
      accepted.push(p);
      counts[p.localId] = r.count;
    } else {
      errors.push(r.reason);
    }
  });
  return { accepted, errors, counts };
}

export function requiresSequenceCheck(parameters: unknown, paramId: string): boolean {
  if (!Array.isArray(parameters)) return false;
  const def = parameters.find((p) => p && typeof p === 'object' && (p as { id?: unknown }).id === paramId) as { type?: unknown; screening?: unknown } | undefined;
  return def?.type === 'file' && def?.screening === true;
}

export function sequenceCountLabel(count: number): string {
  return count === 1 ? '1 sequence found' : `${count} sequences found`;
}
