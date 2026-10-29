import type { BiosecurityScreeningStatus } from './biosecurityStatus';

/**
 * Hand-written mirror of the backend's ScreeningRun GraphQL types (biosecurity-update), like
 * src/securedna/types.ts for ScreeningBatch. src/gql/graphql.ts carries none of the biosecurity
 * types; regenerate it with codegen against a backend that has them if it ever needs to.
 */
export type ScreeningRunTrigger = 'SUBMISSION' | 'RERUN';

export interface ScreeningRunSummary {
  id: string;
  jobId: string;
  trigger: ScreeningRunTrigger;
  triggeredBy: string | null;
  status: BiosecurityScreeningStatus;
  startedAt: string;
  completedAt: string | null;
  sequenceCount: number;
  skippedCount: number;
  detail: string | null;
}

export interface ScreeningRunSequence {
  name: string;
  label: string;
  length: number;
  aclidEligible: boolean;
}

export interface ScreeningRunAclidLeg {
  screenId: string | null;
  homologyStatus: BiosecurityScreeningStatus;
  status: string | null;
  regulatoryStatus: string | null;
  verificationStatus: string | null;
  decisionStatus: string | null;
  matchCount: number | null;
  materialCount: number | null;
  findings: unknown;
  materialSummary: unknown;
  details: unknown;
  raw: unknown;
  detail: string | null;
}

export interface ScreeningRunSecureDnaLeg {
  batchId: string | null;
  status: BiosecurityScreeningStatus;
  detail: string | null;
}

export interface ScreeningRunDetail extends ScreeningRunSummary {
  sequences: ScreeningRunSequence[];
  aclid: ScreeningRunAclidLeg | null;
  secureDna: ScreeningRunSecureDnaLeg | null;
}
