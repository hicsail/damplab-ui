import { describe, it, expect } from 'vitest';
import {
  UNSAVED_VIEW,
  isShowingWorkingCopy,
  editorIsReadOnly,
  viewingAfterDirtyChange,
  compareToVersions,
  baselineAfterViewingChange,
  displayedVersion,
  editorDiff,
  pdfSourceVersion,
  revertIsEnabled,
  cloneVersionDocument
} from './sowEditorView';
import { SowField, SowStatus, SowVersion, SowVersionInputs } from './sowTypes';

function field(key: string, value: string, over: Partial<SowField> = {}): SowField {
  return {
    key,
    label: key,
    kind: 'PROSE',
    order: 10,
    value,
    calculatedValue: value,
    isOverridden: false,
    isEnabled: true,
    allowsTextOverride: true,
    allowsEmpty: true,
    requiresInitials: false,
    ...over
  };
}

function emptyInputs(): SowVersionInputs {
  return { projectManager: '', projectLead: '', scopeOfWork: [], deliverables: [], periods: [], services: [], adjustments: [] };
}

function version(n: number, fields: SowField[], over: Partial<SowVersion> = {}): SowVersion {
  return {
    id: `v${n}`,
    versionNumber: n,
    displayVersion: `${Math.floor(n / 1000)}.${n % 1000}`,
    status: 'DRAFT' as SowStatus,
    visibleToCustomer: false,
    createdByName: 'tech',
    createdAt: '2026-08-09T12:00:00.000Z',
    fields,
    inputs: emptyInputs(),
    ...over
  };
}

describe('isShowingWorkingCopy', () => {
  it('is the Unsaved view, or the current saved version when there is nothing unsaved', () => {
    expect(isShowingWorkingCopy(UNSAVED_VIEW, 1002, true)).toBe(true);
    expect(isShowingWorkingCopy(1002, 1002, false)).toBe(true);

    // Browsing the saved current while Unsaved exists is looking at a snapshot.
    expect(isShowingWorkingCopy(1002, 1002, true)).toBe(false);
    expect(isShowingWorkingCopy(1001, 1002, true)).toBe(false);
  });
});

describe('editorIsReadOnly', () => {
  const editable = { cancelled: false, viewing: UNSAVED_VIEW, currentVersionNumber: 1002, dirty: true, baseline: null };

  it('locks the fields while Compare to is set, even on Unsaved', () => {
    expect(editorIsReadOnly({ ...editable, baseline: 1001 })).toBe(true);
    expect(editorIsReadOnly(editable)).toBe(false);
  });

  it('locks historic snapshots and cancelled documents', () => {
    expect(editorIsReadOnly({ ...editable, viewing: 1001, dirty: false })).toBe(true);
    expect(editorIsReadOnly({ ...editable, cancelled: true })).toBe(true);
  });

  it('allows editing the current saved version when it is the working copy', () => {
    expect(editorIsReadOnly({ ...editable, viewing: 1002, dirty: false, baseline: null })).toBe(false);
  });
});

describe('viewingAfterDirtyChange', () => {
  it('promotes the current saved view to Unsaved on the first edit, and back when the copy is clean', () => {
    expect(viewingAfterDirtyChange(1002, 1002, true)).toBe(UNSAVED_VIEW);
    expect(viewingAfterDirtyChange(UNSAVED_VIEW, 1002, false)).toBe(1002);
  });

  it('does not yank the staff member off a historic version they are browsing', () => {
    expect(viewingAfterDirtyChange(1001, 1002, true)).toBe(1001);
    expect(viewingAfterDirtyChange(1001, 1002, false)).toBe(1001);
    expect(viewingAfterDirtyChange(UNSAVED_VIEW, 1002, true)).toBe(UNSAVED_VIEW);
  });
});

describe('compareToVersions', () => {
  const v1 = version(1001, [field('a', 'one')]);
  const v2 = version(1002, [field('a', 'two')]);

  it('offers every saved version when the screen is Unsaved, including the parent', () => {
    expect(compareToVersions([v2, v1], UNSAVED_VIEW).map((v) => v.versionNumber)).toEqual([1002, 1001]);
  });

  it('omits the version already on screen so Compare to cannot target itself', () => {
    expect(compareToVersions([v2, v1], 1002).map((v) => v.versionNumber)).toEqual([1001]);
  });
});

describe('baselineAfterViewingChange', () => {
  it('clears Compare to when it would otherwise be the version now on screen', () => {
    expect(baselineAfterViewingChange(1001, 1001)).toBeNull();
    expect(baselineAfterViewingChange(1001, UNSAVED_VIEW)).toBe(1001);
    expect(baselineAfterViewingChange(1001, 1002)).toBe(1001);
    expect(baselineAfterViewingChange(null, 1002)).toBeNull();
  });
});

describe('displayedVersion', () => {
  it('overlays the working copy onto the current version when viewing Unsaved', () => {
    const current = version(1002, [field('scope', 'saved text')], { inputs: { ...emptyInputs(), projectManager: 'Saved' } });
    const workingFields = [field('scope', 'unsaved text')];
    const workingInputs = { ...emptyInputs(), projectManager: 'Unsaved' };

    const shown = displayedVersion(UNSAVED_VIEW, [current], current, workingFields, workingInputs);

    expect(shown.fields[0].value).toBe('unsaved text');
    expect(shown.inputs.projectManager).toBe('Unsaved');
    expect(shown.versionNumber).toBe(1002);
    expect(current.fields[0].value).toBe('saved text');
  });

  it('returns the saved snapshot when viewing a version number', () => {
    const v1 = version(1001, [field('scope', 'old')]);
    const current = version(1002, [field('scope', 'new')]);
    const shown = displayedVersion(1001, [v1, current], current, [field('scope', 'unsaved')], emptyInputs());
    expect(shown.fields[0].value).toBe('old');
    expect(shown.id).toBe('v1001');
  });
});

describe('pdfSourceVersion', () => {
  it('uses a saved snapshot, never the Unsaved working copy', () => {
    const current = version(1002, [field('scope', 'saved text')]);
    const older = version(1001, [field('scope', 'old')]);
    expect(pdfSourceVersion(UNSAVED_VIEW, [older, current], current)?.id).toBe('v1002');
    expect(pdfSourceVersion(1001, [older, current], current)?.id).toBe('v1001');
    expect(pdfSourceVersion(1002, [older, current], current)?.id).toBe('v1002');
  });
});

describe('editorDiff', () => {
  it('diffs Unsaved against the last saved version even though they share a version number', () => {
    const current = version(1002, [field('scope', 'saved text')]);
    const workingFields = [field('scope', 'saved text plus an edit')];
    const d = editorDiff(1002, UNSAVED_VIEW, [current], current, workingFields, emptyInputs());
    expect(d?.hasChanges).toBe(true);
    expect(d?.fields[0].kind).toBe('changed');
  });

  it('does not diff when Compare to is Nothing, or when a saved view is compared to itself', () => {
    const current = version(1002, [field('scope', 'saved text')]);
    expect(editorDiff(null, UNSAVED_VIEW, [current], current, current.fields, emptyInputs())).toBeNull();
    expect(editorDiff(1002, 1002, [current], current, current.fields, emptyInputs())).toBeNull();
  });
});

describe('revertIsEnabled', () => {
  it('is enabled only for a saved version, never for Unsaved', () => {
    expect(revertIsEnabled(UNSAVED_VIEW)).toBe(false);
    expect(revertIsEnabled(1002)).toBe(true);
  });
});

describe('cloneVersionDocument', () => {
  it('copies fields and inputs so reverting does not alias the history entry', () => {
    const source = version(1001, [field('scope', 'old wording')], { inputs: { ...emptyInputs(), projectManager: 'Ada' } });
    const copy = cloneVersionDocument(source);
    copy.fields[0].value = 'mutated';
    copy.inputs.projectManager = 'mutated';
    expect(source.fields[0].value).toBe('old wording');
    expect(source.inputs.projectManager).toBe('Ada');
    expect(copy.fields[0].value).toBe('mutated');
  });
});
