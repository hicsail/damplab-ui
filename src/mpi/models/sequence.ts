interface Annotation {
  name: string;
  start: number;
  end: number;
  direction?: number;
  color?: string;
  type?: string;
}

interface Organism {
  name: string;
  organism_type: string;
  tags: string[];
}

interface BiosecurityCheck {
  organism: Organism;
  hit_regions: HitRegion[];
}

interface HitRegion {
  start_index: number;
  end_index: number;
  seq: string;
}

interface Biosecurity {
  status: "granted" | "denied";
  sequence?: string;
  biosecurityCheck?: BiosecurityCheck[];
}

export interface Sequence {
  id?: string;
  name: string;
  type: string;
  seq: string;
  annotations: Annotation[];
  biosecurity?: Biosecurity | null;
}
