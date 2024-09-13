import { Annotation } from "seqparse";


export interface Annotations {
    name: string;
    start: number;
    end: number;
    direction: number;
    color: string;
    type: string;
}

export type SeqState = {
    name: string;
    type: "dna" | "rna" | "aa" | "unknown";
    seq: string;
    annotations: Annotation[];
};

// Azenta order schemas
export type AzentaLibrary = {
  pool?: string;
  libName?: string;
  i7Index?: string;
  i5Index?: string;
  readOne?: string;
  readTwo?: string;
  indexOne?: string;
  indexTwo?: string;
}

export const initialLibraryDefaults: AzentaLibrary = {
  pool: '',
  libName: '',
  i7Index: '',
  i5Index: '',
  readOne: '',
  readTwo: '',
  indexOne: '',
  indexTwo: ''
};

export type AzentaPool = {
  libraries: AzentaLibrary[];
  pool?: string;
  libCnt?: string;
  species?: string;
  volume?: string;
  conc?: string;
  libKit?: string;
  fluor?: string;
  electro?: string;
  poolStrat?: string;
  comments?: string;
}

export const initialPoolDefaults: AzentaPool = {
  libraries: [initialLibraryDefaults],
  pool: '',
  libCnt: '',
  species: '',
  volume: '',
  conc: '',
  libKit: '',
  fluor: '',
  electro: '',
  poolStrat: '',
  comments: ''
};

export interface AzentaSeqOrder {
  id?: string;
  sequenceIds: string[];
  pools: AzentaPool[];
  orderName?: string;
  // specialId?: string;
  // promo?: string;
  // coupon?: string;
  // service: 'Value' | 'Preferred' | 'Express' | 'Lightning' | 'Decide later' | 'unknown';
  // existingData?: boolean;
  // submitDate?: Date;
  // consult: 'Yes' | 'No' | 'unknown';
  // discExpClin: 'Discovery' | 'Exploratory' | 'Clinical' | 'unknown';
  // addDocs: 'Yes' | 'No' | 'unknown';
  // materials: 'Genomic DNA' | 'ChIP DNA' | 'RNA' | 'Amplicon' | '10X single-cell' | 'Bulk ATAC-seq' | 'Other' | 'unknown';
  // libPrepKit?: string;
  // sampleCnt?: number;
  // libraryCnt?: number;
  // estLibSize?: number;
  // dataPerLib?: number;
  // seqConfig: '2x150bp' | '2x250bp' | '2x300bp' | 'unknown';
  // illuminaAdapt: 'Yes' | 'No' | 'unknown';
  // illuminaBinds: 'Yes for both reads' | 'Yes for only one read' | 'No' | 'unknown';
  // illuminaIndex: 'Yes and single' | 'Yes and dual' | 'Yes and no index' | 'No' | 'unknown';
  // indexLength: '6 bp' | '8 bp' | '10 bp' | '16 bp' | '24 bp' | 'Other' | 'unknown';
  // diversity: 'High Diversity' | 'Low Diversity' | 'unknown';
  // phixSpike: 'Yes 20%' | 'Yes 30%' | 'Yes custom' | 'No' | 'unknown';
  // phixSpikeText?: string;
  // addOptions: 'Have in-line barcodes' | 'Have custom primers' | 'Have overlapping barcodes between samples' | 'Need data analysis' | 'None of the above' | 'unknown';
  // specComments?: string;
}

export interface AzentaOrderOptions {
  service: string[];
  consult: string[];
  discExpClin: string[];
  addDocs: string[];
  materials: string[];
  seqConfig: string[];
  illuminaAdapt: string[];
  illuminaBinds: string[];
  illuminaIndex: string[];
  indexLength: string[];
  diversity: string[];
  phixSpike: string[];
  addOptions: string[];
}

export const azentaOrderOptions: AzentaOrderOptions = {
  service: ['Value', 'Preferred', 'Express', 'Lightning', 'Decide later', 'unknown', ''],
  consult: ['Yes', 'No', 'unknown', ''],
  discExpClin: ['Discovery', 'Exploratory', 'Clinical', 'unknown', ''],
  addDocs: ['Yes', 'No', 'unknown', ''],
  materials: ['Genomic DNA', 'ChIP DNA', 'RNA', 'Amplicon', '10X single-cell', 'Bulk ATAC-seq', 'Other', 'unknown', ''],
  seqConfig: ['2x150bp', '2x250bp', '2x300bp', 'unknown', ''],
  illuminaAdapt: ['Yes', 'No', 'unknown', ''],
  illuminaBinds: ['Yes for both reads', 'Yes for only one read', 'No', 'unknown', ''],
  illuminaIndex: ['Yes and single', 'Yes and dual', 'Yes and no index', 'No', 'unknown', ''],
  indexLength: ['6 bp', '8 bp', '10 bp', '16 bp', '24 bp', 'Other', 'unknown', ''],
  diversity: ['High Diversity', 'Low Diversity', 'unknown', ''],
  phixSpike: ['Yes 20%', 'Yes 30%', 'Yes custom', 'No', 'unknown', ''],
  addOptions: ['Have in-line barcodes', 'Have custom primers', 'Have overlapping barcodes between samples', 'Need data analysis', 'None of the above', 'unknown', '']
}

export const initialOrderDefaults: AzentaSeqOrder = {
  id: '',
  sequenceIds: [''],
  pools: [initialPoolDefaults],
  orderName: ''
};
