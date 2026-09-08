export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

/** An access column of the DAMPLab access matrix. CLIENT is the floor — it means "no access group". */
export enum AccessTier {
  Administrator = 'ADMINISTRATOR',
  Client = 'CLIENT',
  EquipmentUser = 'EQUIPMENT_USER',
  Technician = 'TECHNICIAN'
}

export type ActivityEvent = {
  __typename?: 'ActivityEvent';
  actorDisplayName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  serviceName?: Maybe<Scalars['String']['output']>;
  sowId?: Maybe<Scalars['String']['output']>;
  sowVersionNumber?: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
  workflowId?: Maybe<Scalars['String']['output']>;
  workflowNodeId?: Maybe<Scalars['String']['output']>;
};

export type AddEdgeInput = {
  /** ID used in identify the edge in the workflow */
  id: Scalars['ID']['input'];
  /** React Flow representation of the edge for re-generating the graph. Nullable for the same reason as WorkflowNode.reactNode: older edges have none, and selecting a non-nullable field would fail the whole query. */
  reactEdge?: InputMaybe<Scalars['JSON']['input']>;
  /** The ID of the source node, this is the workflow ID */
  source: Scalars['ID']['input'];
  /** The ID of the destination node, this is the workflow ID */
  target: Scalars['ID']['input'];
};

export type AddNodeInput = {
  /** Additional instructions for this portion of the workflow */
  additionalInstructions: Scalars['String']['input'];
  /** When the card was archived. */
  archivedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Who archived it (username/email). */
  archivedBy?: InputMaybe<Scalars['String']['input']>;
  /** The state the card was in when archived — an audit trail, since an admin may archive work that was still in progress. */
  archivedFromState?: InputMaybe<WorkflowNodeState>;
  /** Display name of assigned staff member */
  assigneeDisplayName?: InputMaybe<Scalars['String']['input']>;
  /** Keycloak sub (or id) of assigned staff member */
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  /** protocols.io step identifiers the assigned technician has checked off in the bench view. Persisted so step progress survives refresh. Cleared/ignored when there is no linked protocol. */
  completedSteps?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Estimated duration in minutes (lab monitor) */
  estimatedMinutes?: InputMaybe<Scalars['Float']['input']>;
  /** Parameters defined earlier in the graph. Always returned as an array of { id, value }; multi-value params have value: string[]. Stored in array shape for new/updated nodes. */
  formData: Scalars['JSON']['input'];
  /** ID used in identify the node in the workflow */
  id: Scalars['ID']['input'];
  /** Planned end of this operation’s inventory hold. Optional; defaults to start + estimatedMinutes (or a few hours). */
  inventoryReservationEnd?: InputMaybe<Scalars['DateTime']['input']>;
  /** Planned start of this operation’s inventory hold (for the shared scheduling/availability pool). Optional; defaults to startedAt/now. */
  inventoryReservationStart?: InputMaybe<Scalars['DateTime']['input']>;
  /** Archived: hidden from the lab monitor board, but retained. */
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  /** True when nothing upstream of this operation is outstanding — every predecessor in its workflow is COMPLETE. Only populated by assignedOperations; a blocking predecessor is often assigned to someone else, so this cannot be derived from the caller's own operations. */
  isReadyToStart?: InputMaybe<Scalars['Boolean']['input']>;
  /** Human readable name of the service */
  label: Scalars['String']['input'];
  /** Snapshot of service price at submission time */
  price?: InputMaybe<Scalars['Float']['input']>;
  /** React Flow representation of the node (including its canvas position) for re-generating the graph. Nullable: nodes created before this was persisted, or through paths that never set it, have none — and a non-nullable field would make merely selecting it fail the whole job query. */
  reactNode?: InputMaybe<Scalars['JSON']['input']>;
  /** The ID of the service this node is a part of */
  serviceId: Scalars['ID']['input'];
  /** When node entered IN_PROGRESS (for elapsed time) */
  startedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Inventory items currently held by this node while it is IN_PROGRESS. Cleared automatically on transition out of IN_PROGRESS. */
  usedInventory?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Parent workflow id, for grouping a bench list. Only populated by assignedOperations. */
  workflowId?: InputMaybe<Scalars['ID']['input']>;
};

export type AddWorkflowInput = {
  /** The edges in the workflow */
  edges: Array<AddEdgeInput>;
  /** The name of the workflow */
  name: Scalars['String']['input'];
  /** The nodes in the workflow */
  nodes: Array<AddNodeInput>;
};

export type AllJobsInput = {
  /** Archive bucket to return (default ACTIVE — archived jobs hidden) */
  archiveFilter?: InputMaybe<JobArchiveFilter>;
  /** Filter by presence of SOW */
  hasSow?: InputMaybe<Scalars['Boolean']['input']>;
  /** Include jobs that have been closed out — CLOSED, CANCELLED and REJECTED. False by default, so the listing shows live work. COMPLETE is not in that set: lab work finishing is not the same as the job being done with. Ignored when `state` names one of them explicitly. */
  includeClosed?: InputMaybe<Scalars['Boolean']['input']>;
  /** Items per page */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page (1-based) */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Case-insensitive search on name, id, username, email, institute */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort field (default SUBMITTED) */
  sortBy?: InputMaybe<JobSortField>;
  /** Sort order (default DESC = latest first) */
  sortOrder?: InputMaybe<SortOrder>;
  /** Filter by job state */
  state?: InputMaybe<JobState>;
};

export type Announcement = {
  __typename?: 'Announcement';
  /** Which matrix columns may see this. Absent or empty means everyone — that is how announcements written before this field keep working, so the input types reject an empty list. */
  audienceRoles?: Maybe<Array<AnnouncementAudience>>;
  /** unique database generated id */
  id: Scalars['ID']['output'];
  is_displayed: Scalars['Boolean']['output'];
  /** body text of announcement */
  text: Scalars['String']['output'];
  /** time of creation */
  timestamp: Scalars['DateTime']['output'];
};

export enum AnnouncementAudience {
  Administrator = 'ADMINISTRATOR',
  Client = 'CLIENT',
  EquipmentUser = 'EQUIPMENT_USER',
  Technician = 'TECHNICIAN'
}

/** A read-only API key for external systems to query the GraphQL API. */
export type ApiKey = {
  __typename?: 'ApiKey';
  /** When the key was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Who created the key. */
  createdBy?: Maybe<Scalars['String']['output']>;
  /** Optional expiry; the key is rejected after this time. */
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** When the key was last used to authenticate a request. */
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Human-readable label for the key (e.g. "LIMS export", "Dashboard sync"). */
  name: Scalars['String']['output'];
  /** Non-secret display prefix of the key (e.g. "dl_ab12cd34"). */
  prefix: Scalars['String']['output'];
  /** Whether the key has been revoked (rejected immediately). */
  revoked: Scalars['Boolean']['output'];
  /** When the key was revoked. */
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Access scope. Currently always "read" (query-only). */
  scope: Scalars['String']['output'];
};

/** A bug backlog card, sourced from ClickUp and filed by the n8n triage workflow. */
export type BacklogCard = {
  __typename?: 'BacklogCard';
  actual?: Maybe<Scalars['String']['output']>;
  /** Feature area the bug was reported against. */
  area?: Maybe<Scalars['String']['output']>;
  /** Names of anyone assigned in ClickUp. Assignment is done by hand during triage — the pipeline never guesses an owner. */
  assignees: Array<Scalars['String']['output']>;
  /** AI-assigned category (ui, backend, data, auth, perf, …). */
  category?: Maybe<Scalars['String']['output']>;
  /** Direct ClickUp link. STAFF ONLY — null for non-staff, who have no ClickUp access. */
  clickupUrl?: Maybe<Scalars['String']['output']>;
  /** Number of comments on the card. */
  commentCount: Scalars['Int']['output'];
  /** ISO timestamp. */
  createdAt: Scalars['String']['output'];
  expected?: Maybe<Scalars['String']['output']>;
  /** ClickUp task id. */
  id: Scalars['ID']['output'];
  /** True when the card sits in a closed-type status. */
  isClosed: Scalars['Boolean']['output'];
  /** How many times this bug has been reported (deduped by triage). */
  occurrences: Scalars['Int']['output'];
  /** Proposed fix or action item from triage. */
  proposedFix?: Maybe<Scalars['String']['output']>;
  /** Reporter email, for following up on a report. Visible to all authenticated viewers. */
  reporterEmail?: Maybe<Scalars['String']['output']>;
  /** Who reported the bug. Visible to all authenticated viewers so the team can follow up for detail. */
  reporterName?: Maybe<Scalars['String']['output']>;
  /** Session/campaign tag, e.g. "testathon". */
  sessionTag?: Maybe<Scalars['String']['output']>;
  /** Derived from the ClickUp task priority. */
  severity: BacklogSeverity;
  /** The originating BugReport id in our own DB. */
  sourceBugId?: Maybe<Scalars['String']['output']>;
  /** ClickUp status name (Open, in progress, review, blocked, on hold, Closed). */
  status: Scalars['String']['output'];
  /** Steps to reproduce, as reported. */
  stepsToReproduce?: Maybe<Scalars['String']['output']>;
  /** One-line summary written by triage. */
  summary?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  /** ISO timestamp. */
  updatedAt?: Maybe<Scalars['String']['output']>;
};

/** A backlog card together with its comment thread. */
export type BacklogCardDetail = {
  __typename?: 'BacklogCardDetail';
  card: BacklogCard;
  comments: Array<BacklogComment>;
};

/** A comment on a backlog card. */
export type BacklogComment = {
  __typename?: 'BacklogComment';
  /** Display name of whoever wrote it. For comments posted from the app this is the app user, parsed from the attribution prefix; otherwise the ClickUp author. */
  author: Scalars['String']['output'];
  /** ISO timestamp. */
  createdAt: Scalars['String']['output'];
  /** True when the comment originated in the app rather than being written directly in ClickUp. */
  fromApp: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Comment body, with any attribution prefix stripped. */
  text: Scalars['String']['output'];
};

export enum BacklogSeverity {
  Blocker = 'BLOCKER',
  Cosmetic = 'COSMETIC',
  Major = 'MAJOR',
  Minor = 'MINOR',
  Unknown = 'UNKNOWN'
}

/** A user with confirmed, unbilled inventory usage awaiting a SOW/invoice. */
export type BillableOwner = {
  __typename?: 'BillableOwner';
  bookingCount: Scalars['Int']['output'];
  ownerEmail: Scalars['String']['output'];
  ownerName?: Maybe<Scalars['String']['output']>;
  ownerSub: Scalars['ID']['output'];
  totalCost: Scalars['Float']['output'];
};

/** A booking/usage record for a bookable inventory item (timed machine or quantity consumable). */
export type Booking = {
  __typename?: 'Booking';
  /** Database generated id */
  _id: Scalars['ID']['output'];
  /** Confirmed actual hours used (TIMED). */
  actualHours?: Maybe<Scalars['Float']['output']>;
  /** Confirmed actual quantity used (QUANTITY). */
  actualQuantity?: Maybe<Scalars['Int']['output']>;
  /** Invoice this usage was billed under (once BILLED). */
  billedInvoiceId?: Maybe<Scalars['ID']['output']>;
  /** SOW this usage was billed under (once BILLED). */
  billedSowId?: Maybe<Scalars['ID']['output']>;
  /** Whether this usage has been rolled into a SOW/invoice. */
  billingStatus: BookingBillingStatus;
  /** Computed cost = (confirmed-or-booked usage) × rate snapshot. */
  cost?: Maybe<Scalars['Float']['output']>;
  /** Display name of whoever created the booking. */
  createdByName?: Maybe<Scalars['String']['output']>;
  /** Keycloak sub of whoever created the booking. */
  createdBySub?: Maybe<Scalars['String']['output']>;
  /** Customer category snapshot, used to resolve the rate. */
  customerCategory?: Maybe<Scalars['String']['output']>;
  /** Reserved end time (TIMED). */
  endTime?: Maybe<Scalars['DateTime']['output']>;
  /** The booked inventory item. */
  inventoryItem: Scalars['ID']['output'];
  /** Snapshot of the item name at booking time. */
  inventoryName?: Maybe<Scalars['String']['output']>;
  /** Snapshot of the item type. */
  inventoryType?: Maybe<Scalars['String']['output']>;
  /** TIMED (machine, hourly) or QUANTITY (consumable, per-unit). */
  kind: BookingKind;
  /** Free-text notes. */
  notes?: Maybe<Scalars['String']['output']>;
  /** Email of the owner. */
  ownerEmail: Scalars['String']['output'];
  /** Owner institution (for SOW/invoice). */
  ownerInstitution?: Maybe<Scalars['String']['output']>;
  /** Display name of the owner. */
  ownerName?: Maybe<Scalars['String']['output']>;
  /** Keycloak sub of the user the booking is for (billed party). */
  ownerSub: Scalars['String']['output'];
  /** Reserved quantity (QUANTITY). */
  quantity?: Maybe<Scalars['Int']['output']>;
  /** Rate snapshot ($/hour or $/unit) for the owner category at booking time. */
  rateSnapshot?: Maybe<Scalars['Float']['output']>;
  /** Reserved start time (TIMED). */
  startTime?: Maybe<Scalars['DateTime']['output']>;
  /** Lifecycle status. */
  status: BookingStatus;
  /** Whether actual usage has been confirmed (required before billing). */
  usageConfirmed?: Maybe<Scalars['Boolean']['output']>;
  /** When usage was confirmed. */
  usageConfirmedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who confirmed the usage. */
  usageConfirmedBy?: Maybe<Scalars['String']['output']>;
  /** Date the consumable is used (QUANTITY). */
  usedOn?: Maybe<Scalars['DateTime']['output']>;
};

export enum BookingBillingStatus {
  Billed = 'BILLED',
  Unbilled = 'UNBILLED'
}

export enum BookingKind {
  Quantity = 'QUANTITY',
  Timed = 'TIMED'
}

export enum BookingStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  InUse = 'IN_USE',
  Reserved = 'RESERVED'
}

/** File attached to a bug report (e.g. screenshot) */
export type BugAttachment = {
  __typename?: 'BugAttachment';
  /** MIME type of the uploaded file */
  contentType: Scalars['String']['output'];
  /** Original filename of the uploaded file */
  filename?: Maybe<Scalars['String']['output']>;
  /** S3 object key where the file is stored */
  key: Scalars['String']['output'];
  /** Size of the file in bytes */
  size: Scalars['Float']['output'];
  /** When this attachment was recorded */
  uploadedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Temporary URL to download this attachment */
  url?: Maybe<Scalars['String']['output']>;
};

/** Attachment metadata for a bug report after a successful upload */
export type BugAttachmentInput = {
  /** MIME type of the uploaded file */
  contentType: Scalars['String']['input'];
  /** Original filename of the uploaded file */
  filename: Scalars['String']['input'];
  /** S3 key where the uploaded file is stored */
  key: Scalars['String']['input'];
  /** Size of the uploaded file in bytes */
  size: Scalars['Float']['input'];
};

/** Presigned URL details for uploading a single bug attachment */
export type BugAttachmentUpload = {
  __typename?: 'BugAttachmentUpload';
  contentType: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  key: Scalars['String']['output'];
  size: Scalars['Float']['output'];
  uploadUrl: Scalars['String']['output'];
};

/** File metadata used when requesting presigned upload URLs for bug attachments */
export type BugAttachmentUploadRequest = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  size: Scalars['Float']['input'];
};

/** User-submitted bug report for the DAMPLab UI */
export type BugReport = {
  __typename?: 'BugReport';
  /** What actually happened */
  actual?: Maybe<Scalars['String']['output']>;
  /** Page or feature the bug is on (e.g. "SOW generator") */
  area?: Maybe<Scalars['String']['output']>;
  /** Optional screenshots or files attached to this bug report */
  attachments?: Maybe<Array<Maybe<BugAttachment>>>;
  /** When this bug report was created */
  createdAt: Scalars['DateTime']['output'];
  /** Free-form description of the bug as reported by the user */
  description: Scalars['String']['output'];
  /** What the reporter expected to happen */
  expected?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Email of the user who reported the bug (if available) */
  reporterEmail?: Maybe<Scalars['String']['output']>;
  /** Name of the user who reported the bug (if available) */
  reporterName?: Maybe<Scalars['String']['output']>;
  /** Reported severity of the bug */
  severity?: Maybe<BugSeverity>;
  /** Numbered steps to reproduce */
  stepsToReproduce?: Maybe<Scalars['String']['output']>;
  /** Optional session/campaign tag (e.g. "testathon") for filtering */
  tag?: Maybe<Scalars['String']['output']>;
};

/** Lightweight view of a bug report for list screens */
export type BugReportSummary = {
  __typename?: 'BugReportSummary';
  actual?: Maybe<Scalars['String']['output']>;
  area?: Maybe<Scalars['String']['output']>;
  attachments?: Maybe<Array<Maybe<BugAttachment>>>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  expected?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reporterEmail?: Maybe<Scalars['String']['output']>;
  reporterName?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<BugSeverity>;
  stepsToReproduce?: Maybe<Scalars['String']['output']>;
  tag?: Maybe<Scalars['String']['output']>;
};

/** Filter options when querying bug reports */
export type BugReportsFilterInput = {
  /** Filter by reporter email or name (partial, case-insensitive match) */
  reporter?: InputMaybe<Scalars['String']['input']>;
  /** Full-text search against bug description */
  searchText?: InputMaybe<Scalars['String']['input']>;
  /** Filter by severity */
  severity?: InputMaybe<BugSeverity>;
  /** Filter by session/campaign tag (exact match) */
  tag?: InputMaybe<Scalars['String']['input']>;
};

/** Response wrapper for bug report list queries */
export type BugReportsResult = {
  __typename?: 'BugReportsResult';
  items: Array<BugReportSummary>;
};

export enum BugSeverity {
  Blocker = 'BLOCKER',
  Cosmetic = 'COSMETIC',
  Major = 'MAJOR',
  Minor = 'MINOR'
}

export type Bundle = {
  __typename?: 'Bundle';
  icon: Scalars['String']['output'];
  /** unique database generated id */
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  services: Array<DampLabService>;
};

export type BundleChange = {
  icon?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  services?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CancelJobInput = {
  jobId: Scalars['ID']['input'];
  operationId: Scalars['String']['input'];
  /** Shown to the lab in the automated comment. */
  reason: Scalars['String']['input'];
};

/** A service as the client-facing catalog page shows it: name, description, the caller's own price, and — for staff only — the full tier table and parameters. */
export type CatalogServiceView = {
  __typename?: 'CatalogServiceView';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** How many parameters this service takes. Always present — it is a shape fact, not a price. */
  parameterCount?: Maybe<Scalars['Int']['output']>;
  /** The full parameter definitions, which carry per-parameter prices. **Null without internal-fields:read.** */
  parameters?: Maybe<Scalars['JSON']['output']>;
  /** The caller's own resolved price, computed server-side from their pricing group. Null when the service prices per parameter rather than per service, or when no rate is set for their category. */
  price?: Maybe<Scalars['Float']['output']>;
  /** All four tiers. **Null without internal-fields:read** — the caller sees only their own price, above. */
  pricing?: Maybe<Pricing>;
  /** How the price is arrived at, for display next to it. */
  pricingModeLabel?: Maybe<Scalars['String']['output']>;
  /** Service category name, for grouping. */
  serviceCategoryName?: Maybe<Scalars['String']['output']>;
  /** The unit the price is quoted in. */
  unit?: Maybe<Scalars['String']['output']>;
};

/** Represents a category of DampLab services */
export type Category = {
  __typename?: 'Category';
  /** unique database generated ID */
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  /** List of DampLab services in this category */
  services: Array<DampLabService>;
};

export type CategoryChange = {
  label?: InputMaybe<Scalars['String']['input']>;
  services?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Represents a column mapping configuration for Excel templates */
export type ColumnMapping = {
  __typename?: 'ColumnMapping';
  /** The field identifier */
  field: Scalars['String']['output'];
  /** The display name for the column header */
  headerName: Scalars['String']['output'];
  /** The order position of the column */
  order: Scalars['Int']['output'];
  /** The data type of the column */
  type: Scalars['String']['output'];
  /** The width of the column in pixels */
  width: Scalars['Int']['output'];
};

/** Comments on jobs, allowing both staff and customers to add comments and view comment history */
export type Comment = {
  __typename?: 'Comment';
  attachments?: Maybe<Array<CommentAttachment>>;
  /** Username or email of the person who created the comment */
  author: Scalars['String']['output'];
  /** Type of author (STAFF or CLIENT) */
  authorType: CommentAuthorType;
  /** Content of the comment */
  content: Scalars['String']['output'];
  /** Date when the comment was created */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** If true, only visible to staff; if false, visible to both staff and client */
  isInternal: Scalars['Boolean']['output'];
  /** ID of the job this comment belongs to */
  jobId: Scalars['ID']['output'];
  /** Optional WorkflowNode _id this comment is scoped to. Set for technician bench-view notes (per-operation); null for job-level comments. Lets the bench view show notes/files per operation while reusing the job-scoped attachment storage. */
  nodeId?: Maybe<Scalars['ID']['output']>;
  /** Caller-provided idempotency key for command-generated comments. */
  operationId?: Maybe<Scalars['String']['output']>;
  /** Date when the comment was last updated */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** File attached to a comment */
export type CommentAttachment = {
  __typename?: 'CommentAttachment';
  /** MIME type of the uploaded file */
  contentType: Scalars['String']['output'];
  /** Original filename of the uploaded file */
  filename?: Maybe<Scalars['String']['output']>;
  /** S3 object key where the file is stored */
  key: Scalars['String']['output'];
  /** Size of the file in bytes */
  size: Scalars['Int']['output'];
  /** When this attachment was recorded */
  uploadedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Temporary URL to download this attachment */
  url?: Maybe<Scalars['String']['output']>;
};

export type CommentAttachmentInput = {
  /** MIME type */
  contentType: Scalars['String']['input'];
  /** Original filename */
  filename?: InputMaybe<Scalars['String']['input']>;
  /** S3 object key returned by the upload URL request */
  key: Scalars['String']['input'];
  /** Size in bytes */
  size: Scalars['Int']['input'];
};

export enum CommentAuthorType {
  Client = 'CLIENT',
  Staff = 'STAFF'
}

export type CreateAnnouncementInput = {
  /** Omit for everyone. An empty list is an error, not "nobody". */
  audienceRoles?: InputMaybe<Array<AnnouncementAudience>>;
  is_displayed?: InputMaybe<Scalars['Boolean']['input']>;
  text: Scalars['String']['input'];
  timestamp?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Result of creating an API key — includes the raw secret shown exactly once. */
export type CreateApiKeyResult = {
  __typename?: 'CreateApiKeyResult';
  apiKey: ApiKey;
  /** The raw API key secret. Copy it now — it cannot be shown again. */
  key: Scalars['String']['output'];
};

export type CreateBookingInput = {
  /** Customer category for rate resolution (e.g. INTERNAL_CUSTOMERS). */
  customerCategory?: InputMaybe<Scalars['String']['input']>;
  /** Reservation end (TIMED items). */
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  /** Inventory item to book. */
  inventoryItemId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Owner email. Defaults to current user. */
  ownerEmail?: InputMaybe<Scalars['String']['input']>;
  ownerInstitution?: InputMaybe<Scalars['String']['input']>;
  ownerName?: InputMaybe<Scalars['String']['input']>;
  /** Owner Keycloak sub (staff booking on behalf). Defaults to current user. */
  ownerSub?: InputMaybe<Scalars['String']['input']>;
  /** Quantity to book (QUANTITY items). */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** Reservation start (TIMED items). */
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
  /** Date the consumable is used (QUANTITY items). Defaults to now. */
  usedOn?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Input for creating a new bug report */
export type CreateBugReportInput = {
  /** What actually happened */
  actual?: InputMaybe<Scalars['String']['input']>;
  /** Page or feature the bug is on */
  area?: InputMaybe<Scalars['String']['input']>;
  /** Free-form description of the bug as reported by the user */
  description: Scalars['String']['input'];
  /** What the reporter expected */
  expected?: InputMaybe<Scalars['String']['input']>;
  /** Reported severity */
  severity?: InputMaybe<BugSeverity>;
  /** Numbered steps to reproduce */
  stepsToReproduce?: InputMaybe<Scalars['String']['input']>;
  /** Optional session/campaign tag (e.g. "testathon") */
  tag?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBundle = {
  icon: Scalars['String']['input'];
  label: Scalars['String']['input'];
  services?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateCategory = {
  label: Scalars['String']['input'];
  services: Array<Scalars['ID']['input']>;
};

/** Input for creating a column mapping */
export type CreateColumnMappingInput = {
  /** The field identifier */
  field: Scalars['String']['input'];
  /** The display name for the column header */
  headerName: Scalars['String']['input'];
  /** The order position of the column */
  order: Scalars['Int']['input'];
  /** The data type of the column */
  type: Scalars['String']['input'];
  /** The width of the column in pixels */
  width: Scalars['Int']['input'];
};

export type CreateCommentInput = {
  /** Files already uploaded to S3 to attach to this comment. */
  attachments?: InputMaybe<Array<CommentAttachmentInput>>;
  /** Username or email of the person creating the comment */
  author: Scalars['String']['input'];
  /** Type of author (STAFF or CLIENT) */
  authorType: CommentAuthorType;
  /** Content of the comment */
  content: Scalars['String']['input'];
  /** If true, only visible to staff; if false, visible to both staff and client */
  isInternal?: InputMaybe<Scalars['Boolean']['input']>;
  /** ID of the job this comment belongs to */
  jobId: Scalars['ID']['input'];
  /** Optional WorkflowNode _id to scope this comment to (technician bench-view note for one operation). */
  nodeId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateInventoryItem = {
  /** Whether users can book/reserve this item. Machines book a time slot (HOURLY); consumables book a quantity (PER_UNIT). */
  bookable?: InputMaybe<Scalars['Boolean']['input']>;
  /** Free-text description (model, capabilities, notes). */
  description?: InputMaybe<Scalars['String']['input']>;
  dimensionH?: InputMaybe<DimensionInput>;
  dimensionL?: InputMaybe<DimensionInput>;
  dimensionW?: InputMaybe<DimensionInput>;
  /** Whether this item has an active service contract. */
  hasServiceContract?: InputMaybe<Scalars['Boolean']['input']>;
  /** Username or sub of whoever last created or modified this item. */
  lastModifiedBy?: InputMaybe<Scalars['String']['input']>;
  /** Physical location in the lab. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** Manufacturer model number. Items with the same model # are the same type of equipment. */
  modelNumber?: InputMaybe<Scalars['String']['input']>;
  /** Human readable name (e.g. "OT-2 #1", "Bioanalyzer"). */
  name: Scalars['String']['input'];
  placements?: InputMaybe<Array<StationPlacementInput>>;
  /** Booking rate by customer category, interpreted per rateType: $/hour (HOURLY) or $/unit (PER_UNIT). */
  pricing?: InputMaybe<PricingInput>;
  /** Reserved for future multi-unit support. Currently always 1. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** How booked usage is billed: HOURLY ($/hour, time-slot) or PER_UNIT ($/unit, quantity). Defaults inferred from type when unset (CONSUMABLE → PER_UNIT, else HOURLY). */
  rateType?: InputMaybe<InventoryRateType>;
  /** Serial number for tracking individual units. Internal use only — hidden from non-staff. */
  serialNumber?: InputMaybe<Scalars['String']['input']>;
  /** Expiration date of the service contract, if any. */
  serviceContractExpiration?: InputMaybe<Scalars['DateTime']['input']>;
  /** Legacy single station assignment. Read via placements instead. */
  stationId?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Coarse category for grouping on the availability board. Free string — suggested values: EQUIPMENT, HOOD, STORAGE, CONSUMABLE. */
  type?: InputMaybe<Scalars['String']['input']>;
  /** System-generated unique identifier (e.g. INV-0001). Not the Mongo _id. */
  uniqueId?: InputMaybe<Scalars['String']['input']>;
};

/** Create an invoice for a job covering some or all of its SOW service lines */
export type CreateInvoiceInput = {
  /** Job Mongo _id */
  jobId: Scalars['ID']['input'];
  /** The service lines to bill, by position in SOW.billableServices. Provide this or serviceIds, not both. */
  services?: InputMaybe<Array<InvoiceServiceSelectionInput>>;
};

export type CreateJobInput = {
  /** Display name for the client (captured at checkout). Used for customer-facing documents like SOWs. */
  clientDisplayName?: InputMaybe<Scalars['String']['input']>;
  /** Email of the actual client when a staff member submits on their behalf. */
  clientEmail?: InputMaybe<Scalars['String']['input']>;
  /** The institute the user is from */
  institute: Scalars['String']['input'];
  /** Human readable name of the workflow */
  name: Scalars['String']['input'];
  /** Additional information the user provided */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** The workflows that were submitted together */
  workflows: Array<AddWorkflowInput>;
};

export type CreateSowInput = {
  /** Additional information */
  additionalInformation?: InputMaybe<Scalars['String']['input']>;
  /** Address of the client */
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  /** Email address of the client */
  clientEmail: Scalars['String']['input'];
  /** Institution of the client */
  clientInstitution: Scalars['String']['input'];
  /** Name of the client */
  clientName: Scalars['String']['input'];
  /** User who created the SOW (technician username/email) */
  createdBy: Scalars['String']['input'];
  /** Date the SOW was created */
  date?: InputMaybe<Scalars['DateTime']['input']>;
  /** Array of deliverable descriptions */
  deliverables: Array<Scalars['String']['input']>;
  /** ID of the job this SOW is for */
  jobId: Scalars['String']['input'];
  /** Pricing information */
  pricing: SowPricingInput;
  /** Resource allocation */
  resources: SowResourcesInput;
  /** Array of scope of work bullet points */
  scopeOfWork: Array<Scalars['String']['input']>;
  /** Services included in the SOW */
  services: Array<SowServiceInput>;
  /** Technician-entered title for the SOW document (e.g. "Agreement to Perform Research Services") */
  sowTitle?: InputMaybe<Scalars['String']['input']>;
  /** Status of the SOW */
  status?: InputMaybe<SowStatus>;
  /** Legacy free-text terms. The live document text lives on the SOW version; new SOWs need not send this. */
  terms?: InputMaybe<Scalars['String']['input']>;
  /** Timeline information */
  timeline: SowTimelineInput;
};

export type CreateService = {
  /** When true, a canvas node for this service offers a "Number of runs" count, and its price is multiplied by it. Off by default: most operations run once, and an always-present run count is noise on every node. Affects only what the editor offers going forward — a run count already stored on a submitted job keeps pricing and displaying either way, so turning this off never silently reprices history. */
  allowMultipleRuns?: InputMaybe<Scalars['Boolean']['input']>;
  allowedConnections: Array<Scalars['ID']['input']>;
  /** Array of deliverable descriptions for this service */
  deliverables?: Array<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  /** Customer-category specific price for EXTERNAL ACADEMIC customers when pricingMode is SERVICE. */
  externalAcademicPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL MARKET customers when pricingMode is SERVICE. */
  externalMarketPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL NO-SALARY customers when pricingMode is SERVICE. */
  externalNoSalaryPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL customers when pricingMode is SERVICE. Falls back to price when unset. */
  externalPrice?: InputMaybe<Scalars['Float']['input']>;
  /** URL to the icon of the service */
  icon: Scalars['String']['input'];
  /** Customer-category specific price for INTERNAL customers when pricingMode is SERVICE. Falls back to price when unset. */
  internalPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Inventory items this service typically needs. Informational (soft requirement): the lab monitor surfaces these in the picker but does not block the IN_PROGRESS transition if none are selected. */
  inventoryRequirements?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Human readable name of the service */
  name: Scalars['String']['input'];
  /** Free-text internal notes for DAMPLab staff. Not shown to customers. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** If there are grouped parameters */
  paramGroups?: InputMaybe<Scalars['JSON']['input']>;
  /** Parameters that are part of the service. Each parameter may include allowMultipleValues (boolean, default false) and price (number). When allowMultipleValues is true, formData values may be stored and returned as string[]. */
  parameters: Scalars['JSON']['input'];
  /** The approximate cost to use this service when pricingMode is SERVICE. */
  price?: InputMaybe<Scalars['Float']['input']>;
  /** Pricing by customer category for this service. Prefer this over price/internalPrice/externalPrice. */
  pricing?: InputMaybe<PricingInput>;
  /** How pricing is determined for this service. */
  pricingMode?: InputMaybe<ServicePricingMode>;
  /** Legacy single protocols.io identifier. Read via protocolIds instead. */
  protocolId?: InputMaybe<Scalars['String']['input']>;
  /** protocols.io protocol identifiers for this operation, IN EXECUTION ORDER — array position is the sequence the admin specified. Each entry is the short id from the protocol URL (e.g. "n92ld46yxl5b" from protocols.io/view/...-n92ld46yxl5b/v1). References only; protocol content is fetched on demand and never synced into our DB. Note a protocol may be shared by several operations, in which case they share its step→equipment map. */
  protocolIds: Array<Scalars['String']['input']>;
  /** The by-product of the service */
  result?: InputMaybe<Scalars['JSON']['input']>;
  /** The expected fields in the result of the service */
  resultParams?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Service category name for downstream integrations. */
  serviceCategoryName?: InputMaybe<Scalars['String']['input']>;
  /** Service category number for downstream integrations. */
  serviceCategoryNumber?: InputMaybe<Scalars['String']['input']>;
  /** Service unit for downstream integrations. */
  unit?: InputMaybe<Scalars['String']['input']>;
};

/** A new text block for one SOW prose section */
export type CreateSowTextPresetInput = {
  /** Staff-facing name for the block */
  name: Scalars['String']['input'];
  /** Catalog key of the section, e.g. "invoiceProcedures" */
  sectionKey: Scalars['String']['input'];
  /** The text itself */
  text?: Scalars['String']['input'];
};

export type CreateStationInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  x?: InputMaybe<Scalars['Float']['input']>;
  y?: InputMaybe<Scalars['Float']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a new template */
export type CreateTemplateInput = {
  /** Column mapping configuration */
  columnMapping: Array<CreateColumnMappingInput>;
  /** Optional description of the template */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the template */
  name: Scalars['String']['input'];
};

export type CreateTrainingResourceInput = {
  /** At least one. An empty list is an error, not "everyone". */
  audienceRoles: Array<AnnouncementAudience>;
  description?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateUploadLogInput = {
  affectedItemIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  createdCount: Scalars['Int']['input'];
  failedCount: Scalars['Int']['input'];
  fieldSnapshots?: InputMaybe<Array<FieldSnapshotInput>>;
  fileName: Scalars['String']['input'];
  rowCount: Scalars['Int']['input'];
  skippedCount: Scalars['Int']['input'];
  updatedCount: Scalars['Int']['input'];
  uploaderName: Scalars['String']['input'];
  uploaderSub?: InputMaybe<Scalars['String']['input']>;
};

export enum CustomerActionRequired {
  ApproveWorkflow = 'APPROVE_WORKFLOW',
  EditWorkflow = 'EDIT_WORKFLOW',
  Reply = 'REPLY'
}

export enum CustomerCategory {
  ExternalCustomerAcademic = 'EXTERNAL_CUSTOMER_ACADEMIC',
  ExternalCustomerMarket = 'EXTERNAL_CUSTOMER_MARKET',
  ExternalCustomerNoSalary = 'EXTERNAL_CUSTOMER_NO_SALARY',
  InternalCustomers = 'INTERNAL_CUSTOMERS'
}

export enum CustomerManagementUserListCategory {
  All = 'ALL',
  ExternalCustomerAcademic = 'EXTERNAL_CUSTOMER_ACADEMIC',
  ExternalCustomerDefault = 'EXTERNAL_CUSTOMER_DEFAULT',
  ExternalCustomerMarket = 'EXTERNAL_CUSTOMER_MARKET',
  ExternalCustomerNoSalary = 'EXTERNAL_CUSTOMER_NO_SALARY',
  InternalCustomers = 'INTERNAL_CUSTOMERS',
  Staff = 'STAFF'
}

/** Services supported by the DampLab */
export type DampLabService = {
  __typename?: 'DampLabService';
  /** When true, a canvas node for this service offers a "Number of runs" count, and its price is multiplied by it. Off by default: most operations run once, and an always-present run count is noise on every node. Affects only what the editor offers going forward — a run count already stored on a submitted job keeps pricing and displaying either way, so turning this off never silently reprices history. */
  allowMultipleRuns?: Maybe<Scalars['Boolean']['output']>;
  /** List of services this service can connect to */
  allowedConnections: Array<DampLabService>;
  /** Array of deliverable descriptions for this service */
  deliverables: Array<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  /**
   * Customer-category specific price for EXTERNAL ACADEMIC customers when pricingMode is SERVICE.
   * @deprecated Use pricing.externalAcademic instead.
   */
  externalAcademicPrice?: Maybe<Scalars['Float']['output']>;
  /**
   * Customer-category specific price for EXTERNAL MARKET customers when pricingMode is SERVICE.
   * @deprecated Use pricing.externalMarket instead.
   */
  externalMarketPrice?: Maybe<Scalars['Float']['output']>;
  /**
   * Customer-category specific price for EXTERNAL NO-SALARY customers when pricingMode is SERVICE.
   * @deprecated Use pricing.externalNoSalary instead.
   */
  externalNoSalaryPrice?: Maybe<Scalars['Float']['output']>;
  /**
   * Customer-category specific price for EXTERNAL customers when pricingMode is SERVICE. Falls back to price when unset.
   * @deprecated Use pricing.external instead.
   */
  externalPrice?: Maybe<Scalars['Float']['output']>;
  /** URL to the icon of the service */
  icon: Scalars['String']['output'];
  /** unique database generated ID */
  id: Scalars['ID']['output'];
  /**
   * Customer-category specific price for INTERNAL customers when pricingMode is SERVICE. Falls back to price when unset.
   * @deprecated Use pricing.internal instead.
   */
  internalPrice?: Maybe<Scalars['Float']['output']>;
  /** Inventory items this service typically needs. Informational (soft requirement): the lab monitor surfaces these in the picker but does not block the IN_PROGRESS transition if none are selected. */
  inventoryRequirements?: Maybe<Array<Scalars['String']['output']>>;
  /** When true, the service is soft-deleted: hidden from catalogs and connection pickers but still resolvable for historical workflows. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Human readable name of the service */
  name: Scalars['String']['output'];
  /** Free-text internal notes for DAMPLab staff. Not shown to customers. */
  notes?: Maybe<Scalars['String']['output']>;
  /** If there are grouped parameters */
  paramGroups?: Maybe<Scalars['JSON']['output']>;
  /** Parameters that are part of the service. Each parameter may include allowMultipleValues (boolean, default false) and price (number). When allowMultipleValues is true, formData values may be stored and returned as string[]. */
  parameters: Scalars['JSON']['output'];
  /** The approximate cost to use this service when pricingMode is SERVICE. */
  price?: Maybe<Scalars['Float']['output']>;
  /** Pricing by customer category for this service. Prefer this over price/internalPrice/externalPrice. */
  pricing?: Maybe<Pricing>;
  /** How pricing is determined for this service. */
  pricingMode?: Maybe<ServicePricingMode>;
  /**
   * Legacy single protocols.io identifier. Read via protocolIds instead.
   * @deprecated Use protocolIds — an operation can have several protocols in sequence.
   */
  protocolId?: Maybe<Scalars['String']['output']>;
  /** protocols.io protocol identifiers for this operation, IN EXECUTION ORDER — array position is the sequence the admin specified. Each entry is the short id from the protocol URL (e.g. "n92ld46yxl5b" from protocols.io/view/...-n92ld46yxl5b/v1). References only; protocol content is fetched on demand and never synced into our DB. Note a protocol may be shared by several operations, in which case they share its step→equipment map. */
  protocolIds: Array<Scalars['String']['output']>;
  /** The by-product of the service */
  result?: Maybe<Scalars['JSON']['output']>;
  /** The expected fields in the result of the service */
  resultParams?: Maybe<Array<Scalars['String']['output']>>;
  /** Service category name for downstream integrations. */
  serviceCategoryName?: Maybe<Scalars['String']['output']>;
  /** Service category number for downstream integrations. */
  serviceCategoryNumber?: Maybe<Scalars['String']['output']>;
  /** Service unit for downstream integrations. */
  unit?: Maybe<Scalars['String']['output']>;
};

export type Dimension = {
  __typename?: 'Dimension';
  /** Unit of measurement (e.g. cm, mm, kg). */
  unit: Scalars['String']['output'];
  /** Numeric value of the measurement. */
  value: Scalars['Float']['output'];
};

export type DimensionInput = {
  unit: Scalars['String']['input'];
  value: Scalars['Float']['input'];
};

export enum DocumentBlocker {
  AcceptedSourceUnavailable = 'ACCEPTED_SOURCE_UNAVAILABLE',
  AwaitingCustomerSignature = 'AWAITING_CUSTOMER_SIGNATURE',
  AwaitingSentVersion = 'AWAITING_SENT_VERSION',
  DocumentStale = 'DOCUMENT_STALE',
  DraftIncomplete = 'DRAFT_INCOMPLETE',
  JobChangedSinceAcceptance = 'JOB_CHANGED_SINCE_ACCEPTANCE',
  NotAccepted = 'NOT_ACCEPTED',
  NoDraftToSend = 'NO_DRAFT_TO_SEND',
  StaleSignVersion = 'STALE_SIGN_VERSION',
  UnsentDraft = 'UNSENT_DRAFT'
}

/** Before/after snapshot of a single inventory item affected by an upload. */
export type FieldSnapshot = {
  __typename?: 'FieldSnapshot';
  /** What happened: CREATE, UPDATE, REACTIVATE, or SKIP. */
  action: Scalars['String']['output'];
  /** Field values after the change. */
  after?: Maybe<Scalars['JSON']['output']>;
  /** Field values before the change (null for creates). */
  before?: Maybe<Scalars['JSON']['output']>;
  /** The inventory item id. */
  itemId: Scalars['ID']['output'];
};

export type FieldSnapshotInput = {
  action: Scalars['String']['input'];
  after?: InputMaybe<Scalars['JSON']['input']>;
  before?: InputMaybe<Scalars['JSON']['input']>;
  itemId: Scalars['ID']['input'];
};

export type GenerateUsageBillingInput = {
  additionalInformation?: InputMaybe<Scalars['String']['input']>;
  /** Override the billed institution (else taken from the bookings). */
  billToInstitution?: InputMaybe<Scalars['String']['input']>;
  /** Confirmed, unbilled booking ids to roll into the SOW + invoice. */
  bookingIds: Array<Scalars['ID']['input']>;
  /** Owner (billed user) Keycloak sub. */
  ownerSub: Scalars['ID']['input'];
  /** Optional terms text (defaults to standard terms). */
  terms?: InputMaybe<Scalars['String']['input']>;
  /** Optional SOW title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** An inventory item that is unavailable for a given window, and why. */
export type InventoryConflict = {
  __typename?: 'InventoryConflict';
  end?: Maybe<Scalars['DateTime']['output']>;
  itemId: Scalars['ID']['output'];
  /** Human-readable reason, e.g. "held by op X (job #04217)" or "booked by Jane Doe". */
  label: Scalars['String']['output'];
  /** OPERATION (held by a workflow node) or BOOKING (calendar reservation). */
  source: Scalars['String']['output'];
  start?: Maybe<Scalars['DateTime']['output']>;
};

/** A piece of lab equipment that services can require and workflow nodes can hold during IN_PROGRESS. */
export type InventoryItem = {
  __typename?: 'InventoryItem';
  /** Whether users can book/reserve this item. Machines book a time slot (HOURLY); consumables book a quantity (PER_UNIT). */
  bookable?: Maybe<Scalars['Boolean']['output']>;
  /** Free-text description (model, capabilities, notes). */
  description?: Maybe<Scalars['String']['output']>;
  /** Height dimension. */
  dimensionH?: Maybe<Dimension>;
  /** Length dimension. */
  dimensionL?: Maybe<Dimension>;
  /** Width dimension. */
  dimensionW?: Maybe<Dimension>;
  /** Whether this item has an active service contract. */
  hasServiceContract?: Maybe<Scalars['Boolean']['output']>;
  /** unique database generated id */
  id: Scalars['ID']['output'];
  /** Soft-deleted: hidden from pickers but still resolvable for historical nodes. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Username or sub of whoever last created or modified this item. */
  lastModifiedBy?: Maybe<Scalars['String']['output']>;
  /** Physical location in the lab. */
  location?: Maybe<Scalars['String']['output']>;
  /** Manufacturer model number. Items with the same model # are the same type of equipment. */
  modelNumber?: Maybe<Scalars['String']['output']>;
  /** Human readable name (e.g. "OT-2 #1", "Bioanalyzer"). */
  name: Scalars['String']['output'];
  /** Stations this equipment is placed at, with the quantity at each (equipment→station map). Locational only — does not affect booking capacity. */
  placements: Array<StationPlacement>;
  /** Booking rate by customer category, interpreted per rateType: $/hour (HOURLY) or $/unit (PER_UNIT). */
  pricing?: Maybe<Pricing>;
  /** Reserved for future multi-unit support. Currently always 1. */
  quantity?: Maybe<Scalars['Int']['output']>;
  /** How booked usage is billed: HOURLY ($/hour, time-slot) or PER_UNIT ($/unit, quantity). Defaults inferred from type when unset (CONSUMABLE → PER_UNIT, else HOURLY). */
  rateType?: Maybe<InventoryRateType>;
  /** Serial number for tracking individual units. Internal use only — hidden from non-staff. */
  serialNumber?: Maybe<Scalars['String']['output']>;
  /** Expiration date of the service contract, if any. */
  serviceContractExpiration?: Maybe<Scalars['DateTime']['output']>;
  /**
   * Legacy single station assignment. Read via placements instead.
   * @deprecated Use placements — equipment can be at several stations with a quantity at each.
   */
  stationId?: Maybe<Scalars['ID']['output']>;
  /** Filterable tags for finer categorisation (e.g. "Analytical Equipment", "Centrifuge"). */
  tags: Array<Scalars['String']['output']>;
  /** Coarse category for grouping on the availability board. Free string — suggested values: EQUIPMENT, HOOD, STORAGE, CONSUMABLE. */
  type?: Maybe<Scalars['String']['output']>;
  /** System-generated unique identifier (e.g. INV-0001). Not the Mongo _id. */
  uniqueId?: Maybe<Scalars['String']['output']>;
};

export type InventoryItemChange = {
  /** Whether users can book/reserve this item. Machines book a time slot (HOURLY); consumables book a quantity (PER_UNIT). */
  bookable?: InputMaybe<Scalars['Boolean']['input']>;
  /** Free-text description (model, capabilities, notes). */
  description?: InputMaybe<Scalars['String']['input']>;
  dimensionH?: InputMaybe<DimensionInput>;
  dimensionL?: InputMaybe<DimensionInput>;
  dimensionW?: InputMaybe<DimensionInput>;
  /** Whether this item has an active service contract. */
  hasServiceContract?: InputMaybe<Scalars['Boolean']['input']>;
  /** Soft-deleted: hidden from pickers but still resolvable for historical nodes. */
  isDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  /** Username or sub of whoever last created or modified this item. */
  lastModifiedBy?: InputMaybe<Scalars['String']['input']>;
  /** Physical location in the lab. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** Manufacturer model number. Items with the same model # are the same type of equipment. */
  modelNumber?: InputMaybe<Scalars['String']['input']>;
  /** Human readable name (e.g. "OT-2 #1", "Bioanalyzer"). */
  name?: InputMaybe<Scalars['String']['input']>;
  placements?: InputMaybe<Array<StationPlacementInput>>;
  /** Booking rate by customer category, interpreted per rateType: $/hour (HOURLY) or $/unit (PER_UNIT). */
  pricing?: InputMaybe<PricingInput>;
  /** Reserved for future multi-unit support. Currently always 1. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** How booked usage is billed: HOURLY ($/hour, time-slot) or PER_UNIT ($/unit, quantity). Defaults inferred from type when unset (CONSUMABLE → PER_UNIT, else HOURLY). */
  rateType?: InputMaybe<InventoryRateType>;
  /** Serial number for tracking individual units. Internal use only — hidden from non-staff. */
  serialNumber?: InputMaybe<Scalars['String']['input']>;
  /** Expiration date of the service contract, if any. */
  serviceContractExpiration?: InputMaybe<Scalars['DateTime']['input']>;
  /** Legacy single station assignment. Read via placements instead. */
  stationId?: InputMaybe<Scalars['ID']['input']>;
  /** Filterable tags for finer categorisation (e.g. "Analytical Equipment", "Centrifuge"). */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Coarse category for grouping on the availability board. Free string — suggested values: EQUIPMENT, HOOD, STORAGE, CONSUMABLE. */
  type?: InputMaybe<Scalars['String']['input']>;
  /** System-generated unique identifier (e.g. INV-0001). Not the Mongo _id. */
  uniqueId?: InputMaybe<Scalars['String']['input']>;
};

export enum InventoryRateType {
  Hourly = 'HOURLY',
  PerUnit = 'PER_UNIT'
}

/** Invoice generated for a job, optionally covering a subset of services */
export type Invoice = {
  __typename?: 'Invoice';
  /** SOW pricing adjustments carried onto this invoice, prorated to the services it covers. */
  adjustments: Array<InvoiceAdjustment>;
  /** Billing address (freeform) */
  billedToAddress?: Maybe<Scalars['String']['output']>;
  /** Billing contact email */
  billedToEmail: Scalars['String']['output'];
  /** Billing contact name */
  billedToName: Scalars['String']['output'];
  /** Billing checks that could not be completed when this invoice was generated. */
  billingWarnings?: Maybe<Array<Scalars['String']['output']>>;
  /** Date when the invoice record was created */
  createdAt: Scalars['DateTime']['output'];
  /** User who generated the invoice (technician username/email) */
  createdBy: Scalars['String']['output'];
  /** Customer category used for pricing (if known) */
  customerCategory?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** When the invoice was generated */
  invoiceDate: Scalars['DateTime']['output'];
  /** Invoice number, unique per job (e.g., "04217-001") */
  invoiceNumber: Scalars['String']['output'];
  /** Job this invoice is associated with */
  job: Job;
  /** Customer-facing job identifier (5-digit numeric string) */
  jobDisplayId: Scalars['String']['output'];
  /** ID of the associated job (Mongo _id as string, for convenience/querying) */
  jobId: Scalars['String']['output'];
  /** Job name captured at invoice creation time */
  jobName: Scalars['String']['output'];
  /** Service line items included on this invoice */
  services: Array<InvoiceServiceLineItem>;
  /** Version number of the SOW these lines were billed from, when one was in force. */
  sowVersionNumber?: Maybe<Scalars['Int']['output']>;
  /** Sum of the service line items, BEFORE adjustments. */
  subtotal: Scalars['Float']['output'];
  /** Amount payable: subtotal plus the applied adjustments. */
  totalCost: Scalars['Float']['output'];
};

/** A SOW pricing adjustment as applied to this invoice (prorated for partial invoices). */
export type InvoiceAdjustment = {
  __typename?: 'InvoiceAdjustment';
  /** The original whole-job adjustment amount from the SOW. */
  amount: Scalars['Float']['output'];
  /** The portion actually applied to this invoice (signed: negative for DISCOUNT, positive for ADDITIONAL_COST, 0 for SPECIAL_TERM). */
  appliedAmount: Scalars['Float']['output'];
  /** Description carried over from the SOW. */
  description: Scalars['String']['output'];
  /** This invoice's share of the SOW base cost (1 = the invoice covers the whole job). */
  prorationFactor: Scalars['Float']['output'];
  /** Reason carried over from the SOW. */
  reason?: Maybe<Scalars['String']['output']>;
  /** DISCOUNT reduces, ADDITIONAL_COST increases, SPECIAL_TERM is a note only. */
  type: SowAdjustmentType;
};

/** Service line item captured on an invoice (snapshot at time of generation) */
export type InvoiceServiceLineItem = {
  __typename?: 'InvoiceServiceLineItem';
  /** Category of the service */
  category: Scalars['String']['output'];
  /** Cost of the service line item (already priced) */
  cost: Scalars['Float']['output'];
  /** Description of the service */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Everything baked into cost on top of unitCost — the run count and any other multiplier parameter. */
  multiplier?: Maybe<Scalars['Float']['output']>;
  /** Name of the service */
  name: Scalars['String']['output'];
  /** How unitCost was arrived at, for parameter-priced lines. Absent where there is nothing to itemise. */
  pricingDetails?: Maybe<Array<PricingDetail>>;
  /** The run count alone. Superseded by multiplier for display; kept to match the SOW line. */
  runCount?: Maybe<Scalars['Float']['output']>;
  /** Service ID from DampLabService */
  serviceId: Scalars['String']['output'];
  /** Position of this line in the SOW billing source it was taken from. */
  sourceIndex?: Maybe<Scalars['Int']['output']>;
  /** Price of a single run, before the multiplier. Absent on lines written before unit prices were recorded. */
  unitCost?: Maybe<Scalars['Float']['output']>;
};

/** A service line on the SOW, identified by its position in billableServices */
export type InvoiceServiceSelectionInput = {
  /** Zero-based position of the line in SOW.billableServices. */
  index: Scalars['Int']['input'];
  /** The serviceId expected at that position. The request is refused if it no longer matches. */
  serviceId: Scalars['ID']['input'];
};

/** Jobs encapsulate many workflows that were submitted together */
export type Job = {
  __typename?: 'Job';
  /** When staff last accepted this job as specified */
  acceptedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Billing fingerprint of the job spec at the moment staff accepted it. */
  acceptedBillingFingerprint?: Maybe<Scalars['String']['output']>;
  /** Keycloak sub of the staff member who last accepted this job */
  acceptedBy?: Maybe<Scalars['String']['output']>;
  /** Exact immutable job-version number accepted by staff. */
  acceptedJobVersionNumber?: Maybe<Scalars['Int']['output']>;
  /** When the job was archived. */
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who archived it (username/email). */
  archivedBy?: Maybe<Scalars['String']['output']>;
  /** The state the job was in when archived — kept as an audit trail, since staff may archive work that was still in progress. */
  archivedFromState?: Maybe<JobState>;
  /** Supporting documents uploaded by the customer for this job */
  attachments?: Maybe<Array<Maybe<JobAttachment>>>;
  /** Display name for the client (captured at checkout). Used for customer-facing documents like SOWs. */
  clientDisplayName?: Maybe<Scalars['String']['output']>;
  /** Email of the actual client when a staff member submits on their behalf. */
  clientEmail?: Maybe<Scalars['String']['output']>;
  /** Staff see internal notes too; everyone else sees only what was written for the customer. */
  comments: Array<Comment>;
  /** The explicit action the customer must complete while this job is in CHANGES_REQUESTED. */
  customerActionRequired?: Maybe<CustomerActionRequired>;
  /** Customer pricing category for this job. Set from Keycloak at submission; staff may update it (and the owner account / other jobs) via changeJobCustomerCategory. */
  customerCategory?: Maybe<CustomerCategory>;
  /** When the client last requested edit access on this job. Cleared by the next staff review decision. */
  editAccessRequestedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The email address of the user - from access token */
  email: Scalars['String']['output'];
  /** The content version in force when the job was last handed to the customer — what withdrawing it restores. */
  handoverVersionNumber?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  /** The institute the user is from */
  institute: Scalars['String']['output'];
  /** How many invoices have been generated for this job. 0 before any billing has happened. */
  invoiceCount: Scalars['Int']['output'];
  /** Archived: hidden from the default dashboard and live boards, but retained. */
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  /** Customer-facing job identifier (5-digit numeric string). Null for legacy jobs. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Newest content versionNumber on the job, including unpublished staff drafts. Used by the editor conflict check; not a customer graph source. */
  latestContentVersionNumber?: Maybe<Scalars['Int']['output']>;
  /** Human readable name of the workflow */
  name: Scalars['String']['output'];
  /** Additional information the user provided */
  notes?: Maybe<Scalars['String']['output']>;
  /** SOW associated with this job */
  sow?: Maybe<Sow>;
  /** Where in the Job life cycle this Job is */
  state: JobState;
  /** Subject id of the user - from access token */
  sub: Scalars['String']['output'];
  /** The date the job was submitted */
  submitted: Scalars['DateTime']['output'];
  /** Username of the person who submitted the job - from access token */
  username: Scalars['String']['output'];
  /** Saved versions of this job's workflow graph, oldest first. Staff see every row; customers see published rows plus their own. */
  versions: Array<JobVersion>;
  /** The workflows that were submitted together */
  workflows: Array<Workflow>;
};

export enum JobArchiveFilter {
  Active = 'ACTIVE',
  All = 'ALL',
  Archived = 'ARCHIVED'
}

/** File attached to a job for additional context or requirements */
export type JobAttachment = {
  __typename?: 'JobAttachment';
  /** MIME type of the uploaded file */
  contentType: Scalars['String']['output'];
  /** Original filename of the uploaded document */
  filename?: Maybe<Scalars['String']['output']>;
  /** S3 object key where the document is stored */
  key: Scalars['String']['output'];
  /** Size of the file in bytes */
  size: Scalars['Float']['output'];
  /** When this attachment was recorded */
  uploadedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Temporary URL to download this attachment */
  url?: Maybe<Scalars['String']['output']>;
};

export type JobAttachmentInput = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  key: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

export type JobAttachmentUpload = {
  __typename?: 'JobAttachmentUpload';
  contentType: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  key: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type JobAttachmentUploadRequest = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

export type JobClient = {
  __typename?: 'JobClient';
  /** Identifies the client — what `createdByClient` takes. Their normalised email, which is the one identifier present on both their own jobs and the ones staff submitted for them. */
  clientKey: Scalars['String']['output'];
  /** Best available label: display name, else username, else email. */
  displayName: Scalars['String']['output'];
  /**
   * The client's Keycloak sub, empty when they have only ever had jobs submitted on their behalf.
   * @deprecated Use clientKey. Empty for a client who has never submitted a job themselves.
   */
  sub: Scalars['String']['output'];
};

export type JobFeedStatus = {
  __typename?: 'JobFeedStatus';
  hasUnseen: Scalars['Boolean']['output'];
  latestSubmittedAt?: Maybe<Scalars['DateTime']['output']>;
  viewedAt?: Maybe<Scalars['DateTime']['output']>;
};

export enum JobReviewDecision {
  Accept = 'ACCEPT',
  RequestApproval = 'REQUEST_APPROVAL',
  RequestClarification = 'REQUEST_CLARIFICATION',
  RequestEdits = 'REQUEST_EDITS'
}

export enum JobScope {
  All = 'ALL',
  CreatedByMe = 'CREATED_BY_ME',
  WorkedByMe = 'WORKED_BY_ME'
}

export enum JobSortField {
  Name = 'NAME',
  Submitted = 'SUBMITTED'
}

export enum JobState {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  ChangesRequested = 'CHANGES_REQUESTED',
  Closed = 'CLOSED',
  Complete = 'COMPLETE',
  Creating = 'CREATING',
  InProgress = 'IN_PROGRESS',
  Queued = 'QUEUED',
  Rejected = 'REJECTED',
  Submitted = 'SUBMITTED',
  WaitingForSow = 'WAITING_FOR_SOW'
}

/** Immutable snapshot of a job's workflow graph */
export type JobVersion = {
  __typename?: 'JobVersion';
  /** Which side of the conversation wrote this version. The diff baseline is derived from it: baseline(N) is the newest version below N whose authorRole differs from N's. */
  authorRole: JobVersionAuthorRole;
  createdAt: Scalars['DateTime']['output'];
  /** Keycloak sub of the author */
  createdBy: Scalars['String']['output'];
  /** Display name of the author, resolved at write time */
  createdByName: Scalars['String']['output'];
  /** The author's org or team, resolved at write time: their access tier for staff, the job's institute for a customer. Empty on rows predating the field. */
  createdByOrg?: Maybe<Scalars['String']['output']>;
  /** Human-facing label: "1.2" for encoded numbers, "3" for pre-scheme integers. */
  displayVersion: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True when this version records a state change rather than an edit to the graph. */
  isEvent?: Maybe<Scalars['Boolean']['output']>;
  /** Parent job id (string mirror, for querying) */
  jobId: Scalars['ID']['output'];
  /** The job's state when this version was written. Absent on versions predating the field. */
  jobState?: Maybe<JobState>;
  /** Note describing what changed */
  note?: Maybe<Scalars['String']['output']>;
  /** Caller-provided idempotency key for command-generated history events. */
  operationId?: Maybe<Scalars['String']['output']>;
  /** When a hidden staff-authored content version was published to the customer. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Keycloak sub of the staff member who published this content version. */
  publishedBy?: Maybe<Scalars['String']['output']>;
  /** Sortable, unique within a job. Starts at 1 (the original submission). */
  versionNumber: Scalars['Int']['output'];
  /** False for unpublished staff drafts. Missing on legacy rows; treat as true so customers do not lose history. */
  visibleToCustomer: Scalars['Boolean']['output'];
  /** The whole graph, one entry per disconnected tree */
  workflows: Array<JobVersionWorkflow>;
};

export enum JobVersionAuthorRole {
  Customer = 'CUSTOMER',
  Staff = 'STAFF'
}

/** One workflow edge as frozen into this version */
export type JobVersionEdge = {
  __typename?: 'JobVersionEdge';
  id: Scalars['ID']['output'];
  /** Client-side id of the source node (matches JobVersionNode.id) */
  source: Scalars['ID']['output'];
  /** Client-side id of the target node (matches JobVersionNode.id) */
  target: Scalars['ID']['output'];
};

/** One workflow node as frozen into this version */
export type JobVersionNode = {
  __typename?: 'JobVersionNode';
  additionalInstructions: Scalars['String']['output'];
  /** Parameter values, canonical array shape: [{ id, value }] */
  formData: Scalars['JSON']['output'];
  /** The React Flow client-side node id, carried verbatim from submission through every edit. Diffing is keyed entirely on this — if it were ever regenerated, every node would read as deleted-and-re-added. */
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  /** Canvas position; absent on legacy jobs submitted before positions were read back */
  position?: Maybe<JobVersionPosition>;
  /** Node price as computed when this version was saved */
  price?: Maybe<Scalars['Float']['output']>;
  /** DampLabService this node ran */
  serviceId?: Maybe<Scalars['ID']['output']>;
  /** Service name at the time of the snapshot, so the diff can label a node without a catalogue lookup */
  serviceName?: Maybe<Scalars['String']['output']>;
};

/** Canvas coordinates of a node at the time this version was written */
export type JobVersionPosition = {
  __typename?: 'JobVersionPosition';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

/** One workflow (a connected tree on the canvas) as frozen into this version */
export type JobVersionWorkflow = {
  __typename?: 'JobVersionWorkflow';
  edges: Array<JobVersionEdge>;
  name: Scalars['String']['output'];
  nodes: Array<JobVersionNode>;
  /** Live Workflow this snapshot came from; null for a tree first created by this edit */
  workflowId?: Maybe<Scalars['ID']['output']>;
};

export type JobsForViewerInput = {
  /** Archive bucket to return (default ACTIVE — archived jobs hidden) */
  archiveFilter?: InputMaybe<JobArchiveFilter>;
  /** Filter to jobs with an operation assigned to this person. Ignored without jobs:view-all. */
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  /** Filter to one client by their clientKey, as returned by jobClients. Matches jobs they submitted and jobs staff submitted for them. Ignored without jobs:view-all. */
  createdByClient?: InputMaybe<Scalars['String']['input']>;
  /** Filter by presence of SOW */
  hasSow?: InputMaybe<Scalars['Boolean']['input']>;
  /** Include jobs that have been closed out — CLOSED, CANCELLED and REJECTED. False by default, so the listing shows live work. COMPLETE is not in that set: lab work finishing is not the same as the job being done with. Ignored when `state` names one of them explicitly. */
  includeClosed?: InputMaybe<Scalars['Boolean']['input']>;
  /** Items per page */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page (1-based) */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Whose jobs. Forced to CREATED_BY_ME without jobs:view-all, whatever is sent. */
  scope?: InputMaybe<JobScope>;
  /** Case-insensitive search on name, id, username, email, institute */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort field (default SUBMITTED) */
  sortBy?: InputMaybe<JobSortField>;
  /** Sort order (default DESC = latest first) */
  sortOrder?: InputMaybe<SortOrder>;
  /** Filter by job state */
  state?: InputMaybe<JobState>;
};

export type JobsResult = {
  __typename?: 'JobsResult';
  /** All jobs (staff-only) */
  items: Array<Job>;
  /** Total count (for pagination UI) */
  totalCount: Scalars['Int']['output'];
};

/** Keycloak user row for Customer Management. Carries both axes: the pricing category (which groups set price) and the access tier (which groups set permissions). They are independent — changing one never changes the other. */
export type KeycloakUserCustomerManagement = {
  __typename?: 'KeycloakUserCustomerManagement';
  /** False when the access group was written but the realm role it is meant to map to is absent from the user. The guard reads realm roles, not groups, so an unmapped group grants nothing — this reports that rather than letting the change look successful. Only populated on the row returned by setUserKeycloakAccessTier; null elsewhere, because checking it per row would double the Admin API calls a list page makes. */
  accessRoleMapped?: Maybe<Scalars['Boolean']['output']>;
  /** The access column this user resolves to, from their access-group membership. CLIENT means they carry no access group — the baseline every authenticated user gets. */
  accessTier?: Maybe<AccessTier>;
  /** Customer pricing category inferred from Keycloak groups (same precedence as job submission). */
  customerCategory?: Maybe<CustomerCategory>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** True when the user's only pricing-group membership is the legacy `external-customer` (the default group new sign-ups land in). Lets staff distinguish a user who has not been explicitly categorized yet from one who is intentionally in External — market. */
  isDefaultExternalCustomer?: Maybe<Scalars['Boolean']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

/** Paginated Keycloak user rows for staff customer-category management. */
export type KeycloakUserCustomerManagementPage = {
  __typename?: 'KeycloakUserCustomerManagementPage';
  /** True when another page of results may exist. */
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<KeycloakUserCustomerManagement>;
};

/** Staff member option for lab monitor card assignment */
export type LabMonitorStaffMember = {
  __typename?: 'LabMonitorStaffMember';
  /** Display name for the assignee dropdown */
  displayName: Scalars['String']['output'];
  /** Identifier (e.g. Keycloak sub or username) */
  id: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Add a comment to a backlog card, attributed to the signed-in user. */
  addBacklogComment: BacklogComment;
  /** Record uploaded attachments for a bug report so they appear in the bug details view. */
  addBugAttachments: BugReport;
  /** Record uploaded attachments for a job so they appear in tracking views. */
  addJobAttachments: Job;
  /** Staff-only. Add a new workflow (service(s) + parameters) to an existing job. */
  addWorkflowToJob: Job;
  /** Staff-only. Archive a job: hides it from the default jobs dashboard and the live lab boards while retaining everything. Permitted even when the job is IN_PROGRESS — the caller is expected to have confirmed — and the state at archive time is recorded. */
  archiveJob: Job;
  /** Archive a lab monitor card: hides it from the board while retaining everything. Administrator-only. */
  archiveWorkflowNode: WorkflowNode;
  /** Record the uploaded file against its document, after the browser’s PUT succeeded. */
  attachTrainingFile: TrainingResource;
  cancelBooking: Booking;
  /** Job-owner-only. Cancel the job outright, with a required reason. Allowed until the Statement of Work is countersigned; any SOW still standing is cancelled with it. */
  cancelJob: Job;
  /** Staff-only. Cancels the SOW. */
  cancelSow: SowVersion;
  /** Staff-only. Change pricing category for a job owner: updates their Keycloak pricing group, every job under that account, and reprices SOW billing cores (documents stay stale until staff refresh). */
  changeJobCustomerCategory: Job;
  /** Submit a job for review, or close a finished one. Other transitions go through reviewJob. */
  changeJobState: Job;
  changeWorkflowNodeState: WorkflowNode;
  changeWorkflowState: Workflow;
  confirmBookingUsage: Booking;
  createAnnouncement: Announcement;
  /** Create a read-only API key. The raw secret is returned once and cannot be retrieved again. */
  createApiKey: CreateApiKeyResult;
  createBooking: Booking;
  /** Create presigned S3 URLs to upload one or more attachments for a bug report. */
  createBugAttachmentUploadUrls: Array<BugAttachmentUpload>;
  /** Create a new bug report for the currently authenticated user. */
  createBugReport: BugReport;
  createBundle: Bundle;
  createCategory: Category;
  /** Create a new comment */
  createComment: Comment;
  createInventoryItem: InventoryItem;
  /** Staff-only. Generate a new invoice for a job by selecting a subset of services from the job SOW. */
  createInvoice: Invoice;
  createJob: Job;
  /** Create presigned S3 URLs to upload one or more attachments for a job owned by the current user. */
  createJobAttachmentUploadUrls: Array<JobAttachmentUpload>;
  /** Staff-only. Create a new SOW. */
  createSOW: Sow;
  createService: DampLabService;
  /** Staff-only. Create the first Statement of Work for a job, built from the job's workflows. Returns the existing SOW if the job already has one. */
  createSowForJob: Sow;
  createSowTextPreset: SowTextPreset;
  createStation: Station;
  /** Create a new template */
  createTemplate: Template;
  /** Presigned upload URL for a Learning Hub PDF. Rejects non-PDFs and oversized files. */
  createTrainingFileUploadUrl: TrainingFileUpload;
  /** Create the record. Upload the file separately — see createTrainingFileUploadUrl. */
  createTrainingResource: TrainingResource;
  /** Record an upload log entry. */
  createUploadLog: UploadLog;
  /** Create presigned S3 URLs to upload one or more workflow parameter files during final job submission. */
  createWorkflowParameterUploadUrls: Array<WorkflowParameterFileUpload>;
  /** Job owner only. Decline to sign the Statement of Work in force, with a required reason posted to the comment thread. The document returns to the lab as an editable draft so it can be revised and reissued. */
  declineSow: Sow;
  /** Delete all inventory items (hard delete). Returns the number of items deleted. Requires inventory:write. */
  deleteAllInventoryItems: Scalars['Int']['output'];
  /** Delete an announcement outright. Hiding one (is_displayed: false) is usually what you want instead. */
  deleteAnnouncement: Scalars['Boolean']['output'];
  deleteBundle: Scalars['Boolean']['output'];
  deleteCategory: Scalars['Boolean']['output'];
  /** Delete a comment */
  deleteComment: Scalars['Boolean']['output'];
  deleteInventoryItem: Scalars['Boolean']['output'];
  /** Remove the mapping for one protocol step. */
  deleteProtocolStepMapping: Scalars['Boolean']['output'];
  /** Staff-only. Delete a SOW. */
  deleteSOW: Scalars['Boolean']['output'];
  deleteService: Scalars['Boolean']['output'];
  deleteSowTextPreset: Scalars['Boolean']['output'];
  /** Soft-delete a station. Equipment assigned to it becomes unassigned in resolution. */
  deleteStation: Station;
  /** Delete a template by ID */
  deleteTemplate: Scalars['Boolean']['output'];
  /** Delete a template by name */
  deleteTemplateByName: Scalars['Boolean']['output'];
  deleteTrainingResource: Scalars['Boolean']['output'];
  /** Staff-only. Discards an unsent draft above the active version. */
  discardSowDraft: Sow;
  /** Staff-only. Countersigns a signed SOW and locks it as FINAL. */
  finalizeSow: SowVersion;
  /** Generate a usage SOW + invoice from selected bookings; marks them billed. */
  generateUsageBilling: UsageBillingResult;
  /** Mark all notifications as read. Returns the count marked. */
  markAllNotificationsRead: Scalars['Int']['output'];
  /** Marks the shared jobs feed as viewed by setting the global viewed timestamp. Requires jobs:view-all. */
  markJobsFeedViewed: JobFeedStatus;
  /** Mark a single notification as read. */
  markNotificationRead?: Maybe<Notification>;
  /** Job-owner-only. Decline the workflow the lab asked you to approve, with a required reason posted to the comment thread. Returns the job to the lab; it is not terminal. */
  rejectJobReview: Job;
  /** Renumbers a section. The block left at the top becomes its default. */
  reorderSowTextPresets: Array<SowTextPreset>;
  /** Job-owner-only. Ask the lab for access to edit this job's workflow. Grants nothing on its own — staff open the editor with reviewJob(REQUEST_EDITS). Allowed until the SOW is signed. */
  requestJobEditAccess: Job;
  /** Job-owner-only. Complete the currently requested review action and return the job to staff. */
  respondToJobReview: Job;
  /** Restore an earlier version of the workflow graph as a new version. Available to whoever currently holds the job. */
  restoreJobVersion: Job;
  /** Staff-only. Discard drafts above the signed version in force so that version can be countersigned. */
  restoreSowSignedVersion: Sow;
  /** Staff-only. Accept the exact latest job version or request a specific customer action. */
  reviewJob: Job;
  /** Revoke an API key immediately. */
  revokeApiKey: ApiKey;
  /** Replace a job's workflow graph from the workflow editor and record the result as a new job version. */
  saveJobWorkflows: Job;
  /** Staff-only. Saves edits as a new draft. Does not change what the customer sees. */
  saveSowVersion: SowVersion;
  /** Staff-only. Issues the current draft to the customer for signing. */
  sendSowToCustomer: SowVersion;
  /** Administrator: set a user’s access tier by rewriting their Keycloak access-group membership. Pricing groups are never touched. Takes effect at the user’s next sign-in. */
  setUserKeycloakAccessTier: KeycloakUserCustomerManagement;
  /** Staff: set a user’s Keycloak pricing customer group to match the given category, or clear all such groups when category is omitted. */
  setUserKeycloakCustomerCategory: KeycloakUserCustomerManagement;
  /** Set the protocols.io step ids a technician has checked off for an operation (bench view). Replaces the full set. */
  setWorkflowNodeCompletedSteps: WorkflowNode;
  /** Set which inventory items a node is holding while IN_PROGRESS. Rejects items already held by another in-progress node. */
  setWorkflowNodeUsedInventory: WorkflowNode;
  /** Job owner only. Records the customer signature on the version in force. */
  signSow: SowVersion;
  /** Staff-only. Restore an archived job, putting it back in the dashboard and on the live boards. Its lifecycle state was never changed, so it returns exactly where it left off. */
  unarchiveJob: Job;
  /** Restore an archived lab monitor card to the board. Its state was never changed, so it returns where it left off. Administrator-only. */
  unarchiveWorkflowNode: WorkflowNode;
  /** Edit an announcement: its text, its visibility, or its audience. */
  updateAnnouncement: Announcement;
  updateBundle: Bundle;
  updateCategory: Category;
  /** Update an existing comment */
  updateComment: Comment;
  updateInventoryItem: InventoryItem;
  /** Update notification preferences. */
  updateNotificationPreferences: NotificationPreferences;
  /** Staff-only. Update an existing SOW. */
  updateSOW: Sow;
  updateService: DampLabService;
  updateSowTextPreset: SowTextPreset;
  updateStation: Station;
  /** Update an existing template */
  updateTemplate: Template;
  /** Edit a document’s title, description or audience. The file is replaced by uploading a new one. */
  updateTrainingResource: TrainingResource;
  updateWorkflowNodeAssignee: WorkflowNode;
  updateWorkflowNodeEstimatedTime: WorkflowNode;
  /** Create or update the mapping for one protocol step. */
  upsertProtocolStepMapping: ProtocolStepMapping;
  /** Staff-only. Create or update SOW for a job (upsert). */
  upsertSOWForJob: Sow;
  /** Staff-only. Reopen an accepted job so its spec can be edited again. Any issued Statement of Work is left alone but stops being sendable until the job is re-accepted. */
  withdrawJobAcceptance: Job;
  /** Staff-only. Take a job back from the customer, restoring the workflow to the version they were handed. Their own versions stay in the job's history. */
  withdrawJobFromCustomer: Job;
  /** Staff-only. Take a sent Statement of Work back so it can be edited. The customer is told it is no longer available to sign. */
  withdrawSowFromCustomer: Sow;
};


export type MutationAddBacklogCommentArgs = {
  body: Scalars['String']['input'];
  cardId: Scalars['ID']['input'];
};


export type MutationAddBugAttachmentsArgs = {
  attachments: Array<BugAttachmentInput>;
  bugId: Scalars['ID']['input'];
};


export type MutationAddJobAttachmentsArgs = {
  attachments: Array<JobAttachmentInput>;
  jobId: Scalars['ID']['input'];
};


export type MutationAddWorkflowToJobArgs = {
  jobId: Scalars['ID']['input'];
  workflow: AddWorkflowInput;
};


export type MutationArchiveJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type MutationArchiveWorkflowNodeArgs = {
  workflowNode: Scalars['ID']['input'];
};


export type MutationAttachTrainingFileArgs = {
  file: TrainingFileInput;
  resourceId: Scalars['ID']['input'];
};


export type MutationCancelBookingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelJobArgs = {
  input: CancelJobInput;
};


export type MutationCancelSowArgs = {
  note?: InputMaybe<Scalars['String']['input']>;
  sowId: Scalars['ID']['input'];
};


export type MutationChangeJobCustomerCategoryArgs = {
  customerCategory: CustomerCategory;
  jobId: Scalars['ID']['input'];
};


export type MutationChangeJobStateArgs = {
  job: Scalars['ID']['input'];
  newState: JobState;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangeWorkflowNodeStateArgs = {
  newState: WorkflowNodeState;
  workflowNode: Scalars['ID']['input'];
};


export type MutationChangeWorkflowStateArgs = {
  newState: WorkflowState;
  workflow: Scalars['ID']['input'];
};


export type MutationConfirmBookingUsageArgs = {
  actualHours?: InputMaybe<Scalars['Float']['input']>;
  actualQuantity?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationCreateAnnouncementArgs = {
  input: CreateAnnouncementInput;
};


export type MutationCreateApiKeyArgs = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateBookingArgs = {
  input: CreateBookingInput;
};


export type MutationCreateBugAttachmentUploadUrlsArgs = {
  bugId: Scalars['ID']['input'];
  files: Array<BugAttachmentUploadRequest>;
};


export type MutationCreateBugReportArgs = {
  input: CreateBugReportInput;
};


export type MutationCreateBundleArgs = {
  bundle: CreateBundle;
};


export type MutationCreateCategoryArgs = {
  category: CreateCategory;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationCreateInventoryItemArgs = {
  item: CreateInventoryItem;
};


export type MutationCreateInvoiceArgs = {
  input: CreateInvoiceInput;
};


export type MutationCreateJobArgs = {
  createJobInput: CreateJobInput;
};


export type MutationCreateJobAttachmentUploadUrlsArgs = {
  files: Array<JobAttachmentUploadRequest>;
  jobId: Scalars['ID']['input'];
};


export type MutationCreateSowArgs = {
  input: CreateSowInput;
};


export type MutationCreateServiceArgs = {
  service: CreateService;
};


export type MutationCreateSowForJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type MutationCreateSowTextPresetArgs = {
  preset: CreateSowTextPresetInput;
};


export type MutationCreateStationArgs = {
  input: CreateStationInput;
};


export type MutationCreateTemplateArgs = {
  input: CreateTemplateInput;
};


export type MutationCreateTrainingFileUploadUrlArgs = {
  file: TrainingFileUploadRequest;
  resourceId: Scalars['ID']['input'];
};


export type MutationCreateTrainingResourceArgs = {
  input: CreateTrainingResourceInput;
};


export type MutationCreateUploadLogArgs = {
  input: CreateUploadLogInput;
};


export type MutationCreateWorkflowParameterUploadUrlsArgs = {
  files: Array<WorkflowParameterFileUploadRequest>;
};


export type MutationDeclineSowArgs = {
  reason: Scalars['String']['input'];
  sowId: Scalars['ID']['input'];
};


export type MutationDeleteAnnouncementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBundleArgs = {
  bundle: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  category: Scalars['ID']['input'];
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteInventoryItemArgs = {
  item: Scalars['ID']['input'];
};


export type MutationDeleteProtocolStepMappingArgs = {
  protocolId: Scalars['String']['input'];
  stepId: Scalars['String']['input'];
};


export type MutationDeleteSowArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteServiceArgs = {
  service: Scalars['ID']['input'];
};


export type MutationDeleteSowTextPresetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteStationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTemplateByNameArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteTrainingResourceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDiscardSowDraftArgs = {
  sowId: Scalars['ID']['input'];
  versionNumber: Scalars['Int']['input'];
};


export type MutationFinalizeSowArgs = {
  name: Scalars['String']['input'];
  sowId: Scalars['ID']['input'];
};


export type MutationGenerateUsageBillingArgs = {
  input: GenerateUsageBillingInput;
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRejectJobReviewArgs = {
  input: RejectJobReviewInput;
};


export type MutationReorderSowTextPresetsArgs = {
  order: ReorderSowTextPresetsInput;
};


export type MutationRequestJobEditAccessArgs = {
  input: RequestJobEditAccessInput;
};


export type MutationRespondToJobReviewArgs = {
  input: RespondToJobReviewInput;
};


export type MutationRestoreJobVersionArgs = {
  jobId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  versionNumber: Scalars['Int']['input'];
};


export type MutationRestoreSowSignedVersionArgs = {
  sowId: Scalars['ID']['input'];
  versionNumber: Scalars['Int']['input'];
};


export type MutationReviewJobArgs = {
  input: ReviewJobInput;
};


export type MutationRevokeApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSaveJobWorkflowsArgs = {
  input: SaveJobWorkflowsInput;
};


export type MutationSaveSowVersionArgs = {
  input: SaveSowVersionInput;
  sowId: Scalars['ID']['input'];
};


export type MutationSendSowToCustomerArgs = {
  sowId: Scalars['ID']['input'];
};


export type MutationSetUserKeycloakAccessTierArgs = {
  tier: AccessTier;
  userId: Scalars['ID']['input'];
};


export type MutationSetUserKeycloakCustomerCategoryArgs = {
  category?: InputMaybe<CustomerCategory>;
  userId: Scalars['ID']['input'];
};


export type MutationSetWorkflowNodeCompletedStepsArgs = {
  completedSteps: Array<Scalars['String']['input']>;
  workflowNode: Scalars['ID']['input'];
};


export type MutationSetWorkflowNodeUsedInventoryArgs = {
  inventoryIds: Array<Scalars['ID']['input']>;
  reservationEnd?: InputMaybe<Scalars['DateTime']['input']>;
  reservationStart?: InputMaybe<Scalars['DateTime']['input']>;
  workflowNode: Scalars['ID']['input'];
};


export type MutationSignSowArgs = {
  input: SignSowInput;
  sowId: Scalars['ID']['input'];
};


export type MutationUnarchiveJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type MutationUnarchiveWorkflowNodeArgs = {
  workflowNode: Scalars['ID']['input'];
};


export type MutationUpdateAnnouncementArgs = {
  input: UpdateAnnouncementInput;
};


export type MutationUpdateBundleArgs = {
  bundle: Scalars['ID']['input'];
  changes: BundleChange;
};


export type MutationUpdateCategoryArgs = {
  category: Scalars['ID']['input'];
  changes: CategoryChange;
};


export type MutationUpdateCommentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
};


export type MutationUpdateInventoryItemArgs = {
  changes: InventoryItemChange;
  item: Scalars['ID']['input'];
};


export type MutationUpdateNotificationPreferencesArgs = {
  input: UpdateNotificationPreferencesInput;
};


export type MutationUpdateSowArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSowInput;
};


export type MutationUpdateServiceArgs = {
  changes: ServiceChange;
  service: Scalars['ID']['input'];
};


export type MutationUpdateSowTextPresetArgs = {
  changes: UpdateSowTextPresetInput;
  id: Scalars['ID']['input'];
};


export type MutationUpdateStationArgs = {
  input: UpdateStationInput;
};


export type MutationUpdateTemplateArgs = {
  input: UpdateTemplateInput;
};


export type MutationUpdateTrainingResourceArgs = {
  input: UpdateTrainingResourceInput;
};


export type MutationUpdateWorkflowNodeAssigneeArgs = {
  assigneeDisplayName?: InputMaybe<Scalars['String']['input']>;
  assigneeId?: InputMaybe<Scalars['String']['input']>;
  workflowNode: Scalars['ID']['input'];
};


export type MutationUpdateWorkflowNodeEstimatedTimeArgs = {
  estimatedMinutes?: InputMaybe<Scalars['Float']['input']>;
  workflowNode: Scalars['ID']['input'];
};


export type MutationUpsertProtocolStepMappingArgs = {
  input: UpsertProtocolStepMappingInput;
};


export type MutationUpsertSowForJobArgs = {
  input: CreateSowInput;
  jobId: Scalars['ID']['input'];
};


export type MutationWithdrawJobAcceptanceArgs = {
  input: WithdrawJobInput;
};


export type MutationWithdrawJobFromCustomerArgs = {
  input: WithdrawJobInput;
};


export type MutationWithdrawSowFromCustomerArgs = {
  reason: Scalars['String']['input'];
  sowId: Scalars['ID']['input'];
};

/** The caller's resolved permissions. The frontend never hardcodes the role -> permission table; it asks for the answer. */
export type MyPermissions = {
  __typename?: 'MyPermissions';
  /**
   * The same, with staff-flavoured roles (damplab-staff, technician) removed — what the staff "Client View" toggle previewed before the view-as dropdown replaced it. Note client-unassisted-equipment-user is NOT removed; it is a client variant. For a non-staff caller this equals effective. This is a UI illusion only: the caller's real token is unchanged and retains full backend authority.
   * @deprecated Superseded by rolePreviews. Kept so pre-deploy clients do not break; safe to remove one release after the UI stops asking for it.
   */
  asCustomer: Array<Scalars['String']['output']>;
  /** The caller's pricing category as the server resolves it, from their Keycloak groups. Null when they belong to no pricing group. */
  customerCategory?: Maybe<CustomerCategory>;
  /** Everything the caller may do, unioned across all of their roles, including the client baseline. */
  effective: Array<Scalars['String']['output']>;
  /** The realm roles the *server* resolved for this caller. Exposed so the UI can detect DEV_AS_ROLES / VITE_DEV_AS_ROLES drift under the local auth bypass: only the backend's value decides what `effective` contains, so if the two halves disagree the UI renders one role's menu while claiming another. Discloses nothing — the caller's own token already carries these. */
  roles: Array<Scalars['String']['output']>;
};

export enum NodeArchiveFilter {
  Active = 'ACTIVE',
  All = 'ALL',
  Archived = 'ARCHIVED'
}

export type Notification = {
  __typename?: 'Notification';
  actorDisplayName?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  jobId?: Maybe<Scalars['String']['output']>;
  link?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  sowId?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type NotificationPage = {
  __typename?: 'NotificationPage';
  items: Array<Notification>;
  unreadCount: Scalars['Int']['output'];
};

export type NotificationPreferences = {
  __typename?: 'NotificationPreferences';
  emailDisabledEventTypes: Array<Scalars['String']['output']>;
  inAppDisabledEventTypes: Array<Scalars['String']['output']>;
};

export type OwnJobsInput = {
  /** Filter by presence of SOW */
  hasSow?: InputMaybe<Scalars['Boolean']['input']>;
  /** Items per page */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page (1-based) */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Case-insensitive search on name, id, username, email, institute */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort field (default SUBMITTED) */
  sortBy?: InputMaybe<JobSortField>;
  /** Sort order (default DESC = latest first) */
  sortOrder?: InputMaybe<SortOrder>;
  /** Filter by job state */
  state?: InputMaybe<JobState>;
};

export type OwnJobsResult = {
  __typename?: 'OwnJobsResult';
  /** Jobs for the current user */
  items: Array<Job>;
  /** Total count (for pagination UI) */
  totalCount: Scalars['Int']['output'];
};

/** Customer-category pricing (internal/external) with optional legacy fallback. */
export type Pricing = {
  __typename?: 'Pricing';
  /** Legacy external price for backward compatibility. */
  external?: Maybe<Scalars['Float']['output']>;
  /** Price for external academic customers. */
  externalAcademic?: Maybe<Scalars['Float']['output']>;
  /** Price for external market customers. */
  externalMarket?: Maybe<Scalars['Float']['output']>;
  /** Price for external no-salary customers. */
  externalNoSalary?: Maybe<Scalars['Float']['output']>;
  /** Price for internal customers. */
  internal?: Maybe<Scalars['Float']['output']>;
  /** Legacy fallback price (used when internal/external not set). */
  legacy?: Maybe<Scalars['Float']['output']>;
};

/** One priced selection behind a parameter-priced line (e.g. "Hours in use — 3 x $40.00"). */
export type PricingDetail = {
  __typename?: 'PricingDetail';
  /** The option or parameter as the customer chose it. */
  label: Scalars['String']['output'];
  /** How many — a count of selections, or the number typed into a priced multiplier. */
  quantity: Scalars['Float']['output'];
  /** quantity x unitPrice. */
  total: Scalars['Float']['output'];
  /** Rate applied to each. */
  unitPrice: Scalars['Float']['output'];
};

export type PricingDetailInput = {
  /** The option or parameter as the customer chose it. */
  label: Scalars['String']['input'];
  /** How many — a count of selections, or the number typed into a priced multiplier. */
  quantity: Scalars['Float']['input'];
  /** quantity x unitPrice. */
  total: Scalars['Float']['input'];
  /** Rate applied to each. */
  unitPrice: Scalars['Float']['input'];
};

export type PricingInput = {
  /** Legacy external price for backward compatibility. */
  external?: InputMaybe<Scalars['Float']['input']>;
  /** Price for external academic customers. */
  externalAcademic?: InputMaybe<Scalars['Float']['input']>;
  /** Price for external market customers. */
  externalMarket?: InputMaybe<Scalars['Float']['input']>;
  /** Price for external no-salary customers. */
  externalNoSalary?: InputMaybe<Scalars['Float']['input']>;
  /** Price for internal customers. */
  internal?: InputMaybe<Scalars['Float']['input']>;
  /** Legacy fallback price (used when internal/external not set). */
  legacy?: InputMaybe<Scalars['Float']['input']>;
};

/** One category heading in the protocol library. */
export type ProtocolLibraryCategory = {
  __typename?: 'ProtocolLibraryCategory';
  /** Category name, from the referencing service's category. 'Uncategorised' when no service references it. */
  category: Scalars['String']['output'];
  protocols: Array<ProtocolLibraryEntry>;
};

/** A protocol in the library: enough to list it, not its steps. */
export type ProtocolLibraryEntry = {
  __typename?: 'ProtocolLibraryEntry';
  /** protocols.io identifier or slug — what resolveProtocol takes. */
  protocolId: Scalars['String']['output'];
  /** DAMPLab services that reference this protocol. */
  serviceNames: Array<Scalars['String']['output']>;
  /** How many steps it has. Null when the fetch failed. */
  stepCount?: Maybe<Scalars['Int']['output']>;
  /** Protocol title, or the id if protocols.io could not be reached. */
  title: Scalars['String']['output'];
  /** True when protocols.io could not be reached for this entry. The row still lists, so one bad protocol does not blank the library. */
  unavailable: Scalars['Boolean']['output'];
};

/** Author-defined mapping of one protocol step to a Canvas service + required equipment. */
export type ProtocolStepMapping = {
  __typename?: 'ProtocolStepMapping';
  /** Equipment required for this step (Step→Equipment). */
  equipmentIds: Array<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** Modular value tags: [{ label, value }] injected into runtime job params. */
  paramTags?: Maybe<Scalars['JSON']['output']>;
  /** protocols.io protocol identifier. */
  protocolId: Scalars['String']['output'];
  /** Explicitly reviewed as requiring no equipment (vs. not yet mapped). */
  requiresNoEquipment: Scalars['Boolean']['output'];
  /** Whether the author has reviewed this step. */
  reviewed: Scalars['Boolean']['output'];
  /**
   * Legacy per-step service reference. No longer read or written.
   * @deprecated Per-step service mapping removed; operations own their protocols via protocolIds.
   */
  serviceId?: Maybe<Scalars['ID']['output']>;
  /** protocols.io step guid (stable per version). */
  stepId: Scalars['String']['output'];
  /** Snapshot of the step number (drift detection / display). */
  stepNumber?: Maybe<Scalars['String']['output']>;
  /** Snapshot of a short step title/label (NOT the protocol content). */
  stepTitle?: Maybe<Scalars['String']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Active (non-deleted) inventory items for catalog pickers. */
  activeInventoryItems: Array<InventoryItem>;
  /** Recent activity events for lab status screens and notifications. Requires labstatustv:view — its only surface is /lab-status-tv. */
  activityEvents: Array<ActivityEvent>;
  /** Staff-only. Administrators, for the Statement of Work Project Manager field. Sourced from the Administrator tier Keycloak group. */
  administratorStaffList: Array<LabMonitorStaffMember>;
  /** Every announcement, for the admin editor. Requires announcements:write. */
  allAnnouncements: Array<Announcement>;
  /**
   * Every job, paginated and filterable. Requires jobs:view-all; the baseline reaches ownJobs instead.
   * @deprecated Use jobsForViewer, which serves both tiers and enforces scope server-side. Kept because API_KEY_PERMISSIONS includes jobs:view-all and external integrations may call it.
   */
  allJobs: JobsResult;
  /** Staff-only. Get all SOWs. */
  allSOWs: Array<Sow>;
  /** Announcements addressed to an audience the caller belongs to, newest first. Rows with no audience are visible to everyone. */
  announcements: Array<Announcement>;
  /** All provisioned API keys (secrets are never returned). */
  apiKeys: Array<ApiKey>;
  /** Operations (workflow nodes) assigned to the current staff member — powers the technician bench view. */
  assignedOperations: Array<WorkflowNode>;
  /** Whether the backlog integration is configured, so the UI can show a helpful empty state instead of an error. */
  backlogAvailable: Scalars['Boolean']['output'];
  /** One backlog card with its comment thread. */
  backlogCard: BacklogCardDetail;
  /** The bug backlog. Any authenticated user. Reporter identity is visible to all; only the ClickUp link is staff-only. */
  backlogCards: Array<BacklogCard>;
  /** A user's confirmed, unbilled usage (billing). */
  billableBookings: Array<Booking>;
  /** Users with confirmed, unbilled inventory usage. */
  billableOwners: Array<BillableOwner>;
  /** All bookings. Optional date-range + item filters. Requires inventory:read. */
  bookings: Array<Booking>;
  /** Fetch a single bug report by ID. */
  bugReportById?: Maybe<BugReport>;
  /** List all bug reports, optionally filtered by search text and reporter. */
  bugReports: BugReportsResult;
  bundles: Array<Bundle>;
  /** The services catalog as the caller may see it: their own price, and the full tier table only with internal-fields:read. */
  catalogServices: Array<CatalogServiceView>;
  categories: Array<Category>;
  /** Get comment by ID */
  commentById?: Maybe<Comment>;
  /** Comments on a job. Staff see internal notes too; everyone else sees only what was written for the customer. */
  commentsByJobId: Array<Comment>;
  /** Get comments scoped to a single workflow node (technician bench-view notes) */
  commentsByNodeId: Array<Comment>;
  /** In-progress nodes currently holding any inventory (powers the availability board). */
  getInProgressNodesHoldingInventory: Array<WorkflowNode>;
  /** Nodes in this state that belong to approved-job workflows whose Statement of Work is signed (lab monitor columns by node state). Archived cards are excluded unless asked for. */
  getLabMonitorNodes: Array<WorkflowNode>;
  /** Staff members available for assignment on lab monitor cards. Sourced from Keycloak group (damplab-staff) when configured, else LAB_MONITOR_STAFF env. */
  getLabMonitorStaffList: Array<LabMonitorStaffMember>;
  /** @deprecated Use getWorkflowsByStateForLabMonitor. Retained for the orphaned /dominos board; it now applies the same signed-SOW gate. */
  getWorkflowByState: Array<Workflow>;
  /** Workflows in this state that belong to jobs accepted by technicians (for lab monitor). */
  getWorkflowsByStateForLabMonitor: Array<Workflow>;
  /** Inventory items unavailable in a time window — shared pool across operations + calendar bookings. Pass excludeNodeId to ignore the operation being edited. */
  inventoryAvailability: Array<InventoryConflict>;
  /** All inventory items including soft-deleted ones (admin view). Requires inventory:read. */
  inventoryItems: Array<InventoryItem>;
  /** List invoices generated for a job. Staff can view any; clients can view their own. */
  invoicesByJobId: Array<Invoice>;
  jobById?: Maybe<Job>;
  jobByName?: Maybe<Job>;
  jobByWorkflowId: Job;
  /** Distinct submitters, for the jobs page client filter. Requires jobs:view-all. */
  jobClients: Array<JobClient>;
  jobs: Array<Job>;
  /** Global unseen/submitted jobs feed status for the Home Jobs button badge. Requires jobs:view-all. */
  jobsFeedStatus: JobFeedStatus;
  /** Jobs the caller may see. Scope is enforced server-side: without jobs:view-all it is forced to the caller's own jobs whatever is asked for. */
  jobsForViewer: JobsResult;
  /** Staff: list Keycloak users by staff/customer category group membership, paginated. Intended for customer management UI browsing (default STAFF). */
  listKeycloakUsersForCustomerManagement: KeycloakUserCustomerManagementPage;
  /** Bookings owned by the current user. */
  myBookings: Array<Booking>;
  /** Notification preferences for the current user. */
  myNotificationPreferences: NotificationPreferences;
  /** Paginated notifications for the current user. */
  myNotifications: NotificationPage;
  /** The permissions granted to the calling user. */
  myPermissions: MyPermissions;
  /** Number of unread notifications for the current user. */
  myUnreadNotificationCount: Scalars['Int']['output'];
  ownJobById?: Maybe<Job>;
  /** Paginated, filterable list of jobs for the current user (My Jobs). */
  ownJobs: OwnJobsResult;
  /** Staff-only. Administrators and Technicians, for the Statement of Work Project Lead field. Sourced from those tiers Keycloak groups. */
  projectLeadStaffList: Array<LabMonitorStaffMember>;
  /** Every protocol referenced by the service catalog, grouped by the referencing service's category. */
  protocolLibrary: Array<ProtocolLibraryCategory>;
  /** All author-defined step mappings for a protocol. */
  protocolStepMappings: Array<ProtocolStepMapping>;
  /** Public inventory list with sensitive fields hidden. No authentication required. */
  publicInventoryItems: Array<InventoryItem>;
  /** Resolve a protocol into its full step → equipment → station chain with validation. Steps come back in execution order. */
  resolveProtocol: ResolvedProtocol;
  /** Access tiers the calling administrator may preview the UI as, lower tiers only. */
  rolePreviews: Array<RolePreview>;
  /** Staff: search Keycloak users by name/email/username and return inferred customer pricing category from group membership. */
  searchKeycloakUsersForCustomerManagement: Array<KeycloakUserCustomerManagement>;
  services: Array<DampLabService>;
  /** Get SOW by ID. Staff can view any; clients can view their own. */
  sowById?: Maybe<Sow>;
  /** Get SOW by job ID. Staff can view any; clients can view their own. */
  sowByJobId?: Maybe<Sow>;
  /** Staff-only. Recomputes the generated text for the given inputs without saving. Returns generated values only — the editor keeps its own overrides and enable flags. */
  sowFieldPreview: Array<SowCalculatedValue>;
  /** Every SOW prose section with a summary of its text-block library. */
  sowPresetSections: Array<SowPresetSection>;
  /** Text blocks, default first. Omit sectionKey for the whole library. */
  sowTextPresets: Array<SowTextPreset>;
  /** One version of a SOW. Customers may only read versions issued to them. */
  sowVersion?: Maybe<SowVersion>;
  /** Version history for a SOW, newest first. Staff see every version; customers see only those issued to them. */
  sowVersions: Array<SowVersion>;
  /** Staff-only. Get all SOWs by status. */
  sowsByStatus: Array<Sow>;
  station?: Maybe<Station>;
  /** All lab stations (active by default). */
  stations: Array<Station>;
  /** Get a template by ID */
  template?: Maybe<Template>;
  /** Get a template by name */
  templateByName?: Maybe<Template>;
  /** Get all templates */
  templates: Array<Template>;
  /** A short-lived download URL for one document, if the caller is in its audience. */
  trainingResourceDownloadUrl?: Maybe<Scalars['String']['output']>;
  /** Learning Hub documents addressed to an audience the caller belongs to. A training:write holder sees all of them. */
  trainingResources: Array<TrainingResource>;
  /** A single upload log by ID. */
  uploadLog?: Maybe<UploadLog>;
  /** All upload logs, newest first. */
  uploadLogs: Array<UploadLog>;
  usageInvoice?: Maybe<UsageInvoice>;
  /** Usage invoices (optionally for one user). */
  usageInvoices: Array<UsageInvoice>;
  usageSow?: Maybe<UsageSow>;
  /** Usage SOWs (optionally for one user). */
  usageSows: Array<UsageSow>;
  workflowById?: Maybe<Workflow>;
};


export type QueryActivityEventsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryAllJobsArgs = {
  input?: InputMaybe<AllJobsInput>;
};


export type QueryBacklogCardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBillableBookingsArgs = {
  ownerSub: Scalars['String']['input'];
};


export type QueryBookingsArgs = {
  from?: InputMaybe<Scalars['DateTime']['input']>;
  inventoryItemId?: InputMaybe<Scalars['ID']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryBugReportByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBugReportsArgs = {
  filter?: InputMaybe<BugReportsFilterInput>;
};


export type QueryCommentByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommentsByJobIdArgs = {
  jobId: Scalars['ID']['input'];
};


export type QueryCommentsByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


export type QueryGetLabMonitorNodesArgs = {
  archiveFilter?: InputMaybe<NodeArchiveFilter>;
  includeUnsignedSow?: InputMaybe<Scalars['Boolean']['input']>;
  nodeState: WorkflowNodeState;
};


export type QueryGetWorkflowByStateArgs = {
  state: WorkflowState;
};


export type QueryGetWorkflowsByStateForLabMonitorArgs = {
  includeUnsignedSow?: InputMaybe<Scalars['Boolean']['input']>;
  state: WorkflowState;
};


export type QueryInventoryAvailabilityArgs = {
  excludeNodeId?: InputMaybe<Scalars['ID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryInvoicesByJobIdArgs = {
  jobId: Scalars['ID']['input'];
};


export type QueryJobByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryJobByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryJobByWorkflowIdArgs = {
  workflow: Scalars['ID']['input'];
};


export type QueryJobsForViewerArgs = {
  input?: InputMaybe<JobsForViewerInput>;
};


export type QueryListKeycloakUsersForCustomerManagementArgs = {
  category: CustomerManagementUserListCategory;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOwnJobByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOwnJobsArgs = {
  input?: InputMaybe<OwnJobsInput>;
};


export type QueryProtocolStepMappingsArgs = {
  protocolId: Scalars['String']['input'];
};


export type QueryResolveProtocolArgs = {
  protocolId: Scalars['String']['input'];
};


export type QuerySearchKeycloakUsersForCustomerManagementArgs = {
  max?: InputMaybe<Scalars['Int']['input']>;
  search: Scalars['String']['input'];
};


export type QuerySowByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySowByJobIdArgs = {
  jobId: Scalars['ID']['input'];
};


export type QuerySowFieldPreviewArgs = {
  inputs: SowInputsInput;
  sowId: Scalars['ID']['input'];
};


export type QuerySowTextPresetsArgs = {
  sectionKey?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySowVersionArgs = {
  sowId: Scalars['ID']['input'];
  versionNumber: Scalars['Int']['input'];
};


export type QuerySowVersionsArgs = {
  sowId: Scalars['ID']['input'];
};


export type QuerySowsByStatusArgs = {
  status: SowStatus;
};


export type QueryStationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStationsArgs = {
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTemplateByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryTrainingResourceDownloadUrlArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUploadLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsageInvoiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsageInvoicesArgs = {
  ownerSub?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryUsageSowArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsageSowsArgs = {
  ownerSub?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryWorkflowByIdArgs = {
  id: Scalars['ID']['input'];
};

export type RejectJobReviewInput = {
  jobId: Scalars['ID']['input'];
  operationId: Scalars['String']['input'];
  /** Shown to the lab in the automated comment. */
  reason: Scalars['String']['input'];
};

/** A section and its blocks in their new order, top first */
export type ReorderSowTextPresetsInput = {
  /** Block ids, top (default) first */
  orderedIds: Array<Scalars['ID']['input']>;
  sectionKey: Scalars['String']['input'];
};

export type RequestJobEditAccessInput = {
  jobId: Scalars['ID']['input'];
  /** Optional note to the lab, posted as a comment. */
  message?: InputMaybe<Scalars['String']['input']>;
  operationId: Scalars['String']['input'];
};

/** Equipment required by a step, resolved to every station it is placed at. */
export type ResolvedEquipment = {
  __typename?: 'ResolvedEquipment';
  id: Scalars['ID']['output'];
  missing: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** Stations holding this equipment. Empty means it has no station assigned. */
  placements: Array<ResolvedPlacement>;
};

/** One station a piece of equipment is placed at, and how many are there. */
export type ResolvedPlacement = {
  __typename?: 'ResolvedPlacement';
  quantity: Scalars['Int']['output'];
  station: ResolvedStation;
};

/** A protocol resolved into the full step → service → equipment → station chain. */
export type ResolvedProtocol = {
  __typename?: 'ResolvedProtocol';
  /** True when every step is MAPPED with valid references. */
  fullyMapped: Scalars['Boolean']['output'];
  mappedStepCount: Scalars['Int']['output'];
  protocolId: Scalars['String']['output'];
  steps: Array<ResolvedStep>;
  title?: Maybe<Scalars['String']['output']>;
  totalStepCount: Scalars['Int']['output'];
};

/** Station a piece of equipment resolves to. */
export type ResolvedStation = {
  __typename?: 'ResolvedStation';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  zone?: Maybe<Scalars['String']['output']>;
};

/** A protocol step with its fully resolved equipment → station chain. Steps are returned in execution order. */
export type ResolvedStep = {
  __typename?: 'ResolvedStep';
  equipment: Array<ResolvedEquipment>;
  /** Validation problems for this step (empty if clean). */
  issues: Array<Scalars['String']['output']>;
  number?: Maybe<Scalars['String']['output']>;
  requiresNoEquipment: Scalars['Boolean']['output'];
  status: StepMappingStatus;
  stepId: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

export type RespondToJobReviewInput = {
  jobId: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  operationId: Scalars['String']['input'];
};

export type ReviewJobInput = {
  decision: JobReviewDecision;
  jobId: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  operationId: Scalars['String']['input'];
};

/** One access tier an administrator may preview the UI as, with the permissions that tier resolves to. */
export type RolePreview = {
  __typename?: 'RolePreview';
  /** Human label for the picker. */
  label: Scalars['String']['output'];
  /** Everything that tier may do, including the client baseline. */
  permissions: Array<Scalars['String']['output']>;
  tier: AccessTier;
};

/** Statement of Work (SOW) for a job */
export type Sow = {
  __typename?: 'SOW';
  /** Which send, customer-sign, and staff-finalize actions this SOW permits and what is in the way of each. Customers see the signing half only. Advisory either way — every mutation enforces the same rules server-side. */
  actionGate: SowActionGate;
  /** Version currently in force with the customer */
  activeVersion?: Maybe<SowVersion>;
  /** Version in force with the customer. Lags currentVersionNumber while staff draft changes, which is why an unsent draft never invalidates a signature. 0 before anything is issued. */
  activeVersionNumber: Scalars['Int']['output'];
  /** Additional information */
  additionalInformation?: Maybe<Scalars['String']['output']>;
  /** The service lines an invoice for this SOW would bill, in order: the version in force with the customer, or the live billing core when no version has been issued. Positions here are what createInvoice's `services` selection refers to, so the invoice picker must list this rather than `services`. */
  billableServices: Array<SowVersionService>;
  /** Address of the client */
  clientAddress?: Maybe<Scalars['String']['output']>;
  /** Email address of the client */
  clientEmail: Scalars['String']['output'];
  /** Institution of the client */
  clientInstitution: Scalars['String']['output'];
  /** Name of the client */
  clientName: Scalars['String']['output'];
  /** Client signature (when present) */
  clientSignature?: Maybe<SowSignature>;
  /** Date when the SOW was created */
  createdAt: Scalars['DateTime']['output'];
  /** User who created the SOW (technician username/email) */
  createdBy: Scalars['String']['output'];
  /** Latest version — what staff edit. May be an unsent draft. */
  currentVersion?: Maybe<SowVersion>;
  /** Highest version number; what staff edit. 0 before the first version exists. */
  currentVersionNumber: Scalars['Int']['output'];
  /** Date the SOW was created */
  date: Scalars['DateTime']['output'];
  /** Array of deliverable descriptions */
  deliverables: Array<Scalars['String']['output']>;
  /** The billing core moved (workflow added, category changed) since the current version was written, so its Fee Schedule is out of date. Surfaced to staff as a banner; never auto-applied to an issued document. */
  documentStale: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Job this SOW is associated with */
  job: Job;
  /** ID of the associated job (for convenience/querying) */
  jobId: Scalars['String']['output'];
  /** Name of the job */
  jobName: Scalars['String']['output'];
  /** The job's current pricing category — may differ from what a stale local draft has. */
  liveCustomerCategory?: Maybe<CustomerCategory>;
  /** The SOW's current service lines and their costs, read fresh on every query. Kept in sync with the job's services/category by syncSowServicesFromJobWorkflows — this is what the Fee Schedule renders, since service prices belong to the job spec rather than the document. */
  liveServices: Array<SowVersionService>;
  /** Pricing information */
  pricing: SowPricing;
  /** Resource allocation */
  resources: SowResources;
  /** Array of scope of work bullet points */
  scopeOfWork: Array<Scalars['String']['output']>;
  /** Services included in the SOW */
  services: Array<SowService>;
  /** Unique SOW number (e.g., "SOW 001", "SOW 002") */
  sowNumber: Scalars['String']['output'];
  /** Technician-entered title for the SOW document (e.g. "Agreement to Perform Research Services") */
  sowTitle?: Maybe<Scalars['String']['output']>;
  /** Current status of the SOW */
  status: SowStatus;
  /** Technician/BU signature (when present) */
  technicianSignature?: Maybe<SowSignature>;
  /** Terms and conditions. Legacy — the live document text lives on the SOW version. */
  terms?: Maybe<Scalars['String']['output']>;
  /** Timeline information */
  timeline: SowTimeline;
  /** Date when the SOW was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Version history, newest first. Staff see every version; customers see only those issued to them. */
  versions: Array<SowVersion>;
};


/** Statement of Work (SOW) for a job */
export type SowActionGateArgs = {
  expectedSignVersionNumber?: InputMaybe<Scalars['Int']['input']>;
};

export enum SowAdjustmentCategory {
  Consumable = 'CONSUMABLE',
  Days = 'DAYS',
  Samples = 'SAMPLES',
  Service = 'SERVICE',
  Staff = 'STAFF'
}

export enum SowAdjustmentType {
  AdditionalCost = 'ADDITIONAL_COST',
  Discount = 'DISCOUNT',
  SpecialTerm = 'SPECIAL_TERM'
}

/** Discount information for a Statement of Work */
export type SowDiscount = {
  __typename?: 'SOWDiscount';
  /** Discount amount */
  amount: Scalars['Float']['output'];
  /** Reason for the discount */
  reason: Scalars['String']['output'];
};

export type SowDiscountInput = {
  /** Discount amount */
  amount: Scalars['Float']['input'];
  /** Reason for the discount */
  reason: Scalars['String']['input'];
};

/** Pricing information for a Statement of Work */
export type SowPricing = {
  __typename?: 'SOWPricing';
  /** List of pricing adjustments */
  adjustments: Array<SowPricingAdjustment>;
  /** Base cost before adjustments */
  baseCost: Scalars['Float']['output'];
  /** Discount applied to the pricing */
  discount?: Maybe<SowDiscount>;
  /** Total cost after adjustments */
  totalCost: Scalars['Float']['output'];
};

/** Pricing adjustment for a Statement of Work */
export type SowPricingAdjustment = {
  __typename?: 'SOWPricingAdjustment';
  /** What this adjustment moves: unitAmount x multiplier. Invoices read this. */
  amount: Scalars['Float']['output'];
  /** What the adjustment is charging for. Absent on adjustments written before categories existed. */
  category?: Maybe<SowAdjustmentCategory>;
  /** Description of the adjustment */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** How many units the unit amount is charged for. Absent (or unset) means 1. */
  multiplier?: Maybe<Scalars['Float']['output']>;
  /** Reason for the adjustment */
  reason?: Maybe<Scalars['String']['output']>;
  /** Type of adjustment */
  type: SowAdjustmentType;
  /** Amount for a single unit, before the multiplier. Absent on adjustments written before unit amounts existed — treat amount as the whole story there. */
  unitAmount?: Maybe<Scalars['Float']['output']>;
};

export type SowPricingAdjustmentInput = {
  /** What this adjustment moves. Ignored when unitAmount is sent — the figure is derived there. */
  amount: Scalars['Float']['input'];
  /** What the adjustment is charging for. */
  category?: InputMaybe<SowAdjustmentCategory>;
  /** Description of the adjustment */
  description: Scalars['String']['input'];
  /** How many units the unit amount is charged for. Omitted means 1. */
  multiplier?: InputMaybe<Scalars['Float']['input']>;
  /** Reason for the adjustment */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Type of adjustment */
  type: SowAdjustmentType;
  /** Amount for a single unit. When sent, the adjustment becomes unitAmount x multiplier. */
  unitAmount?: InputMaybe<Scalars['Float']['input']>;
};

export type SowPricingInput = {
  /** List of pricing adjustments */
  adjustments?: Array<SowPricingAdjustmentInput>;
  /** Base cost before adjustments */
  baseCost?: InputMaybe<Scalars['Float']['input']>;
  /** Discount applied to the pricing */
  discount?: InputMaybe<SowDiscountInput>;
  /** Total cost after adjustments */
  totalCost?: InputMaybe<Scalars['Float']['input']>;
};

/** Resource allocation for a Statement of Work */
export type SowResources = {
  __typename?: 'SOWResources';
  /** Project lead assigned to the project */
  projectLead: Scalars['String']['output'];
  /** Keycloak sub of the project lead */
  projectLeadId?: Maybe<Scalars['String']['output']>;
  /** Project manager assigned to the project */
  projectManager: Scalars['String']['output'];
  /** Keycloak sub of the project manager */
  projectManagerId?: Maybe<Scalars['String']['output']>;
};

export type SowResourcesInput = {
  /** Project lead assigned to the project */
  projectLead: Scalars['String']['input'];
  /** Keycloak sub of the project lead */
  projectLeadId?: InputMaybe<Scalars['String']['input']>;
  /** Project manager assigned to the project */
  projectManager: Scalars['String']['input'];
  /** Keycloak sub of the project manager */
  projectManagerId?: InputMaybe<Scalars['String']['input']>;
};

/** Service included in a Statement of Work */
export type SowService = {
  __typename?: 'SOWService';
  /** Category of the service */
  category: Scalars['String']['output'];
  /** What this line bills: unitCost x multiplier */
  cost: Scalars['Float']['output'];
  /** Description of the service */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Everything baked into cost on top of unitCost — the run count and any other multiplier parameter. */
  multiplier?: Maybe<Scalars['Float']['output']>;
  /** Name of the service */
  name: Scalars['String']['output'];
  /** How unitCost was arrived at, for parameter-priced lines. Absent where there is nothing to itemise. */
  pricingDetails?: Maybe<Array<PricingDetail>>;
  /** The run count alone. Superseded by multiplier for display; kept because existing documents carry it. */
  runCount?: Maybe<Scalars['Float']['output']>;
  /** Service ID from DampLabService */
  serviceId: Scalars['String']['output'];
  /** Price of a single run, before the multiplier. Absent on lines written before unit prices were recorded. */
  unitCost?: Maybe<Scalars['Float']['output']>;
};

export type SowServiceInput = {
  /** Category of the service */
  category: Scalars['String']['input'];
  /** Line total for the service — unit price times multiplier. Used only as a fallback when the service record carries no price of its own, and divided back down by the multiplier before it is used as one. */
  cost?: InputMaybe<Scalars['Float']['input']>;
  /** Description of the service */
  description: Scalars['String']['input'];
  /** Parameter values for pricing */
  formData?: InputMaybe<Scalars['JSON']['input']>;
  /** Service ID from DampLabService */
  id: Scalars['String']['input'];
  /** Name of the service */
  name: Scalars['String']['input'];
  /** Price of a single run. Preferred over cost as the fallback, since it needs no dividing. */
  unitCost?: InputMaybe<Scalars['Float']['input']>;
};

/** Signature on a Statement of Work (name, title, date, optional image) */
export type SowSignature = {
  __typename?: 'SOWSignature';
  /** Full name as shown on the PDF */
  name: Scalars['String']['output'];
  /** Data URL of the signature image (e.g. data:image/png;base64,...) */
  signatureDataUrl?: Maybe<Scalars['String']['output']>;
  /** ISO 8601 date-time when they signed */
  signedAt: Scalars['String']['output'];
  /** Role/title (e.g. Principal Investigator) */
  title?: Maybe<Scalars['String']['output']>;
};

export enum SowStatus {
  Cancelled = 'CANCELLED',
  Draft = 'DRAFT',
  Final = 'FINAL',
  Sent = 'SENT',
  Signed = 'SIGNED'
}

/** Timeline information for a Statement of Work */
export type SowTimeline = {
  __typename?: 'SOWTimeline';
  /** Duration of the project (e.g., "14 days", "5 weeks") */
  duration: Scalars['String']['output'];
  /** End date of the project */
  endDate: Scalars['DateTime']['output'];
  /** Start date of the project */
  startDate: Scalars['DateTime']['output'];
};

export type SowTimelineInput = {
  /** Duration of the project (e.g., "14 days", "5 weeks") */
  duration: Scalars['String']['input'];
  /** End date of the project */
  endDate: Scalars['DateTime']['input'];
  /** Start date of the project */
  startDate: Scalars['DateTime']['input'];
};

/** One edge in a saved workflow graph */
export type SaveEdgeInput = {
  id: Scalars['ID']['input'];
  /** Client-side id of the source node */
  source: Scalars['ID']['input'];
  /** Client-side id of the target node */
  target: Scalars['ID']['input'];
};

/** Replace a job's workflow graph and record the result as a new version */
export type SaveJobWorkflowsInput = {
  jobId: Scalars['ID']['input'];
  /** Note describing what changed. Required — the history is unreadable without it. */
  note: Scalars['String']['input'];
  /** The complete graph. Anything absent is deleted. */
  workflows: Array<SaveWorkflowInput>;
};

/** One node in a saved workflow graph */
export type SaveNodeInput = {
  additionalInstructions?: InputMaybe<Scalars['String']['input']>;
  /** Parameter values; accepted as [{ id, value }] or an object keyed by param id */
  formData?: InputMaybe<Scalars['JSON']['input']>;
  /** React Flow client-side node id. Stable across edits; new nodes bring a new one. */
  id: Scalars['ID']['input'];
  /** Human readable name of the service */
  label: Scalars['String']['input'];
  /** Canvas position, persisted into reactNode so the graph reopens where the author left it */
  position?: InputMaybe<SaveNodePositionInput>;
  /** The DampLabService this node represents */
  serviceId: Scalars['ID']['input'];
};

/** Canvas coordinates of a node */
export type SaveNodePositionInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type SaveSowVersionInput = {
  /** The version the editor loaded. If the SOW has moved on since, the save is rejected rather than silently overwriting a colleague — see the conflict handling in SowVersionService.saveVersion. */
  baseVersionNumber: Scalars['Int']['input'];
  fields: Array<SowFieldInput>;
  inputs: SowInputsInput;
  /** Note describing what changed, shown in the version history. Required. */
  note: Scalars['String']['input'];
  /** True when staff clicked Recalculate on the Fee Schedule. The document's figures are a static record and carry forward untouched otherwise; this is an intent flag, never a price — the server derives the figures itself. */
  refreshFeeSchedule?: InputMaybe<Scalars['Boolean']['input']>;
};

/** One disconnected tree on the canvas */
export type SaveWorkflowInput = {
  edges: Array<SaveEdgeInput>;
  /** Workflow name; the existing name is kept when omitted */
  name?: InputMaybe<Scalars['String']['input']>;
  nodes: Array<SaveNodeInput>;
  /** Existing Workflow to reconcile against. Omit for a tree created by this edit. */
  workflowId?: InputMaybe<Scalars['ID']['input']>;
};

export type SectionInitialsInput = {
  /** Initials as typed by the signer */
  initials: Scalars['String']['input'];
  /** Key of the section being initialled */
  key: Scalars['String']['input'];
};

export type ServiceChange = {
  /** When true, a canvas node for this service offers a "Number of runs" count, and its price is multiplied by it. Off by default: most operations run once, and an always-present run count is noise on every node. Affects only what the editor offers going forward — a run count already stored on a submitted job keeps pricing and displaying either way, so turning this off never silently reprices history. */
  allowMultipleRuns?: InputMaybe<Scalars['Boolean']['input']>;
  allowedConnections?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Array of deliverable descriptions for this service */
  deliverables?: InputMaybe<Array<Scalars['String']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Customer-category specific price for EXTERNAL ACADEMIC customers when pricingMode is SERVICE. */
  externalAcademicPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL MARKET customers when pricingMode is SERVICE. */
  externalMarketPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL NO-SALARY customers when pricingMode is SERVICE. */
  externalNoSalaryPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Customer-category specific price for EXTERNAL customers when pricingMode is SERVICE. Falls back to price when unset. */
  externalPrice?: InputMaybe<Scalars['Float']['input']>;
  /** URL to the icon of the service */
  icon?: InputMaybe<Scalars['String']['input']>;
  /** Customer-category specific price for INTERNAL customers when pricingMode is SERVICE. Falls back to price when unset. */
  internalPrice?: InputMaybe<Scalars['Float']['input']>;
  /** Inventory items this service typically needs. Informational (soft requirement): the lab monitor surfaces these in the picker but does not block the IN_PROGRESS transition if none are selected. */
  inventoryRequirements?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Human readable name of the service */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Free-text internal notes for DAMPLab staff. Not shown to customers. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** If there are grouped parameters */
  paramGroups?: InputMaybe<Scalars['JSON']['input']>;
  /** Parameters that are part of the service. Each parameter may include allowMultipleValues (boolean, default false) and price (number). When allowMultipleValues is true, formData values may be stored and returned as string[]. */
  parameters?: InputMaybe<Scalars['JSON']['input']>;
  /** The approximate cost to use this service when pricingMode is SERVICE. */
  price?: InputMaybe<Scalars['Float']['input']>;
  /** Pricing by customer category for this service. Prefer this over price/internalPrice/externalPrice. */
  pricing?: InputMaybe<PricingInput>;
  /** How pricing is determined for this service. */
  pricingMode?: InputMaybe<ServicePricingMode>;
  /** Legacy single protocols.io identifier. Read via protocolIds instead. */
  protocolId?: InputMaybe<Scalars['String']['input']>;
  /** protocols.io protocol identifiers for this operation, IN EXECUTION ORDER — array position is the sequence the admin specified. Each entry is the short id from the protocol URL (e.g. "n92ld46yxl5b" from protocols.io/view/...-n92ld46yxl5b/v1). References only; protocol content is fetched on demand and never synced into our DB. Note a protocol may be shared by several operations, in which case they share its step→equipment map. */
  protocolIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The by-product of the service */
  result?: InputMaybe<Scalars['JSON']['input']>;
  /** The expected fields in the result of the service */
  resultParams?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Service category name for downstream integrations. */
  serviceCategoryName?: InputMaybe<Scalars['String']['input']>;
  /** Service category number for downstream integrations. */
  serviceCategoryNumber?: InputMaybe<Scalars['String']['input']>;
  /** Service unit for downstream integrations. */
  unit?: InputMaybe<Scalars['String']['input']>;
};

export enum ServicePricingMode {
  Parameter = 'PARAMETER',
  Service = 'SERVICE'
}

export type SignSowInput = {
  /** Which groups of sections the signer ticked: the calculated figures, the standard prose, and any custom sections. Every group present in the document must be acknowledged. */
  consentedGroups: Array<SowFieldKind>;
  /** Typed full name, which is the signature under the new flow */
  name: Scalars['String']['input'];
  /** Initials for every section staff flagged requiresInitials. Every such section that is enabled in the document must be present with non-empty initials. */
  sectionInitials?: InputMaybe<Array<SectionInitialsInput>>;
  /** Version the signer is looking at. Rejected if it is no longer the one in force, so nobody signs a superseded document. */
  versionNumber: Scalars['Int']['input'];
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Which lifecycle actions this SOW currently permits, and what is in the way of each. */
export type SowActionGate = {
  __typename?: 'SowActionGate';
  /** True when nothing blocks countersigning the signed version in force. */
  canCountersign: Scalars['Boolean']['output'];
  /** True when the customer can decline to sign the active SENT version. */
  canDecline: Scalars['Boolean']['output'];
  /** True when nothing blocks issuing the current draft to the customer. */
  canSend: Scalars['Boolean']['output'];
  /** True when nothing blocks the customer from signing the active SENT version. */
  canSign: Scalars['Boolean']['output'];
  /** What stands between the signed version and a countersignature, in repair order. */
  countersignBlockers: Array<DocumentBlocker>;
  /** What stands between the active version and a customer declining it. Only ever AWAITING_SENT_VERSION — a document out for signature can always be refused. */
  declineBlockers: Array<DocumentBlocker>;
  /** Human-readable labels for the required sections still missing, when DRAFT_INCOMPLETE is present. */
  missingFields: Array<Scalars['String']['output']>;
  /** What stands between the current draft and a send, in repair order. */
  sendBlockers: Array<DocumentBlocker>;
  /** What stands between the active SENT version and a customer signature, in repair order. */
  signBlockers: Array<DocumentBlocker>;
};

/** Generated text for one field, for live preview while editing */
export type SowCalculatedValue = {
  __typename?: 'SowCalculatedValue';
  calculatedValue: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

/** Signature captured as typed name plus per-group consent */
export type SowConsent = {
  __typename?: 'SowConsent';
  /** Keycloak sub of the signer */
  bySub?: Maybe<Scalars['String']['output']>;
  /** Field kinds the signer explicitly acknowledged */
  consentedGroups: Array<SowFieldKind>;
  /** Drawn signature carried over from the pre-versioning flow, so migrated SOWs still export with the image the customer actually drew. Never set for new signatures. */
  legacySignatureDataUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Initials given for each section staff flagged requiresInitials */
  sectionInitials: Array<SowSectionInitial>;
  signedAt: Scalars['DateTime']['output'];
};

/** One section of the SOW document */
export type SowField = {
  __typename?: 'SowField';
  /** False on fields the document cannot be sent to the customer without (e.g. Engagement Resources needs a Project Manager and Project Lead) */
  allowsEmpty: Scalars['Boolean']['output'];
  /** False where asking the customer to initial the section is meaningless (Signatures) — staff are not offered the flag, and a stored one is ignored at signing */
  allowsInitials: Scalars['Boolean']['output'];
  /** False on fields whose text carries figures another system bills from (Fee Schedule), where free-text editing would let the document disagree with the invoice */
  allowsTextOverride: Scalars['Boolean']['output'];
  /** What the generator produced for this field, kept alongside any override so "revert to calculated" has a current target. */
  calculatedValue?: Maybe<Scalars['String']['output']>;
  /** When false the section is retained but hidden from the customer, the PDF and consent */
  isEnabled: Scalars['Boolean']['output'];
  /** True when a staff member replaced the generated text by hand */
  isOverridden: Scalars['Boolean']['output'];
  /** Stable identifier, e.g. "feeSchedule" or "custom-<uuid>" */
  key: Scalars['String']['output'];
  kind: SowFieldKind;
  /** Heading shown above this section */
  label: Scalars['String']['output'];
  /** Document order; ascending */
  order: Scalars['Int']['output'];
  /** Staff flag: when true, the customer must type their initials for this section before they can sign */
  requiresInitials: Scalars['Boolean']['output'];
  /** Text shown to the reader. Plain text; lines beginning "- " are bullets. */
  value: Scalars['String']['output'];
};

export type SowFieldInput = {
  /** False hides the section from the customer, the PDF and consent, without discarding its text */
  isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Catalogue key, or "custom-<uuid>" for a staff-added section */
  key: Scalars['String']['input'];
  /** Only honoured for custom sections; catalogue labels are fixed */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Staff flag: when true, the customer must type their initials for this section before they can sign */
  requiresInitials?: InputMaybe<Scalars['Boolean']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum SowFieldKind {
  Calculated = 'CALCULATED',
  Custom = 'CUSTOM',
  Prose = 'PROSE'
}

export type SowInputsInput = {
  adjustments?: InputMaybe<Array<SowVersionAdjustmentInput>>;
  deliverables?: InputMaybe<Array<Scalars['String']['input']>>;
  periods?: InputMaybe<Array<SowPeriodInput>>;
  projectLead?: InputMaybe<Scalars['String']['input']>;
  /** Keycloak sub of the project lead */
  projectLeadId?: InputMaybe<Scalars['String']['input']>;
  projectManager?: InputMaybe<Scalars['String']['input']>;
  /** Keycloak sub of the project manager */
  projectManagerId?: InputMaybe<Scalars['String']['input']>;
  /** Preview the refreshed Fee Schedule figures rather than the ones carried forward from the current version. */
  refreshFeeSchedule?: InputMaybe<Scalars['Boolean']['input']>;
  scopeOfWork?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<SowVersionServiceInput>>;
  sowTitle?: InputMaybe<Scalars['String']['input']>;
};

/** A single period of performance; a SOW may have several, non-consecutive or retroactive */
export type SowPeriod = {
  __typename?: 'SowPeriod';
  durationDays: Scalars['Int']['output'];
  /** Optional name, e.g. "Phase 1" */
  label?: Maybe<Scalars['String']['output']>;
  startDate: Scalars['DateTime']['output'];
};

export type SowPeriodInput = {
  /** Length in days, inclusive of the start date */
  durationDays: Scalars['Int']['input'];
  /** Optional name, e.g. "Phase 1" */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Start of this period. May be in the past — retroactive SOWs are legitimate. */
  startDate: Scalars['DateTime']['input'];
};

/** A SOW prose section and a summary of its text-block library */
export type SowPresetSection = {
  __typename?: 'SowPresetSection';
  /** Name of the rank-1 block, or null when the section has none yet */
  defaultName?: Maybe<Scalars['String']['output']>;
  /** Catalog key, e.g. "invoiceProcedures" */
  key: Scalars['String']['output'];
  /** Section heading as it appears in the document */
  label: Scalars['String']['output'];
  /** How many blocks the section has */
  presetCount: Scalars['Int']['output'];
  /** When any block in this section was last edited */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who last edited a block in this section */
  updatedByName?: Maybe<Scalars['String']['output']>;
};

/** Initials a signer typed for one section flagged as requiring them */
export type SowSectionInitial = {
  __typename?: 'SowSectionInitial';
  /** Initials as typed by the signer */
  initials: Scalars['String']['output'];
  /** Section key the initials were given for */
  key: Scalars['String']['output'];
  /** Section's label at the time it was signed, for display without a fields lookup */
  label: Scalars['String']['output'];
};

/** A reusable block of text for one prose section of a SOW */
export type SowTextPreset = {
  __typename?: 'SowTextPreset';
  createdAt: Scalars['DateTime']['output'];
  /** Keycloak sub or email of whoever created the block */
  createdBy: Scalars['String']['output'];
  /** Display name of the creator, resolved at write time */
  createdByName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Staff-facing name, e.g. "Default" or "Net-30 terms" */
  name: Scalars['String']['output'];
  /** Rank within the section, ascending. The lowest is the section default. */
  order: Scalars['Int']['output'];
  /** Key of the SOW_FIELD_CATALOG section this block belongs to, e.g. "invoiceProcedures" */
  sectionKey: Scalars['String']['output'];
  /** The text itself. Plain text; lines beginning "- " are bullets. */
  text: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  /** Keycloak sub or email of whoever last edited the block */
  updatedBy: Scalars['String']['output'];
  /** Display name of the last editor, resolved at write time — this is what the dropdown shows */
  updatedByName: Scalars['String']['output'];
};

/** Immutable snapshot of a Statement of Work */
export type SowVersion = {
  __typename?: 'SowVersion';
  clientSignature?: Maybe<SowConsent>;
  createdAt: Scalars['DateTime']['output'];
  /** Keycloak sub or email of the author */
  createdBy: Scalars['String']['output'];
  /** Display name of the author, resolved at write time */
  createdByName: Scalars['String']['output'];
  /** Human-facing label "<sent-count>.<sub-revision>", e.g. "1.2" — decoded from versionNumber. */
  displayVersion: Scalars['String']['output'];
  /** The document, in order */
  fields: Array<SowField>;
  id: Scalars['ID']['output'];
  inputs: SowVersionInputs;
  /** Unsent draft the staff abandoned; hidden from history by default */
  isDiscarded: Scalars['Boolean']['output'];
  /** Optional note describing what changed */
  note?: Maybe<Scalars['String']['output']>;
  sentToCustomerAt?: Maybe<Scalars['DateTime']['output']>;
  /** Exact accepted immutable job content version this SOW version derives from. Absent on historical rows and drafts saved without a valid accepted source. */
  sourceJobVersionNumber?: Maybe<Scalars['Int']['output']>;
  /** Parent SOW id (string mirror, for querying) */
  sowId: Scalars['ID']['output'];
  /** BU countersignature captured at finalize */
  staffSignature?: Maybe<SowConsent>;
  status: SowStatus;
  /** Sortable, unique key, and the encoding of the human-facing "<sent-count>.<sub-revision>" label in one number: major*1000 + minor. See displayVersion for the decoded "1.2" form — SowVersionService.encodeVersionNumber/decodeVersionNumber own the encoding. */
  versionNumber: Scalars['Int']['output'];
  /** True once this version has been issued: sent, signed, finalized or cancelled */
  visibleToCustomer: Scalars['Boolean']['output'];
};

/** Pricing adjustment as frozen into this version */
export type SowVersionAdjustment = {
  __typename?: 'SowVersionAdjustment';
  /** What this adjustment moves: unitAmount x multiplier */
  amount: Scalars['Float']['output'];
  /** What the adjustment is charging for. Absent on versions written before categories existed. */
  category?: Maybe<SowAdjustmentCategory>;
  description: Scalars['String']['output'];
  /** How many units the unit amount is charged for. Absent (or unset) means 1. */
  multiplier?: Maybe<Scalars['Float']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  type: SowAdjustmentType;
  /** Amount for a single unit, before the multiplier. This is what the Fee Schedule editor edits; amount follows from it. */
  unitAmount?: Maybe<Scalars['Float']['output']>;
};

export type SowVersionAdjustmentInput = {
  /** What this adjustment moves. Ignored when unitAmount is sent — the figure is derived from unitAmount x multiplier. */
  amount: Scalars['Float']['input'];
  /** What the adjustment is charging for. */
  category?: InputMaybe<SowAdjustmentCategory>;
  description: Scalars['String']['input'];
  /** How many units the unit amount is charged for. Omitted means 1. */
  multiplier?: InputMaybe<Scalars['Float']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  /** DISCOUNT subtracts, ADDITIONAL_COST adds. SPECIAL_TERM is no longer accepted — it never affected a total; use a custom section for narrative terms. */
  type: SowAdjustmentType;
  /** Amount for a single unit, before the multiplier. This is what the Fee Schedule editor edits; amount follows from it. */
  unitAmount?: InputMaybe<Scalars['Float']['input']>;
};

/** Structured inputs that generated this version */
export type SowVersionInputs = {
  __typename?: 'SowVersionInputs';
  adjustments: Array<SowVersionAdjustment>;
  baseCost: Scalars['Float']['output'];
  /** Pricing category of the job at the time this version was written */
  customerCategory?: Maybe<Scalars['String']['output']>;
  deliverables: Array<Scalars['String']['output']>;
  periods: Array<SowPeriod>;
  projectLead: Scalars['String']['output'];
  /** Keycloak sub of the project lead */
  projectLeadId?: Maybe<Scalars['String']['output']>;
  projectManager: Scalars['String']['output'];
  /** Keycloak sub of the project manager */
  projectManagerId?: Maybe<Scalars['String']['output']>;
  scopeOfWork: Array<Scalars['String']['output']>;
  services: Array<SowVersionService>;
  sowTitle?: Maybe<Scalars['String']['output']>;
  totalCost: Scalars['Float']['output'];
};

/** Service line as frozen into this version */
export type SowVersionService = {
  __typename?: 'SowVersionService';
  /** Category of the service, as it stood when this version was written. */
  category?: Maybe<Scalars['String']['output']>;
  /** What this line bills: unitCost x multiplier */
  cost: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  /** Everything baked into cost on top of unitCost. Read-only — it comes from the workflow, not the document. */
  multiplier?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  /** How unitCost was arrived at, for parameter-priced lines. Absent where there is nothing to itemise. */
  pricingDetails?: Maybe<Array<PricingDetail>>;
  /** The run count alone. Superseded by multiplier for display; kept because existing versions carry it. */
  runCount?: Maybe<Scalars['Float']['output']>;
  serviceId: Scalars['ID']['output'];
  /** Price of a single run, before the multiplier. This is what the Fee Schedule editor edits; cost follows from it. */
  unitCost?: Maybe<Scalars['Float']['output']>;
};

export type SowVersionServiceInput = {
  /** Deprecated and ignored. Service line figures come from the job spec; the document cannot set them. */
  cost: Scalars['Float']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  serviceId: Scalars['ID']['input'];
  /** Deprecated and ignored. Retained so an older browser bundle does not fail validation; service prices are owned by the job spec. */
  unitCost?: InputMaybe<Scalars['Float']['input']>;
};

/** A physical station/location in the lab. */
export type Station = {
  __typename?: 'Station';
  /** How many concurrent operations the station supports. */
  capacity?: Maybe<Scalars['Int']['output']>;
  /** Equipment assigned to this station. */
  equipment: Array<InventoryItem>;
  id: Scalars['ID']['output'];
  /** Soft-deleted flag. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Human-readable station name (e.g. "Bench 3", "PCR Corner"). */
  name: Scalars['String']['output'];
  /** Free-text notes. */
  notes?: Maybe<Scalars['String']['output']>;
  /** Station type/category (e.g. "bench", "instrument", "fume hood"). */
  type?: Maybe<Scalars['String']['output']>;
  /** X coordinate on the lab layout (for movement simulation). */
  x?: Maybe<Scalars['Float']['output']>;
  /** Y coordinate on the lab layout. */
  y?: Maybe<Scalars['Float']['output']>;
  /** Lab zone/room the station belongs to. */
  zone?: Maybe<Scalars['String']['output']>;
};

/** A station this equipment is placed at, with the quantity held there. */
export type StationPlacement = {
  __typename?: 'StationPlacement';
  /** How many units of this item are at this station. */
  quantity: Scalars['Int']['output'];
  /** Station where these units live. */
  stationId: Scalars['ID']['output'];
};

export type StationPlacementInput = {
  quantity: Scalars['Int']['input'];
  stationId: Scalars['ID']['input'];
};

export enum StepMappingStatus {
  Broken = 'BROKEN',
  Mapped = 'MAPPED',
  Unmapped = 'UNMAPPED'
}

/** Represents an Excel template configuration */
export type Template = {
  __typename?: 'Template';
  /** Column mapping configuration */
  columnMapping: Array<ColumnMapping>;
  /** When the template was created */
  createdAt: Scalars['DateTime']['output'];
  /** Optional description of the template */
  description?: Maybe<Scalars['String']['output']>;
  /** unique database generated ID */
  id: Scalars['ID']['output'];
  /** The name of the template */
  name: Scalars['String']['output'];
};

export type TrainingFileInput = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  key: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

/** A presigned S3 PUT the browser uploads to directly. */
export type TrainingFileUpload = {
  __typename?: 'TrainingFileUpload';
  contentType: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  key: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type TrainingFileUploadRequest = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

/** A Learning Hub document. */
export type TrainingResource = {
  __typename?: 'TrainingResource';
  /** Which access tiers may see and download this. Always at least one — there is no "everyone" shorthand here. */
  audienceRoles: Array<AnnouncementAudience>;
  /** A sentence or two on what this is and who it is for. */
  description: Scalars['String']['output'];
  /** Short-lived download URL, minted per request for callers in the audience. */
  downloadUrl?: Maybe<Scalars['String']['output']>;
  /** Null between creating the record and finishing the upload. */
  file?: Maybe<TrainingResourceFile>;
  /** unique database generated id */
  id: Scalars['ID']['output'];
  /** Shown in the Learning Hub list. */
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who last saved it. */
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** A Learning Hub document: an uploaded PDF, visible to the audiences it is addressed to. */
export type TrainingResourceFile = {
  __typename?: 'TrainingResourceFile';
  contentType: Scalars['String']['output'];
  /** Original filename, used for the download. */
  filename: Scalars['String']['output'];
  /** S3 object key. Never handed to a browser directly — downloads go through a short-lived presigned URL. */
  key: Scalars['String']['output'];
  size: Scalars['Int']['output'];
};

export type UpdateAnnouncementInput = {
  /** Omit to leave unchanged. An empty list is an error, not "nobody". */
  audienceRoles?: InputMaybe<Array<AnnouncementAudience>>;
  id?: InputMaybe<Scalars['ID']['input']>;
  is_displayed?: InputMaybe<Scalars['Boolean']['input']>;
  /** New body text. Omit to leave it unchanged. */
  text?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a column mapping */
export type UpdateColumnMappingInput = {
  /** The field identifier */
  field?: InputMaybe<Scalars['String']['input']>;
  /** The display name for the column header */
  headerName?: InputMaybe<Scalars['String']['input']>;
  /** The order position of the column */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** The data type of the column */
  type?: InputMaybe<Scalars['String']['input']>;
  /** The width of the column in pixels */
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCommentInput = {
  /** Updated content of the comment */
  content?: InputMaybe<Scalars['String']['input']>;
  /** Updated visibility setting */
  isInternal?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateNotificationPreferencesInput = {
  emailDisabledEventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  inAppDisabledEventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateSowInput = {
  /** Additional information */
  additionalInformation?: InputMaybe<Scalars['String']['input']>;
  /** Address of the client */
  clientAddress?: InputMaybe<Scalars['String']['input']>;
  /** Email address of the client */
  clientEmail?: InputMaybe<Scalars['String']['input']>;
  /** Institution of the client */
  clientInstitution?: InputMaybe<Scalars['String']['input']>;
  /** Name of the client */
  clientName?: InputMaybe<Scalars['String']['input']>;
  /** Date the SOW was created */
  date?: InputMaybe<Scalars['DateTime']['input']>;
  /** Array of deliverable descriptions */
  deliverables?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Pricing information */
  pricing?: InputMaybe<UpdateSowPricingInput>;
  /** Resource allocation */
  resources?: InputMaybe<UpdateSowResourcesInput>;
  /** Array of scope of work bullet points */
  scopeOfWork?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Services included in the SOW */
  services?: InputMaybe<Array<SowServiceInput>>;
  /** Technician-entered title for the SOW document (e.g. "Agreement to Perform Research Services") */
  sowTitle?: InputMaybe<Scalars['String']['input']>;
  /** Terms and conditions */
  terms?: InputMaybe<Scalars['String']['input']>;
  /** Timeline information */
  timeline?: InputMaybe<UpdateSowTimelineInput>;
};

export type UpdateSowPricingInput = {
  /** List of pricing adjustments */
  adjustments?: InputMaybe<Array<SowPricingAdjustmentInput>>;
  /** Base cost before adjustments */
  baseCost?: InputMaybe<Scalars['Float']['input']>;
  /** Discount applied to the pricing */
  discount?: InputMaybe<SowDiscountInput>;
  /** Total cost after adjustments */
  totalCost?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateSowResourcesInput = {
  /** Project lead assigned to the project */
  projectLead?: InputMaybe<Scalars['String']['input']>;
  /** Keycloak sub of the project lead */
  projectLeadId?: InputMaybe<Scalars['String']['input']>;
  /** Project manager assigned to the project */
  projectManager?: InputMaybe<Scalars['String']['input']>;
  /** Keycloak sub of the project manager */
  projectManagerId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSowTimelineInput = {
  /** Duration of the project (e.g., "14 days", "5 weeks") */
  duration?: InputMaybe<Scalars['String']['input']>;
  /** End date of the project */
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Start date of the project */
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Edits to an existing text block. Omitted fields are left alone. */
export type UpdateSowTextPresetInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateStationInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  x?: InputMaybe<Scalars['Float']['input']>;
  y?: InputMaybe<Scalars['Float']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing template */
export type UpdateTemplateInput = {
  /** Updated column mapping configuration */
  columnMapping?: InputMaybe<Array<UpdateColumnMappingInput>>;
  /** Optional description of the template */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the template to update */
  id: Scalars['ID']['input'];
  /** The name of the template */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTrainingResourceInput = {
  /** Omit to leave unchanged. An empty list is an error, not "everyone". */
  audienceRoles?: InputMaybe<Array<AnnouncementAudience>>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Audit log for a bulk inventory upload. */
export type UploadLog = {
  __typename?: 'UploadLog';
  /** IDs of inventory items affected by this upload. */
  affectedItemIds: Array<Scalars['ID']['output']>;
  /** Items created. */
  createdCount: Scalars['Int']['output'];
  /** Items that failed. */
  failedCount: Scalars['Int']['output'];
  /** Per-item before/after snapshots. */
  fieldSnapshots: Array<FieldSnapshot>;
  /** Original file name of the uploaded spreadsheet. */
  fileName: Scalars['String']['output'];
  /** Database generated id. */
  id: Scalars['ID']['output'];
  /** Total rows in the uploaded file. */
  rowCount: Scalars['Int']['output'];
  /** Items skipped. */
  skippedCount: Scalars['Int']['output'];
  /** Items updated. */
  updatedCount: Scalars['Int']['output'];
  /** When the upload was performed. */
  uploadDate: Scalars['DateTime']['output'];
  /** Display name of the uploader. */
  uploaderName: Scalars['String']['output'];
  /** Keycloak sub of the uploader. */
  uploaderSub?: Maybe<Scalars['String']['output']>;
};

export type UpsertProtocolStepMappingInput = {
  equipmentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  paramTags?: InputMaybe<Scalars['JSON']['input']>;
  protocolId: Scalars['String']['input'];
  requiresNoEquipment?: InputMaybe<Scalars['Boolean']['input']>;
  reviewed?: InputMaybe<Scalars['Boolean']['input']>;
  stepId: Scalars['String']['input'];
  stepNumber?: InputMaybe<Scalars['String']['input']>;
  stepTitle?: InputMaybe<Scalars['String']['input']>;
};

/** Result of generating usage billing: the SOW + invoice created together. */
export type UsageBillingResult = {
  __typename?: 'UsageBillingResult';
  invoice: UsageInvoice;
  sow: UsageSow;
};

/** A usage-based invoice generated from a user’s inventory bookings. */
export type UsageInvoice = {
  __typename?: 'UsageInvoice';
  billToEmail: Scalars['String']['output'];
  billToInstitution?: Maybe<Scalars['String']['output']>;
  billToName: Scalars['String']['output'];
  billToSub: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  customerCategory?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invoiceDate: Scalars['DateTime']['output'];
  /** Unique invoice number (e.g. "USAGE-INV-001"). */
  invoiceNumber: Scalars['String']['output'];
  lineItems: Array<UsageLineItem>;
  /** The usage SOW this invoice was generated alongside. */
  sowId?: Maybe<Scalars['ID']['output']>;
  totalCost: Scalars['Float']['output'];
};

/** One line on a usage SOW/invoice — a single booking rolled up for billing. */
export type UsageLineItem = {
  __typename?: 'UsageLineItem';
  /** Line cost. */
  cost: Scalars['Float']['output'];
  /** Human-readable usage detail (e.g. "3.5 hrs @ $40.00/hr" or "200 units @ $0.10/unit"). */
  detail: Scalars['String']['output'];
  /** Booking id this line came from. */
  id: Scalars['ID']['output'];
  /** Item name (e.g. "Bioanalyzer"). */
  label: Scalars['String']['output'];
  /** When the usage occurred (ISO string). */
  usedAt?: Maybe<Scalars['String']['output']>;
};

/** A usage-based Statement of Work generated from a user’s inventory bookings. */
export type UsageSow = {
  __typename?: 'UsageSow';
  additionalInformation?: Maybe<Scalars['String']['output']>;
  billToEmail: Scalars['String']['output'];
  billToInstitution?: Maybe<Scalars['String']['output']>;
  billToName: Scalars['String']['output'];
  /** Keycloak sub of the billed user. */
  billToSub: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  customerCategory?: Maybe<Scalars['String']['output']>;
  date: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lineItems: Array<UsageLineItem>;
  /** Unique SOW number (e.g. "USAGE-SOW-001"). */
  sowNumber: Scalars['String']['output'];
  terms: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  totalCost: Scalars['Float']['output'];
};

export type WithdrawJobInput = {
  jobId: Scalars['ID']['input'];
  operationId: Scalars['String']['input'];
  /** Shown to the customer in the automated comment. */
  reason: Scalars['String']['input'];
};

/** Represents a series of services that are connected together to form a workflow. */
export type Workflow = {
  __typename?: 'Workflow';
  /** The edges in the workflow */
  edges: Array<WorkflowEdge>;
  id: Scalars['ID']['output'];
  /** The parent job this workflow belongs to */
  job?: Maybe<Job>;
  /** The name of the workflow */
  name: Scalars['String']['output'];
  /** The nodes in the workflow */
  nodes: Array<WorkflowNode>;
  /** Where in the process the Workflow is */
  state: WorkflowState;
};

/** Represents a single edge in a workflow */
export type WorkflowEdge = {
  __typename?: 'WorkflowEdge';
  /** ID used in identify the edge in the workflow */
  id: Scalars['ID']['output'];
  /** React Flow representation of the edge for re-generating the graph. Nullable for the same reason as WorkflowNode.reactNode: older edges have none, and selecting a non-nullable field would fail the whole query. */
  reactEdge?: Maybe<Scalars['JSON']['output']>;
  /** The source node of the edge */
  source: WorkflowNode;
  /** The target node of the edge */
  target: WorkflowNode;
};

/** Represents a single node in a workflow. A node is a service with the cooresponding parameters populated. */
export type WorkflowNode = {
  __typename?: 'WorkflowNode';
  /** Database generated ID */
  _id: Scalars['ID']['output'];
  /** Additional instructions for this portion of the workflow */
  additionalInstructions: Scalars['String']['output'];
  /** When the card was archived. */
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who archived it (username/email). */
  archivedBy?: Maybe<Scalars['String']['output']>;
  /** The state the card was in when archived — an audit trail, since an admin may archive work that was still in progress. */
  archivedFromState?: Maybe<WorkflowNodeState>;
  /** Display name of assigned staff member */
  assigneeDisplayName?: Maybe<Scalars['String']['output']>;
  /** Keycloak sub (or id) of assigned staff member */
  assigneeId?: Maybe<Scalars['String']['output']>;
  /** protocols.io step identifiers the assigned technician has checked off in the bench view. Persisted so step progress survives refresh. Cleared/ignored when there is no linked protocol. */
  completedSteps?: Maybe<Array<Scalars['String']['output']>>;
  /** Estimated duration in minutes (lab monitor) */
  estimatedMinutes?: Maybe<Scalars['Float']['output']>;
  /** Parameters defined earlier in the graph. Always returned as an array of { id, value }; multi-value params have value: string[]. Stored in array shape for new/updated nodes. */
  formData: Scalars['JSON']['output'];
  /** ID used in identify the node in the workflow */
  id: Scalars['ID']['output'];
  /** Planned end of this operation’s inventory hold. Optional; defaults to start + estimatedMinutes (or a few hours). */
  inventoryReservationEnd?: Maybe<Scalars['DateTime']['output']>;
  /** Planned start of this operation’s inventory hold (for the shared scheduling/availability pool). Optional; defaults to startedAt/now. */
  inventoryReservationStart?: Maybe<Scalars['DateTime']['output']>;
  /** Archived: hidden from the lab monitor board, but retained. */
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  /** True when nothing upstream of this operation is outstanding — every predecessor in its workflow is COMPLETE. Only populated by assignedOperations; a blocking predecessor is often assigned to someone else, so this cannot be derived from the caller's own operations. */
  isReadyToStart?: Maybe<Scalars['Boolean']['output']>;
  /** Parent job (for bench-view context + per-operation note scoping) */
  job?: Maybe<WorkflowNodeJob>;
  /** Human readable name of the service */
  label: Scalars['String']['output'];
  /** Snapshot of service price at submission time */
  price?: Maybe<Scalars['Float']['output']>;
  /** React Flow representation of the node (including its canvas position) for re-generating the graph. Nullable: nodes created before this was persisted, or through paths that never set it, have none — and a non-nullable field would make merely selecting it fail the whole job query. */
  reactNode?: Maybe<Scalars['JSON']['output']>;
  /** The service this node represents */
  service?: Maybe<DampLabService>;
  /** When node entered IN_PROGRESS (for elapsed time) */
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Where in the process is the current node */
  state: WorkflowNodeState;
  /** Inventory items currently held by this node while it is IN_PROGRESS. Cleared automatically on transition out of IN_PROGRESS. */
  usedInventory?: Maybe<Array<Scalars['String']['output']>>;
  /** Parent workflow containing this node */
  workflow?: Maybe<Workflow>;
  /** Parent workflow id, for grouping a bench list. Only populated by assignedOperations. */
  workflowId?: Maybe<Scalars['ID']['output']>;
};

/** Minimal parent-job context for a workflow node (technician bench view). */
export type WorkflowNodeJob = {
  __typename?: 'WorkflowNodeJob';
  /** Job database id (used to scope comments/notes + link to the job view). */
  id: Scalars['ID']['output'];
  /** Customer-facing 5-digit job number. */
  jobId?: Maybe<Scalars['String']['output']>;
  /** Human-readable job name. */
  name?: Maybe<Scalars['String']['output']>;
};

export enum WorkflowNodeState {
  Complete = 'COMPLETE',
  InProgress = 'IN_PROGRESS',
  Queued = 'QUEUED'
}

/** Presigned URL details for uploading a single workflow parameter file */
export type WorkflowParameterFileUpload = {
  __typename?: 'WorkflowParameterFileUpload';
  clientToken: Scalars['String']['output'];
  contentType: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  key: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploadUrl: Scalars['String']['output'];
};

/** File metadata used when requesting presigned upload URLs for workflow parameter files */
export type WorkflowParameterFileUploadRequest = {
  clientToken: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  size: Scalars['Int']['input'];
};

export enum WorkflowState {
  Complete = 'COMPLETE',
  InProgress = 'IN_PROGRESS',
  Queued = 'QUEUED'
}
