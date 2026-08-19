import { diffWordsWithSpace, Change } from 'diff';
import { SowField, SowStatus, SowVersion } from '../components/sow/sowTypes';
import { formatSOWInstant } from './sowDateUtils';

/**
 * Comparing two versions of a SOW.
 *
 * Both versions are already loaded client-side, so the baseline is a parameter
 * of the view rather than a fixed rule: staff can compare against any version,
 * while customers are pinned to the last version they were sent.
 */

export type FieldChangeKind = 'added' | 'removed' | 'changed' | 'shown' | 'hidden' | 'unchanged';

export interface FieldDiff {
  key: string;
  label: string;
  kind: FieldChangeKind;
  /** Word-level parts, present only when kind === 'changed'. */
  parts?: Change[];
  before?: SowField;
  after?: SowField;
}

export interface VersionDiff {
  /** Every field in the newer version's order, plus any that were removed. */
  fields: FieldDiff[];
  changedKeys: Set<string>;
  hasChanges: boolean;
}

/**
 * Compares the document in `after` against `before`.
 *
 * Enabling and disabling a section are reported separately from a text edit:
 * "the customer will now see this" is a different fact from "the wording moved",
 * and conflating them would hide one behind the other.
 */
export function diffVersions(before: SowVersion | null | undefined, after: SowVersion | null | undefined): VersionDiff {
  const afterFields = [...(after?.fields ?? [])].sort((a, b) => a.order - b.order);
  const beforeByKey = new Map((before?.fields ?? []).map((f) => [f.key, f]));

  const fields: FieldDiff[] = [];
  const changedKeys = new Set<string>();

  for (const af of afterFields) {
    const bf = beforeByKey.get(af.key);

    if (!bf) {
      fields.push({ key: af.key, label: af.label, kind: 'added', after: af });
      changedKeys.add(af.key);
      continue;
    }

    if (bf.isEnabled !== af.isEnabled) {
      const kind: FieldChangeKind = af.isEnabled ? 'shown' : 'hidden';
      fields.push({ key: af.key, label: af.label, kind, before: bf, after: af });
      changedKeys.add(af.key);
      continue;
    }

    if ((bf.value ?? '') !== (af.value ?? '')) {
      fields.push({ key: af.key, label: af.label, kind: 'changed', parts: diffWordsWithSpace(bf.value ?? '', af.value ?? ''), before: bf, after: af });
      changedKeys.add(af.key);
      continue;
    }

    fields.push({ key: af.key, label: af.label, kind: 'unchanged', before: bf, after: af });
  }

  // Sections present in the baseline but gone from the newer version. Nothing in
  // the editor deletes a catalogue section, so this only fires for custom ones.
  const afterKeys = new Set(afterFields.map((f) => f.key));
  for (const bf of before?.fields ?? []) {
    if (afterKeys.has(bf.key)) continue;
    fields.push({ key: bf.key, label: bf.label, kind: 'removed', before: bf });
    changedKeys.add(bf.key);
  }

  return { fields, changedKeys, hasChanges: changedKeys.size > 0 };
}

const ISSUED: SowStatus[] = ['SIGNED', 'FINAL'];

/**
 * The version a staff member most likely wants to compare against.
 *
 * After a document has been signed or finalized, the interesting question is
 * "what have we changed since the customer committed to it", so the default
 * jumps back to that version rather than to the previous draft. Before that, the
 * immediately preceding version is the useful comparison.
 *
 * `versions` may be in any order; the newest is found by number.
 */
export function pickDiffBaseline(versions: SowVersion[], currentVersionNumber: number): number | null {
  const others = versions.filter((v) => v.versionNumber < currentVersionNumber).sort((a, b) => b.versionNumber - a.versionNumber);
  if (others.length === 0) return null;

  const current = versions.find((v) => v.versionNumber === currentVersionNumber);
  const isPostSigningEdit = !!current && !ISSUED.includes(current.status) && others.some((v) => ISSUED.includes(v.status));

  if (isPostSigningEdit) {
    const lastIssued = others.find((v) => ISSUED.includes(v.status));
    if (lastIssued) return lastIssued.versionNumber;
  }

  return others[0].versionNumber;
}

/** The most recent version the customer was actually sent, before `current`. */
export function previousCustomerVersion(versions: SowVersion[], currentVersionNumber: number): number | null {
  const seen = versions
    .filter((v) => v.visibleToCustomer && v.versionNumber < currentVersionNumber)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  return seen.length ? seen[0].versionNumber : null;
}

/** Short human label for a version in a picker: "v3 · signed · Aug 9". */
export function versionLabel(v: SowVersion): string {
  const date = new Date(v.createdAt);
  const when = Number.isNaN(date.getTime()) ? '' : formatSOWInstant(date, 'compact');
  return `v${v.versionNumber} · ${v.status.toLowerCase()}${when ? ` · ${when}` : ''}`;
}
