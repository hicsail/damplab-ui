export interface AclidScreenResponse {
    items: AclidScreen[];
  }
  
  interface AclidFinding {
    reason_code: string;
    regulatory_status: string;
  }
  
  export interface AclidScreen {
    id: string;
    name: string;
    user: string;
    verification_completed_at: string;
    verification_url: string;
    created: number;
    updated: number;
    status: string;
    length: number;
    match_count: number;
    findings: {
      us_ccl_export_control: AclidFinding;
      eu_dual_use_export_control: AclidFinding;
      us_screening_framework: AclidFinding;
    };
    regulatory_status: string;
  }
  
  export interface AclidMatch {
    query: string;
    qstart: number;
    qend: number;
    qlen: number;
    sseqid: string;
    sstart: number;
    send: number;
    slen: number;
    length: number;
    evalue: number;
    bitscore: number;
    taxid: number;
    organism: string;
    gene: string;
    function: string;
    go: {
      name: string;
      definition: string;
    }[];
    funsocs: any[];
    pident: number;
    qcov: number;
    scov: number;
    findings: {
      us_ccl_export_control: AclidFinding;
      eu_dual_use_export_control: AclidFinding;
      us_screening_framework: AclidFinding;
    };
    regulatory_status: string;
  }
  
  export interface AclidDetailsResponse {
    [screeningName: string]: {
      matches: AclidMatch[];
    };
  }
  