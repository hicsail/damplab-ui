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

export interface AzentaLibrary {
    pool?: string;
    libName?: string;
    i7Index?: string;
    i5Index?: string;
    readOne?: string;
    readTwo?: string;
    indexOne?: string;
    indexTwo?: string;
}

export interface AzentaSample {
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

export interface AzentaOrder {
    orderName?: string;
    specialId?: string;
    promo?: string;
    coupon?: string;
    service?: string;
    existingData?: boolean;
    submitDate?: Date;
    consult?: string;
    discExpClin?: string;
    addDocs?: string;
    materials?: string;
    libPrepKit?: string;
    sampleCnt?: number;
    libraryCnt?: number;
    estLibSize?: number;
    dataPerLib?: number;
    seqConfig?: string;
    illuminaAdapt?: string;
    illuminaBinds?: string;
    illuminaIndex?: string;
    indexLength?: string;
    diversity?: string;
    phixSpike?: string;
    phixSpikeText?: string;
    addOptions?: string;
    specComments?: string;
}

export type RecState = {
    id: string;
    sequence?: SeqState;
    azentaLibs?: AzentaLibrary;
    azentaSample?: AzentaSample;
    azentaOrder?: AzentaOrder;
}

export type RecItem = {
    id: string;
    name: string;
};
