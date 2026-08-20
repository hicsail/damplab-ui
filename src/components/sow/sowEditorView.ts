import { diffVersions, VersionDiff } from '../../utils/sowDiff';
import { SowField, SowVersion, SowVersionInputs } from './sowTypes';

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
