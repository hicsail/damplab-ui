/**
 * Must match GraphQL `Region` enum **names** from the API (ALL, US, …), not the wire values
 * the backend uses for SecureDNA (`all`, `us`, …). Sending lowercase breaks validation (HTTP 400).
 */
export enum Region {
  ALL = 'ALL',
  US = 'US',
  EU = 'EU',
  PRC = 'PRC'
}

export interface Sequence {
  id: string;
  name: string;
  type: 'dna' | 'rna' | 'aa' | 'unknown';
  seq: string;
  annotations?: Array<{
    start: number;
    end: number;
    type: string;
    description?: string;
  }>;
  userId: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ScreeningInput {
  sequenceId: string;
  region: Region;
  provider_reference?: string;
}

export interface HitRegion {
  seq: string;
  seq_range_start: number;
  seq_range_end: number;
}

export interface Organism {
  name: string;
  organism_type: 'Virus' | 'Toxin' | 'Bacterium' | 'Fungus';
  ans: string[];
  tags: string[];
}

export type SecureDnaHitKind = 'nuc' | 'aa';

/** Full SecureDNA hazard hit (`hits_by_record` / per-sequence `threats`). */
export interface SecureDnaHazardHit {
  type: SecureDnaHitKind;
  is_wild_type: boolean | null;
  hit_regions: HitRegion[];
  most_likely_organism: Organism;
  organisms: Organism[];
}

export interface ScreeningDiagnostic {
  diagnostic: string;
  additional_info: string;
  line_number_range?: number[] | null;
}

export interface VerifiableScreening {
  synthclient_version?: string;
  response_json?: string;
  signature?: string;
  public_key?: string;
  history?: string;
  sha3_256?: string;
}

export interface RecordHit {
  fasta_header: string;
  line_number_range: number[];
  sequence_length: number;
  hits_by_hazard: SecureDnaHazardHit[];
}

export interface ScreeningResponse {
  synthesis_permission: 'granted' | 'denied';
  provider_reference?: string;
  hits_by_record?: RecordHit[];
}

export interface ScreeningBatchSequenceSlice {
  sequence: Sequence;
  /** Mongo sequence id used in the FASTA header. */
  recordId: string;
  name: string;
  order: number;
  originalSeq: string;
  threats: SecureDnaHazardHit[];
  warning?: string;
}

/** One persisted screening run (backend `ScreeningBatch`). */
export interface ScreeningBatch {
  id: string;
  batchRunId: string;
  screeningCompletedAt: string;
  synthesisPermission: 'granted' | 'denied';
  region: Region;
  providerReference?: string | null;
  hitsByRecord: RecordHit[];
  warnings: ScreeningDiagnostic[];
  errors: ScreeningDiagnostic[];
  verifiable?: VerifiableScreening | null;
  sequences: ScreeningBatchSequenceSlice[];
  userId: string;
  created_at: string;
  updated_at: string;
}
