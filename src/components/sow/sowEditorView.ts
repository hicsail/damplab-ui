import { diffVersions, VersionDiff } from '../../utils/sowDiff';
import { blockerStep, repairBlockers, SowActionGate, SowField, SowStatus, SowVersion, SowVersionInputs, type DocumentBlocker } from './sowTypes';

/** Client-only working copy — never persisted as a version number. */
export const UNSAVED_VIEW = 'unsaved' as const;
export type SowViewing = typeof UNSAVED_VIEW | number;

/**
 * Whether the fields on screen are the editable working copy, as opposed to a
 * saved snapshot the staff member is paging through.
 */
export function isShowingWorkingCopy(viewing: SowViewing, currentVersionNumber: number, dirty: boolean): boolean {
  if (viewing === UNSAVED_VIEW) return true;
  return viewing === currentVersionNumber && !dirty;
}

export function editorIsReadOnly(opts: {
  cancelled: boolean;
  viewing: SowViewing;
  currentVersionNumber: number;
  dirty: boolean;
  baseline: number | null;
}): boolean {
  if (opts.cancelled) return true;
  if (opts.baseline != null) return true;
  return !isShowingWorkingCopy(opts.viewing, opts.currentVersionNumber, opts.dirty);
}

/**
 * First edit on the current saved version lands on Unsaved; cleaning the copy
 * (Reset, or undoing every change) lands back on the current saved version.
 * Browsing history is left alone so Unsaved can sit in the dropdown unused.
 */
export function viewingAfterDirtyChange(viewing: SowViewing, currentVersionNumber: number, dirty: boolean): SowViewing {
  if (dirty && viewing === currentVersionNumber) return UNSAVED_VIEW;
  if (!dirty && viewing === UNSAVED_VIEW) return currentVersionNumber;
  return viewing;
}

/** Saved versions offered in Compare to, newest first. */
export function compareToVersions(versions: SowVersion[], viewing: SowViewing): SowVersion[] {
  const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  if (viewing === UNSAVED_VIEW) return ordered;
  return ordered.filter((v) => v.versionNumber !== viewing);
}

/** Compare to cannot target the version now on screen. Unsaved is never a baseline. */
export function baselineAfterViewingChange(baseline: number | null, viewing: SowViewing): number | null {
  if (baseline == null) return null;
  if (viewing !== UNSAVED_VIEW && baseline === viewing) return null;
  return baseline;
}

/**
 * The document the staff member is looking at. Unsaved is the current version
 * with the working fields/inputs swapped in, so a diff against the last saved
 * copy (same version number) still has two distinct field lists.
 */
export function displayedVersion(
  viewing: SowViewing,
  history: SowVersion[],
  current: SowVersion,
  workingFields: SowField[],
  workingInputs: SowVersionInputs
): SowVersion {
  if (viewing === UNSAVED_VIEW) {
    return { ...current, fields: workingFields, inputs: workingInputs };
  }
  return history.find((v) => v.versionNumber === viewing) ?? current;
}

/**
 * PDFDownloadLink re-layouts the whole document whenever `document` is a new
 * React element. Unsaved fields change on every keystroke, so the download must
 * be built from a saved snapshot — not the working copy on screen.
 */
export function pdfSourceVersion(viewing: SowViewing | null, history: SowVersion[], current: SowVersion | null): SowVersion | null {
  if (!current) return null;
  if (viewing == null || viewing === UNSAVED_VIEW) return current;
  return history.find((v) => v.versionNumber === viewing) ?? current;
}

/**
 * Compare to is opt-in. Unsaved may be diffed against its parent saved version
 * (same versionNumber); a saved view compared to itself is a no-op.
 */
export function editorDiff(
  baseline: number | null,
  viewing: SowViewing,
  history: SowVersion[],
  current: SowVersion,
  workingFields: SowField[],
  workingInputs: SowVersionInputs
): VersionDiff | null {
  if (baseline == null) return null;
  if (viewing !== UNSAVED_VIEW && baseline === viewing) return null;
  const before = history.find((v) => v.versionNumber === baseline) ?? null;
  if (!before) return null;
  return diffVersions(before, displayedVersion(viewing, history, current, workingFields, workingInputs));
}

export function revertIsEnabled(viewing: SowViewing): boolean {
  return viewing !== UNSAVED_VIEW;
}

export function cloneVersionDocument(source: SowVersion): { fields: SowField[]; inputs: SowVersionInputs } {
  return {
    fields: structuredClone(source.fields),
    inputs: structuredClone(source.inputs)
  };
}

export type SowNextAction =
  | { kind: 'save'; label: string }
  | { kind: 'send'; label: string }
  | { kind: 'countersign'; label: string }
  | { kind: 'blocked'; label: string; reason?: string };

export function statusCardRepair(input: {
  currentStatus?: SowStatus | null;
  activeStatus?: SowStatus | null;
  hasUnsentDraft: boolean;
  gate?: SowActionGate | null;
}): { title: string; blockers: DocumentBlocker[] } | null {
  let title: string;
  let blockers: readonly DocumentBlocker[];

  if (input.hasUnsentDraft && input.currentStatus === 'DRAFT') {
    title = 'Not ready to send';
    blockers = input.gate?.sendBlockers ?? [];
  } else if (input.activeStatus === 'SENT') {
    title = 'Customer cannot sign';
    blockers = input.gate?.signBlockers ?? [];
  } else if (!input.hasUnsentDraft && input.activeStatus === 'SIGNED') {
    title = 'Not ready to countersign';
    blockers = input.gate?.countersignBlockers ?? [];
  } else {
    return null;
  }

  const repair = repairBlockers(blockers);
  return repair.length > 0 ? { title, blockers: repair } : null;
}

/**
 * The one thing staff can do next.
 *
 * Save, Send and Countersign are stages of a single pipeline and exactly one is
 * ever legal, so they share a button rather than sitting in a row with two of
 * them permanently greyed. The label always names the action, and the caller
 * confirms before the two outward-facing ones fire.
 *
 * `dirty` and `missingRequired` come from unsaved local state the server has not
 * seen; everything else comes from the gate, which is also what the server
 * enforces. Recalculate is deliberately absent — it changes what the document
 * bills, so it stays on the Fee Schedule row where the figures are visible.
 */
export function nextSowAction(opts: {
  dirty: boolean;
  status: SowStatus | null;
  activeStatus: SowStatus | null;
  gate?: SowActionGate | null;
  missingRequired: string[];
  /** True while staff are paging through history or the SOW is cancelled. */
  readOnly?: boolean;
}): SowNextAction {
  const { dirty, status, activeStatus, gate, missingRequired, readOnly } = opts;

  // Checked before readOnly, which a cancelled SOW also trips: "viewing history"
  // would be the wrong explanation for a document that has been withdrawn.
  if (status === 'CANCELLED') {
    return { kind: 'blocked', label: 'Cancelled', reason: 'This Statement of Work was cancelled and cannot be altered.' };
  }

  // Every action below operates on the *current* version, not the one on screen.
  // Offering them while a historic version is displayed would act on something
  // the staff member is not looking at.
  if (readOnly) {
    return { kind: 'blocked', label: 'Viewing history', reason: 'Switch back to the working copy to act on this SOW.' };
  }

  if (dirty) return { kind: 'save', label: 'Save draft' };

  // An outstanding draft is always the next thing to go out — this is checked
  // before the signature stage on purpose. Revising a signed SOW leaves a draft
  // above the version the customer holds, and that revision has to be sent and
  // re-signed before there is anything new to countersign. Testing the signature
  // first would offer a permanently blocked "Countersign" whose own tooltip tells
  // staff to send the revision they are being refused.
  if (status === 'DRAFT') {
    if (missingRequired.length > 0) {
      return { kind: 'blocked', label: 'Send to customer', reason: `Complete before sending: ${missingRequired.join(', ')}.` };
    }
    if (gate?.canSend) return { kind: 'send', label: 'Send to customer' };
    const blocker = gate?.sendBlockers?.[0];
    return { kind: 'blocked', label: 'Send to customer', reason: blocker ? blockerStep(blocker) : undefined };
  }

  // No draft outstanding: the current version is the one the customer holds.
  if (activeStatus === 'SIGNED') {
    if (gate?.canCountersign) return { kind: 'countersign', label: 'Countersign and finalize' };
    const blocker = gate?.countersignBlockers?.[0];
    return { kind: 'blocked', label: 'Countersign and finalize', reason: blocker ? blockerStep(blocker) : undefined };
  }

  // Countersigned: the engagement is closed out and nothing is outstanding. This
  // has to come before the fallthrough below, which would otherwise claim the lab
  // is waiting on a customer who has already signed and been countersigned.
  if (status === 'FINAL') {
    return { kind: 'blocked', label: 'Countersigned', reason: 'This Statement of Work is complete. Editing it starts a new draft.' };
  }

  return { kind: 'blocked', label: 'Awaiting customer', reason: 'The customer has this version and has not signed it yet.' };
}
