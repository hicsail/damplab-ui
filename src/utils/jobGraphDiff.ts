import { diffWordsWithSpace, Change } from 'diff';
import { RUN_COUNT_PARAM_ID } from './servicePricing';

/**
 * Comparing two versions of a job's workflow graph.
 *
 * The unit of comparison is the node, keyed by its React Flow client id, which
 * survives submission, hydration, editing and save unchanged. Parameters are
 * compared within a node by parameter id, so reordering the catalogue's
 * parameter list never registers as an edit.
 */

export type NodeChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';

export type JobVersionAuthorRole = 'CUSTOMER' | 'STAFF';

export interface SnapshotNode {
    id: string;
    label?: string;
    serviceId?: string;
    serviceName?: string;
    formData?: any;
    additionalInstructions?: string;
}

export interface SnapshotEdge {
    id?: string;
    source: string;
    target: string;
}

export interface SnapshotWorkflow {
    workflowId?: string | null;
    name?: string;
    nodes?: SnapshotNode[];
    edges?: SnapshotEdge[];
}

export interface JobVersionLike {
    versionNumber: number;
    displayVersion?: string | null;
    authorRole: JobVersionAuthorRole;
    workflows?: SnapshotWorkflow[];
    createdAt?: string;
    createdByName?: string;
    note?: string | null;
    /** The job's state when the version was written. Absent on versions predating the field. */
    jobState?: string | null;
    /** True for a state-change record rather than a graph edit; its graph is a copy of its predecessor's. */
    isEvent?: boolean | null;
    /** False on staff-only drafts; omitted or true once the customer can see it. */
    visibleToCustomer?: boolean | null;
}

export interface ParamDiff {
    id: string;
    name: string;
    before: string;
    after: string;
    /**
     * The stored values, untouched. A renderer that knows the parameter
     * definition — a dropdown's option list, say — needs these to show names
     * rather than the option ids `before`/`after` fall back to.
     */
    beforeRaw: any;
    afterRaw: any;
    /** Word-level parts over `before`/`after`, for rendering through SowDiffText. */
    parts: Change[];
}

export interface NodeDiff {
    nodeId: string;
    label: string;
    kind: NodeChangeKind;
    /** Present when kind === 'changed'. */
    paramDiffs: ParamDiff[];
    /** True when the node's service was swapped for a different one. */
    serviceChanged: boolean;
    /** The node as it appears in the baseline, for rendering a removed node. */
    before?: SnapshotNode;
    after?: SnapshotNode;
}

export interface GraphDiff {
    byNodeId: Map<string, NodeDiff>;
    added: string[];
    removed: string[];
    changed: string[];
    edgesAdded: string[];
    edgesRemoved: string[];
    hasChanges: boolean;
}

export const EMPTY_DIFF: GraphDiff = {
    byNodeId: new Map(),
    added: [],
    removed: [],
    changed: [],
    edgesAdded: [],
    edgesRemoved: [],
    hasChanges: false
};

const flattenNodes = (workflows: SnapshotWorkflow[] | undefined): Map<string, SnapshotNode> => {
    const byId = new Map<string, SnapshotNode>();
    for (const workflow of workflows ?? []) {
        for (const node of workflow.nodes ?? []) {
            if (node?.id) byId.set(node.id, node);
        }
    }
    return byId;
};

/** Edges are identified by their endpoints, not their ids — an id is regenerated on save, a connection is not. */
const flattenEdgeKeys = (workflows: SnapshotWorkflow[] | undefined): Set<string> => {
    const keys = new Set<string>();
    for (const workflow of workflows ?? []) {
        for (const edge of workflow.edges ?? []) {
            if (edge?.source && edge?.target) keys.add(`${edge.source}->${edge.target}`);
        }
    }
    return keys;
};

/** Human-readable form of a stored parameter value, for display and for text diffing. */
export const formatParamValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (Array.isArray(value)) return value.map(formatParamValue).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        if (typeof value.filename === 'string') return value.filename;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
};

const paramEntries = (formData: any): Map<string, any> => {
    const entries = new Map<string, any>();
    if (Array.isArray(formData)) {
        for (const entry of formData) {
            if (entry && typeof entry.id === 'string') entries.set(entry.id, entry);
        }
    }
    // An absent run count means one run, so a snapshot taken before the
    // universal run-count entry existed must compare equal to one that spells
    // the default out. Mirrors paramValuesById on the backend.
    if (!entries.has(RUN_COUNT_PARAM_ID)) entries.set(RUN_COUNT_PARAM_ID, { id: RUN_COUNT_PARAM_ID, name: 'Number of runs', value: 1 });
    return entries;
};

const isEmptyValue = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value)) return value.every((v) => v === null || v === undefined || v === '');
    return false;
};

const diffParams = (before: SnapshotNode, after: SnapshotNode): ParamDiff[] => {
    const beforeParams = paramEntries(before.formData);
    const afterParams = paramEntries(after.formData);
    const ids = new Set<string>([...beforeParams.keys(), ...afterParams.keys()]);

    const diffs: ParamDiff[] = [];
    for (const id of ids) {
        const beforeEntry = beforeParams.get(id);
        const afterEntry = afterParams.get(id);
        const beforeText = formatParamValue(beforeEntry?.value);
        const afterText = formatParamValue(afterEntry?.value);

        // A parameter the catalogue gained since the baseline arrives empty; that
        // is not something anyone edited. Nor is a number that changed only from
        // text to numeric.
        if (isEmptyValue(beforeEntry?.value) && isEmptyValue(afterEntry?.value)) continue;
        if (beforeText === afterText) continue;

        diffs.push({
            id,
            name: afterEntry?.name ?? beforeEntry?.name ?? id,
            before: beforeText,
            after: afterText,
            beforeRaw: beforeEntry?.value,
            afterRaw: afterEntry?.value,
            parts: diffWordsWithSpace(beforeText, afterText)
        });
    }
    return diffs;
};

/**
 * Compares the graph in `after` against `before`.
 *
 * A node counts as changed when its service was swapped, any parameter value
 * moved, or its additional instructions were rewritten. Position is deliberately
 * ignored — dragging a node around is not an edit to the work being ordered.
 */
export function diffJobGraphs(before: SnapshotWorkflow[] | undefined, after: SnapshotWorkflow[] | undefined): GraphDiff {
    const beforeNodes = flattenNodes(before);
    const afterNodes = flattenNodes(after);

    const byNodeId = new Map<string, NodeDiff>();
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    for (const [id, afterNode] of afterNodes) {
        const beforeNode = beforeNodes.get(id);
        const label = afterNode.label ?? afterNode.serviceName ?? id;

        if (!beforeNode) {
            byNodeId.set(id, { nodeId: id, label, kind: 'added', paramDiffs: [], serviceChanged: false, after: afterNode });
            added.push(id);
            continue;
        }

        const serviceChanged = String(beforeNode.serviceId ?? '') !== String(afterNode.serviceId ?? '');
        const paramDiffs = diffParams(beforeNode, afterNode);
        const instructionsChanged = (beforeNode.additionalInstructions ?? '') !== (afterNode.additionalInstructions ?? '');

        if (serviceChanged || paramDiffs.length > 0 || instructionsChanged) {
            byNodeId.set(id, { nodeId: id, label, kind: 'changed', paramDiffs, serviceChanged, before: beforeNode, after: afterNode });
            changed.push(id);
            continue;
        }

        byNodeId.set(id, { nodeId: id, label, kind: 'unchanged', paramDiffs: [], serviceChanged: false, before: beforeNode, after: afterNode });
    }

    for (const [id, beforeNode] of beforeNodes) {
        if (afterNodes.has(id)) continue;
        byNodeId.set(id, {
            nodeId: id,
            label: beforeNode.label ?? beforeNode.serviceName ?? id,
            kind: 'removed',
            paramDiffs: [],
            serviceChanged: false,
            before: beforeNode
        });
        removed.push(id);
    }

    const beforeEdges = flattenEdgeKeys(before);
    const afterEdges = flattenEdgeKeys(after);
    const edgesAdded = [...afterEdges].filter((key) => !beforeEdges.has(key));
    const edgesRemoved = [...beforeEdges].filter((key) => !afterEdges.has(key));

    return {
        byNodeId,
        added,
        removed,
        changed,
        edgesAdded,
        edgesRemoved,
        hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0 || edgesAdded.length > 0 || edgesRemoved.length > 0
    };
}

/**
 * The version `versionNumber` should be compared against.
 *
 * Keys off the author of the version being viewed, not off the viewer, so both
 * parties see the same diff. Mirrors JobVersionService.baselineFor on the
 * backend — keep the two in step.
 */
export function pickJobDiffBaseline(versions: JobVersionLike[], versionNumber: number): number | null {
    const current = versions.find((v) => v.versionNumber === versionNumber);
    if (!current) return null;

    const earlierByOtherSide = versions
        // Event versions are skipped: their graph is a verbatim copy of the one
        // before them, so comparing against one reports "nothing changed" and
        // hides the edit it followed.
        .filter((v) => v.versionNumber < versionNumber && v.authorRole !== current.authorRole && v.isEvent !== true)
        .sort((a, b) => b.versionNumber - a.versionNumber);

    return earlierByOtherSide.length ? earlierByOtherSide[0].versionNumber : null;
}

/** The newest version, or null when a job has none yet. */
export function latestVersion(versions: JobVersionLike[]): JobVersionLike | null {
    if (!versions.length) return null;
    return versions.reduce((newest, v) => (v.versionNumber > newest.versionNumber ? v : newest), versions[0]);
}

/**
 * The newest version that actually holds a graph, which is what the live job
 * looks like now.
 *
 * A state change appends an event version whose workflows are copied verbatim,
 * so the newest version overall is often not the newest *edit*. Diffing and the
 * read-only check both key off this rather than `latestVersion`: treating a
 * trailing "Closed" event as the current version would make the customer's last
 * edits stop highlighting the moment staff closed the job, and would put the
 * editor into read-only mode on a job that is still editable.
 */
export function latestContentVersion(versions: JobVersionLike[]): JobVersionLike | null {
    const content = versions.filter((v) => v.isEvent !== true);
    return latestVersion(content.length ? content : versions);
}

/**
 * The pair a viewer should be shown: the newest version, and the baseline to
 * highlight against.
 *
 * Normally that is the cross-party baseline. When there is no version from the
 * other side it falls back to the immediately preceding version — which matters
 * for jobs staff submitted on a customer's behalf through `/staff_submit`, where
 * every version is STAFF-authored and collapsing the baseline onto the current
 * version would hide the technician's edits completely.
 *
 * Only a job with a single version has no baseline at all, and there the
 * baseline is that version itself, so nothing highlights until someone edits it.
 */
export function currentDiffPair(versions: JobVersionLike[]): { current: JobVersionLike | null; baseline: JobVersionLike | null } {
    // The newest *edit*, not the newest row: a trailing state-change event holds
    // a copy of this graph, and diffing it against its own predecessor would
    // report no changes at all.
    const current = latestContentVersion(versions);
    if (!current) return { current: null, baseline: null };

    const crossParty = pickJobDiffBaseline(versions, current.versionNumber);
    if (crossParty !== null) {
        return { current, baseline: versions.find((v) => v.versionNumber === crossParty) ?? current };
    }

    const previous = versions
        .filter((v) => v.versionNumber < current.versionNumber && v.isEvent !== true)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0];

    return { current, baseline: previous ?? current };
}

const JOB_VERSION_MINOR_WIDTH = 1000;

export function jobVersionDisplayLabel(versionNumber: number): string {
    if (versionNumber < JOB_VERSION_MINOR_WIDTH) return String(versionNumber);
    return `${Math.floor(versionNumber / JOB_VERSION_MINOR_WIDTH)}.${versionNumber % JOB_VERSION_MINOR_WIDTH}`;
}

/** Short label for a version, e.g. "v3 · staff · Aug 13". */
export function jobVersionLabel(version: JobVersionLike): string {
    const date = version.createdAt ? new Date(version.createdAt) : null;
    const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return `v${jobVersionDisplayLabel(version.versionNumber)} · ${version.authorRole.toLowerCase()}${when ? ` · ${when}` : ''}`;
}

/**
 * The pair to diff when the viewer has picked explicitly.
 *
 * Viewing `null` means the page has not yet recorded a picker choice, so the
 * latest content version is on screen. An explicit baseline still applies in
 * that case — otherwise Compare-to is a no-op until the reader also touches
 * View. A baseline of `null` means "compare against nothing", distinct from
 * "no baseline available" (`undefined`).
 *
 * When automatic comparison finds no earlier version, the baseline is the
 * version on screen. That is what lets unsaved op/param edits highlight in the
 * editor before a second version exists.
 */
export function selectedDiffPair(
    versions: JobVersionLike[],
    viewing: number | null,
    baseline: number | null | undefined
): { current: JobVersionLike | null; baseline: JobVersionLike | null } {
    const viewingNumber = viewing ?? latestContentVersion(versions)?.versionNumber ?? null;
    if (viewingNumber == null) return { current: null, baseline: null };

    const current = versions.find((v) => v.versionNumber === viewingNumber) ?? null;
    if (!current) return currentDiffPair(versions);
    if (baseline === undefined) {
        const auto =
            pickJobDiffBaseline(versions, viewingNumber) ??
            versions
                .filter((v) => v.versionNumber < viewingNumber && v.isEvent !== true)
                .sort((a, b) => b.versionNumber - a.versionNumber)[0]?.versionNumber ??
            current.versionNumber;
        return { current, baseline: versions.find((v) => v.versionNumber === auto) ?? current };
    }
    if (baseline === null) return { current, baseline: null };

    return { current, baseline: versions.find((v) => v.versionNumber === baseline) ?? null };
}

/** Customer-facing wording for a job state; the raw enum name is a poor label. */
export function jobStateLabel(state?: string | null): string | null {
    if (!state) return null;
    const LABELS: Record<string, string> = {
        CREATING: 'Draft',
        SUBMITTED: 'Submitted',
        CHANGES_REQUESTED: 'Changes Requested',
        ACCEPTED: 'Accepted',
        WAITING_FOR_SOW: 'Waiting for SOW',
        QUEUED: 'Queued',
        IN_PROGRESS: 'In Progress',
        COMPLETE: 'Complete',
        REJECTED: 'Rejected',
        CLOSED: 'Closed'
    };
    return LABELS[state] ?? state;
}

export function jobVersionChip(version: Pick<JobVersionLike, 'isEvent' | 'note' | 'jobState'>): string | null {
    if (version.isEvent) return jobStateLabel(version.jobState);
    if (version.note === 'Original submission') return 'Submitted';
    return 'Draft';
}

/** Chip colour for a job state, matching how the SOW history colours its statuses. */
export function jobStateColor(state?: string | null): 'default' | 'info' | 'success' | 'warning' | 'error' {
    switch (state) {
        case 'SUBMITTED':
        case 'ACCEPTED':
            return 'info';
        case 'CHANGES_REQUESTED':
            return 'warning';
        case 'COMPLETE':
        case 'CLOSED':
            return 'success';
        case 'REJECTED':
        case 'CANCELLED':
            return 'error';
        default:
            return 'default';
    }
}
