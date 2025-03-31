export enum Region {
  ALL = 'all',
  US = 'us',
  EU = 'eu',
  PRC = 'prc'
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

export interface HazardHits {
  type: 'nuc' | 'aa';
  is_wild_type: boolean | null;
  hit_regions: HitRegion[];
  most_likely_organism: Organism;
  organisms: Organism[];
}

export interface RecordHit {
  fasta_header: string;
  line_number_range: number[];
  sequence_length: number;
  hits_by_hazard: HazardHits[];
}

export interface ScreeningResponse {
  synthesis_permission: 'granted' | 'denied';
  provider_reference?: string;
  hits_by_record?: RecordHit[];
}

export interface ScreeningResult {
  id: string;
  sequence: {
    id: string;
    name: string;
  };
  status: 'pending' | 'completed' | 'failed' | 'denied';
  threats: HazardHits[];
  region: Region;
  createdAt: Date;
  userId: string;
  originalSeq?: string;
} 