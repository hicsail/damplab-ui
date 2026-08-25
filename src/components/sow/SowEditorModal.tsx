import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE, SOW_FIELD_PREVIEW, GET_LAB_MONITOR_STAFF_LIST, GET_SOW_TEXT_PRESETS } from '../../gql/queries';
import { SAVE_SOW_VERSION, SEND_SOW_TO_CUSTOMER, FINALIZE_SOW, RESTORE_SOW_SIGNED_VERSION } from '../../gql/mutations';
import SowFieldRow from './SowFieldRow';
import { SowTextPresetOption } from './SowPresetPicker';
import SowVersionHistory from './SowVersionHistory';
import SowPdfDocument from './SowPdfDocument';
import {
  UNSAVED_VIEW,
  SowViewing,
  baselineAfterViewingChange,
  cloneVersionDocument,
  displayedVersion,
  editorDiff,
  editorIsReadOnly,
  nextSowAction,
  pdfSourceVersion,
  revertAction,
  viewingAfterDirtyChange
} from './sowEditorView';
import { SowEditorState, SowField, SowVersionInputs, feeScheduleIsStale, feeScheduleLivePatch, sowStatusLabel, statusColor, toInputsPayload, versionDisplayLabel, nextSentVersionLabel, withPeriodDragKeys } from './sowTypes';

/**
 * Staff editor for the SOW document.
 *
 * The server owns generated text; this component owns what the staff member has
 * changed. When a source control moves, the preview query returns only
 * `{key, calculatedValue}` — never whole rows — so unsaved overrides, hidden
 * sections and new custom sections survive the round trip.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobName?: string;
}

const PREVIEW_DEBOUNCE_MS = 300;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface LocalDraft {
  fields: SowField[];
  inputs: SowVersionInputs;
  note: string;
}

/** Unsaved edits survive closing the modal (and the tab) by living here, keyed
 *  to the exact version they were made against — so a draft never resurfaces
 *  against a version it wasn't written for (e.g. after someone else sent one). */
export function draftStorageKey(sowId: string, versionNumber: number): string {
  return `sow-draft:${sowId}:${versionNumber}`;
}

function readLocalDraft(key: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.fields) || !parsed.inputs) return null;
    return { fields: parsed.fields, inputs: parsed.inputs, note: typeof parsed.note === 'string' ? parsed.note : '' };
  } catch {
    return null; // corrupted or unavailable storage: fall back to the server copy
  }
}

/**
 * What Save actually sends for a field — everything else (`calculatedValue`,
 * `kind`, `order`, ...) is server-derived and refreshes on every preview, even
 * with no user edit. Comparing whole SowField objects for "dirty" would count
 * that refresh as a change and leave Send disabled after an undo.
 */
function fieldFingerprint(f: SowField): unknown {
  return { key: f.key, label: f.label, value: f.value, isEnabled: f.isEnabled, requiresInitials: f.requiresInitials };
}

export function fieldsFingerprint(fields: SowField[]): string {
  return JSON.stringify(fields.map(fieldFingerprint));
}

/**
 * Carries the draft's user-controlled state (value/isEnabled/overridden/...)
 * over the version's freshly loaded fields, rather than restoring the draft
 * wholesale — so a draft saved before the billing core moved doesn't quietly
 * reinstate stale figures for a field the staff never touched by hand.
 */
export function mergeDraftOntoFresh(draftFields: SowField[], freshFields: SowField[]): SowField[] {
  const draftByKey = new Map(draftFields.map((f) => [f.key, f]));
  const seen = new Set<string>();
  const merged = freshFields.map((fresh) => {
    const draft = draftByKey.get(fresh.key);
    seen.add(fresh.key);
    if (!draft) return fresh;
    return { ...fresh, isEnabled: draft.isEnabled, requiresInitials: draft.requiresInitials, isOverridden: draft.isOverridden, value: draft.isOverridden ? draft.value : fresh.calculatedValue ?? '' };
  });
  // Custom sections have no server counterpart to refresh against.
  const customs = draftFields.filter((f) => !seen.has(f.key));
  return [...merged, ...customs];
}

export default function SowEditorModal({ open, onClose, jobId, jobName }: Props): React.JSX.Element {
  const client = useApolloClient();

  const { data, loading, refetch } = useQuery(GET_SOW_EDITOR_STATE, {
    variables: { jobId },
    skip: !open || !jobId,
    fetchPolicy: 'network-only'
  });
  const { data: staffData } = useQuery(GET_LAB_MONITOR_STAFF_LIST, { skip: !open });
  const staff = staffData?.getLabMonitorStaffList ?? [];

  // The whole library in one round-trip rather than one query per prose section.
  const { data: presetData } = useQuery(GET_SOW_TEXT_PRESETS, { skip: !open });
  const presetsBySection = useMemo(() => {
    const grouped = new Map<string, SowTextPresetOption[]>();
    for (const preset of (presetData?.sowTextPresets ?? []) as SowTextPresetOption[]) {
      const list = grouped.get(preset.sectionKey);
      if (list) list.push(preset);
      else grouped.set(preset.sectionKey, [preset]);
    }
    return grouped;
  }, [presetData]);

  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  const history = useMemo(() => sow?.versions ?? [], [sow?.versions]);
  const currentVersion = sow?.currentVersion ?? null;

  const [viewing, setViewing] = useState<SowViewing | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);

  const [fields, setFields] = useState<SowField[]>([]);
  const [inputs, setInputs] = useState<SowVersionInputs | null>(null);
  const [baseVersion, setBaseVersion] = useState<number>(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [saveVersion] = useMutation(SAVE_SOW_VERSION);
  const [sendToCustomer] = useMutation(SEND_SOW_TO_CUSTOMER);
  const [finalizeSow] = useMutation(FINALIZE_SOW);
  const [restoreSignedVersion] = useMutation(RESTORE_SOW_SIGNED_VERSION);

  // What the server actually holds for the current version — dirty and Reset
  // both compare against this rather than a boolean flag, so undoing a change
  // (by hand or via Reset) is exactly "back to this" instead of "something was
  // touched at some point."
  const snapshotRef = useRef<{ fields: SowField[]; inputs: SowVersionInputs } | null>(null);
  const draftKey = sow?.id && currentVersion ? draftStorageKey(sow.id, currentVersion.versionNumber) : null;

  // Load server state whenever the current version itself changes, then overlay
  // any local draft still stored for that exact version — so closing the modal
  // without saving and reopening it (even in a new tab) picks the edit back up.
  // Paging through history must not clobber the working copy.
  useEffect(() => {
    if (!currentVersion) return;
    const loadedFields = [...currentVersion.fields].sort((a, b) => a.order - b.order);
    const loadedInputs = withPeriodDragKeys({ ...currentVersion.inputs, periods: currentVersion.inputs.periods ?? [], services: currentVersion.inputs.services ?? [], adjustments: currentVersion.inputs.adjustments ?? [] });
    snapshotRef.current = { fields: loadedFields, inputs: loadedInputs };
    setBaseVersion(currentVersion.versionNumber);
    setBaseline(null);

    const key = sow?.id ? draftStorageKey(sow.id, currentVersion.versionNumber) : null;
    const stored = key ? readLocalDraft(key) : null;
    if (stored) {
      setFields(mergeDraftOntoFresh(stored.fields, loadedFields));
      const draftInputs = withPeriodDragKeys(stored.inputs);
      setInputs(draftInputs);
      setNote(stored.note);
      setViewing(UNSAVED_VIEW);
      // Regenerate against the draft's own inputs before anything is rendered
      // from them. mergeDraftOntoFresh takes `fresh.calculatedValue` for any
      // section the staff member did not override by hand, and that value was
      // generated from the *last saved* inputs — so a source-control choice made
      // in the draft (picking a Project Manager, say) is missing from the text
      // even though the dropdown restores showing it. Engagement Resources then
      // reads as empty, takes back its red "Required" chip and blocks Send, with
      // the staff visibly selected the whole time. Nothing else runs a preview on
      // load; without this the only way out is to touch a source control again.
      void runPreview(draftInputs);
    } else {
      setFields(loadedFields);
      setInputs(loadedInputs);
      setNote('');
      setViewing(currentVersion.versionNumber);
    }
  }, [currentVersion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A version is a static record: its figures stay put until staff choose to
  // adopt the job's current ones. This flag is that choice, and it is what the
  // save sends — never a price. The server rederives the figures itself.
  const [refreshFeeSchedule, setRefreshFeeSchedule] = useState(false);
  // Send and Countersign share a click target with Save, so both confirm first:
  // a stray second click after saving must not reach the customer.
  const [confirming, setConfirming] = useState<'send' | 'countersign' | null>(null);
  const [countersignName, setCountersignName] = useState('');
  // The preview is debounced, so it reads the intent through a ref rather than
  // capturing whatever the flag was when the closure was built.
  const refreshRef = useRef(false);
  useEffect(() => {
    refreshRef.current = refreshFeeSchedule;
  }, [refreshFeeSchedule]);

  // True whenever the in-progress document differs from what the server holds
  // for this version — recomputed from the actual state (via the same
  // projection Save sends, so a refreshed calculatedValue from the live
  // preview doesn't count) rather than tracked as a one-way flag, so undoing an
  // edit — by hand or via Reset — re-enables Send.
  const dirty = useMemo(() => {
    const snap = snapshotRef.current;
    if (!snap || !inputs) return false;
    if (refreshFeeSchedule) return true;
    return fieldsFingerprint(fields) !== fieldsFingerprint(snap.fields) || JSON.stringify(toInputsPayload(inputs)) !== JSON.stringify(toInputsPayload(snap.inputs));
  }, [fields, inputs, refreshFeeSchedule]);

  // Debounced so typing doesn't hit localStorage on every keystroke. Cleared
  // instead of written once there is nothing unsaved to remember.
  useEffect(() => {
    if (!draftKey) return undefined;
    if (!dirty) {
      window.localStorage.removeItem(draftKey);
      return undefined;
    }
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ fields, inputs, note }));
      } catch {
        // Storage full or unavailable (private browsing): edits still work for
        // this session, they just won't survive closing the modal.
      }
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draftKey, dirty, fields, inputs, note]);

  // Drop Unsaved once the working copy matches the last save again (Reset, or
  // undoing every edit). Promotion onto Unsaved happens in the edit handlers so
  // a freshly loaded draft is not immediately kicked back to the saved version.
  const wasDirty = useRef(false);
  useEffect(() => {
    if (wasDirty.current && !dirty && currentVersion) {
      setViewing((v) => (v == null ? v : viewingAfterDirtyChange(v, currentVersion.versionNumber, false)));
    }
    wasDirty.current = dirty;
  }, [dirty, currentVersion]);

  const onScreen = useMemo(() => {
    if (!currentVersion || viewing == null || !inputs) return currentVersion;
    return displayedVersion(viewing, history, currentVersion, fields, inputs);
  }, [viewing, history, currentVersion, fields, inputs]);

  const screenFields = useMemo(() => [...(onScreen?.fields ?? [])].sort((a, b) => a.order - b.order), [onScreen]);

  const isHistoric = !!currentVersion && viewing != null && viewing !== UNSAVED_VIEW && viewing !== currentVersion.versionNumber;

  const changeViewing = useCallback((next: SowViewing) => {
    setViewing(next);
    setBaseline((b) => baselineAfterViewingChange(b, next));
  }, []);

  const diff = useMemo(() => {
    if (!currentVersion || viewing == null || !inputs) return null;
    return editorDiff(baseline, viewing, history, currentVersion, fields, inputs);
  }, [baseline, viewing, history, currentVersion, fields, inputs]);

  const diffByKey = useMemo(() => new Map((diff?.fields ?? []).map((f) => [f.key, f])), [diff]);

  const status = currentVersion?.status ?? 'DRAFT';
  const activeStatus = sow?.activeVersion?.status ?? null;
  const hasUnsentDraft = !!sow && sow.currentVersionNumber > sow.activeVersionNumber;
  const readOnly = editorIsReadOnly({
    viewing: viewing ?? currentVersion?.versionNumber ?? 0,
    currentVersionNumber: currentVersion?.versionNumber ?? 0,
    dirty,
    baseline
  });

  /* ---------------------------------------------------------------- preview */

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPreview = useCallback(
    async (nextInputs: SowVersionInputs) => {
      if (!sow?.id) return;
      try {
        const res = await client.query({
          query: SOW_FIELD_PREVIEW,
          variables: { sowId: sow.id, inputs: toInputsPayload(nextInputs, refreshRef.current) },
          fetchPolicy: 'network-only'
        });
        const byKey = new Map<string, string>((res.data?.sowFieldPreview ?? []).map((v: { key: string; calculatedValue: string }) => [v.key, v.calculatedValue]));

        setFields((prev) =>
          prev.map((f) => {
            const calculated = byKey.get(f.key);
            if (calculated === undefined) return f; // custom sections have no generator
            // A required field (Engagement Resources with no PM/Lead, say) that
            // was hidden only for lack of content shows itself back the moment
            // it has some — mirrors the same rule the server applies on save
            // (sow-field-calculator.ts), so the checkbox doesn't lag a save
            // behind what the staff member just typed.
            const justPopulated = !f.allowsEmpty && !f.isEnabled && !(f.calculatedValue ?? '').trim() && !!calculated.trim();
            // Refresh the revert target always; move the visible text only when
            // the staff member has not taken the section over by hand.
            return { ...f, calculatedValue: calculated, value: f.isOverridden ? f.value : calculated, isEnabled: f.isEnabled || justPopulated };
          })
        );
      } catch {
        setBanner({ severity: 'warning', text: 'Could not refresh the generated text. Your edits are still here; try changing a field again.' });
      }
    },
    [client, sow?.id]
  );

  const patchInputs = useCallback(
    (patch: Partial<SowVersionInputs>) => {
      setInputs((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (previewTimer.current) clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => runPreview(next), PREVIEW_DEBOUNCE_MS);
        return next;
      });
      setViewing((v) => (v == null || !currentVersion ? v : viewingAfterDirtyChange(v, currentVersion.versionNumber, true)));
    },
    [runPreview, currentVersion]
  );

  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  /* ------------------------------------------------------------ fee schedule */


  const feeScheduleStale = useMemo(() => {
    const shown = onScreen?.inputs ?? inputs;
    return shown ? feeScheduleIsStale(shown, sow) : false;
  }, [onScreen, inputs, sow]);

  const handleRecalculateFeeSchedule = useCallback(() => {
    if (!inputs || !sow?.liveServices) return;
    // Recalc is an unsaved edit only when the job's figures actually differ.
    // A no-op click must not dirty the buffer or block Countersign.
    if (!feeScheduleIsStale(inputs, sow)) return;
    patchInputs(feeScheduleLivePatch(inputs, sow.liveServices, sow.liveCustomerCategory));
    setRefreshFeeSchedule(true);
  }, [inputs, patchInputs, sow]);

  /* ----------------------------------------------------------------- edits */

  const patchField = useCallback((key: string, patch: Partial<SowField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    setViewing((v) => (v == null || !currentVersion ? v : viewingAfterDirtyChange(v, currentVersion.versionNumber, true)));
  }, [currentVersion]);

  const renameCustomField = useCallback((key: string, label: string) => patchField(key, { label }), [patchField]);

  // Stable across renders (setState identity never changes), so rows that pass
  // it straight through don't re-render just because a sibling's note field or
  // the PDF preview changed — see toggleExpand below and React.memo on SowFieldRow.
  const toggleExpand = useCallback((key: string) => setExpandedKey((k) => (k === key ? null : key)), []);

  /* --------------------------------------------------------------- actions */

  const withBusy = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setBanner(null);
    try {
      await fn();
    } catch (e: any) {
      setBanner({ severity: 'error', text: e?.message ?? 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (busy || refreshing) return;
    setRefreshing(true);
    setBanner(null);
    void refetch()
      .catch(() => {
        setBanner({ severity: 'error', text: 'Could not refresh this Statement of Work. Try again.' });
      })
      .finally(() => setRefreshing(false));
  }, [busy, refreshing, refetch]);

  // Discards in-progress edits and the local draft behind them, landing back on
  // exactly what Save would have overwritten — the counterpart to Save rather
  // than a full reload, so it works without a round trip.
  const handleReset = useCallback(() => {
    const snap = snapshotRef.current;
    if (!snap || !currentVersion) return;
    setFields(snap.fields);
    setInputs(snap.inputs);
    setNote('');
    if (draftKey) window.localStorage.removeItem(draftKey);
    setRefreshFeeSchedule(false);
    setViewing((v) => (v === UNSAVED_VIEW ? currentVersion.versionNumber : v));
    setBaseline(null);
  }, [draftKey, currentVersion]);

  const handleRevert = useCallback(() => {
    if (viewing == null || viewing === UNSAVED_VIEW || !currentVersion) return;
    const source = history.find((v) => v.versionNumber === viewing);
    if (!source) return;
    const action = revertAction({
      viewing,
      currentVersionNumber: currentVersion.versionNumber,
      activeVersionNumber: sow?.activeVersionNumber ?? 0,
      activeStatus
    });
    if (!action) return;

    if (action.kind === 'restore-signed') {
      if (!window.confirm(`Discard newer drafts and restore version ${versionDisplayLabel(source)} — the version the customer signed — so you can countersign it?`)) return;
      void withBusy(async () => {
        if (!sow?.id) return;
        if (draftKey) window.localStorage.removeItem(draftKey);
        setRefreshFeeSchedule(false);
        await restoreSignedVersion({ variables: { sowId: sow.id, versionNumber: source.versionNumber } });
        await refetch();
        setBanner({ severity: 'success', text: `Restored version ${versionDisplayLabel(source)}. You can countersign this document.` });
      });
      return;
    }

    if (dirty && !window.confirm(`Replace your unsaved edits with version ${versionDisplayLabel(source)}?`)) return;
    const copy = cloneVersionDocument(source);
    setFields([...copy.fields].sort((a, b) => a.order - b.order));
    setInputs(withPeriodDragKeys(copy.inputs));
    setRefreshFeeSchedule(false);
    setViewing(UNSAVED_VIEW);
    setBaseline(null);
  }, [viewing, history, dirty, currentVersion, sow, activeStatus, draftKey, restoreSignedVersion, refetch]);

  const handleSave = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !inputs) return;
      const res = await saveVersion({
        variables: {
          sowId: sow.id,
          input: {
            baseVersionNumber: baseVersion,
            note: note.trim(),
            refreshFeeSchedule,
            fields: fields.map((f) => ({ key: f.key, label: f.label, value: f.value, isEnabled: f.isEnabled, requiresInitials: f.requiresInitials })),
            inputs: toInputsPayload(inputs)
          }
        }
      });
      const v = res.data?.saveSowVersion;
      if (draftKey) window.localStorage.removeItem(draftKey);
      setRefreshFeeSchedule(false);
      await refetch();
      setBanner({ severity: 'success', text: `Saved as version ${versionDisplayLabel(v)}.` });
    });

  const handleSend = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id) return;
      const res = await sendToCustomer({ variables: { sowId: sow.id } });
      setConfirming(null);
      await refetch();
      setBanner({ severity: 'success', text: `Sent to the customer as version ${versionDisplayLabel(res.data?.sendSowToCustomer)}.` });
    });

  const handleFinalize = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !countersignName.trim()) return;
      const res = await finalizeSow({ variables: { sowId: sow.id, name: countersignName.trim() } });
      setConfirming(null);
      setCountersignName('');
      await refetch();
      setBanner({ severity: 'success', text: `Finalized as version ${versionDisplayLabel(res.data?.finalizeSow)}.` });
    });


  const enabledCount = useMemo(() => fields.filter((f) => f.isEnabled).length, [fields]);

  // Mirrors the backend's sendToCustomer check, so staff see why Send is blocked
  // before they click it rather than after a round trip.
  const missingRequired = useMemo(() => fields.filter((f) => !f.allowsEmpty && (!f.isEnabled || !f.value?.trim())).map((f) => f.label), [fields]);

  const nextAction = useMemo(
    () => nextSowAction({ dirty, status, activeStatus, gate: sow?.actionGate, missingRequired, readOnly }),
    [dirty, status, activeStatus, sow?.actionGate, missingRequired, readOnly]
  );
  const viewingRevert = viewing != null && currentVersion
    ? revertAction({
        viewing,
        currentVersionNumber: currentVersion.versionNumber,
        activeVersionNumber: sow?.activeVersionNumber ?? 0,
        activeStatus
      })
    : null;
  /**
   * The merged button's click. Save fires directly — it is routine, repeatable
   * and reversible. The two that leave the building open a confirmation first.
   */
  const handleNextAction = (): void => {
    if (nextAction.kind === 'save') {
      void handleSave();
    } else if (nextAction.kind === 'send' || nextAction.kind === 'countersign') {
      setConfirming(nextAction.kind);
    }
  };

  // react-pdf lays out and rasterizes the whole document to build the download
  // blob, which is not cheap — PDFDownloadLink redoes it whenever its `document`
  // element is a new instance, and JSX creates a new one on every render. The
  // on-screen working copy changes on every keystroke, so this is built from a
  // saved snapshot rather than Unsaved.
  const pdfVersion = useMemo(() => pdfSourceVersion(viewing, history, currentVersion), [viewing, history, currentVersion]);
  const pdfDocument = useMemo(() => (pdfVersion ? <SowPdfDocument version={pdfVersion} sowNumber={sow?.sowNumber} /> : null), [pdfVersion, sow?.sowNumber]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" component="div">
                Statement of Work
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {sow?.sowNumber ?? '—'}
                {jobName ? ` · ${jobName}` : ''}
              </Typography>
            </Box>
            {viewing === UNSAVED_VIEW && currentVersion && (
              <Chip size="small" label={`Unsaved · based on ${versionDisplayLabel(currentVersion)}`} color="warning" />
            )}
            {viewing !== UNSAVED_VIEW && onScreen && (
              <Chip size="small" label={`${versionDisplayLabel(onScreen)} · ${sowStatusLabel(onScreen.status)}`} color={statusColor(onScreen.status)} />
            )}
            {hasUnsentDraft && activeStatus && (
              <Chip size="small" variant="outlined" label={`Customer holds ${versionDisplayLabel(sow?.activeVersion)} (${sowStatusLabel(activeStatus)})`} />
            )}
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={handleRefresh} disabled={busy || refreshing} aria-label="Refresh">
                  {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose} disabled={busy} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {/* "Generate SOW" creates the document before opening this editor, so
              reaching here means the job's SOW could not be loaded — not that the
              staff member still has one to create. */}
          {!loading && !sow && (
            <Alert severity="warning" sx={{ m: 2 }}>
              This job&apos;s Statement of Work could not be loaded. Close this window and try again.
            </Alert>
          )}

          {!loading && sow && (
            <>
              <Box sx={{ px: 2, pt: 2 }}>
                {banner && (
                  <Alert severity={banner.severity} sx={{ mb: 2 }} onClose={() => setBanner(null)}>
                    {banner.text}
                  </Alert>
                )}

                {currentVersion && viewing != null && (
                  <Box sx={{ mb: 2 }}>
                    <SowVersionHistory
                      versions={history}
                      viewing={viewing}
                      baseline={baseline}
                      onViewingChange={changeViewing}
                      onBaselineChange={setBaseline}
                      unsaved={dirty || viewing === UNSAVED_VIEW}
                      unsavedBasedOn={versionDisplayLabel(currentVersion)}
                      onRevert={handleRevert}
                      revertTooltip={
                        viewingRevert?.kind === 'restore-signed'
                          ? 'Discard newer drafts and restore this signed version so you can countersign it.'
                          : undefined
                      }
                      onReset={handleReset}
                      resetDisabled={busy || !dirty}
                      busy={busy}
                    />
                  </Box>
                )}

                {baseline != null && status !== 'CANCELLED' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Diff view — editing is off. Set Compare to Nothing to continue editing.
                  </Alert>
                )}

                {isHistoric && onScreen && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {viewingRevert?.kind === 'restore-signed'
                      ? `Viewing version ${versionDisplayLabel(onScreen)} — the version the customer signed. Use Revert to discard newer drafts and countersign this document, or switch back to version ${versionDisplayLabel(currentVersion)} to keep editing the draft.`
                      : `Viewing version ${versionDisplayLabel(onScreen)} from the history. Use Revert to this version to make it your working copy, or switch back to ${dirty ? 'Unsaved' : `version ${versionDisplayLabel(currentVersion)}`} to continue editing.`}
                  </Alert>
                )}

                {dirty && viewing === currentVersion?.versionNumber && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Viewing the last saved version. Switch to Unsaved to keep editing, or Revert to this version to replace your unsaved edits with this snapshot.
                  </Alert>
                )}

                {diff && !diff.hasChanges && baseline != null && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    No edits were made between version {versionDisplayLabel(history.find((v) => v.versionNumber === baseline))} and {viewing === UNSAVED_VIEW ? 'Unsaved' : `version ${versionDisplayLabel(onScreen)}`}.
                  </Alert>
                )}

                {status === 'CANCELLED' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This SOW is cancelled and cannot be altered.
                  </Alert>
                )}

                {!readOnly && status !== 'DRAFT' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Version {versionDisplayLabel(currentVersion)} is {sowStatusLabel(status).toLowerCase()}. Editing it saves a new draft; the customer keeps this version until you send the new one.
                  </Alert>
                )}
              </Box>

              <Box>
                {screenFields.map((f) => (
                  <SowFieldRow
                    key={f.key}
                    field={f}
                    inputs={(onScreen?.inputs ?? inputs) as SowVersionInputs}
                    staff={staff}
                    readOnly={readOnly}
                    expanded={expandedKey === f.key}
                    onToggleExpand={toggleExpand}
                    onChangeField={patchField}
                    onChangeInputs={patchInputs}
                    onRenameCustom={renameCustomField}
                    presets={presetsBySection.get(f.key)}
                    diff={diffByKey.get(f.key)}
                    liveCustomerCategory={sow.liveCustomerCategory}
                    liveServices={sow.liveServices}
                    stale={f.key === 'feeSchedule' ? feeScheduleStale : false}
                    onRecalculate={f.key === 'feeSchedule' ? handleRecalculateFeeSchedule : undefined}
                  />
                ))}
              </Box>

              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {enabledCount} of {fields.length} sections will be shown to the customer.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          {/* Required: the note is what the version history reads back as, and an
              unlabelled entry in an audit trail is worse than no entry. Only
              enforced while there is something to save — an empty note must not
              be what makes a clean, unedited document look broken. */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 280 }}>
            <TextField
              size="small"
              /* Reissuing a cancelled document often changes nothing, so asking
                 "what changed?" would be the wrong question there. */
              placeholder={status === 'CANCELLED' && !dirty ? 'Why is it being reissued? (Required)' : 'What changed? (Required to save)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={dirty && !note.trim()}
              sx={{ flex: 1, minWidth: 180 }}
              disabled={busy || !sow}
            />
          </Box>

          <Tooltip title={nextAction.kind === 'blocked' ? nextAction.reason ?? '' : dirty && !note.trim() ? 'Describe what you changed before saving.' : ''}>
            <span>
              <Button
                onClick={handleNextAction}
                variant="contained"
                color={nextAction.kind === 'countersign' ? 'success' : 'primary'}
                disabled={busy || !sow || nextAction.kind === 'blocked' || (nextAction.kind === 'save' && !note.trim())}
              >
                {nextAction.label}
              </Button>
            </span>
          </Tooltip>

          {pdfVersion && pdfDocument && (
            <PDFDownloadLink
              document={pdfDocument}
              fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${versionDisplayLabel(pdfVersion)}.pdf`}
              style={{ textDecoration: 'none', marginLeft: 'auto' }}
            >
              {({ loading: pdfLoading }) => (
                <Tooltip title={pdfLoading ? 'Preparing PDF…' : 'Download PDF'}>
                  <span>
                    <IconButton component="span" disabled={busy || pdfLoading} aria-label="Download PDF" size="small">
                      {pdfLoading ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </PDFDownloadLink>
          )}
        </DialogActions>
      </Dialog>

      {/* The speed bump between a routine click and an outward-facing one. */}
      <Dialog open={confirming != null} onClose={() => (busy ? undefined : setConfirming(null))} maxWidth="xs" fullWidth>
        <DialogTitle>{confirming === 'send' ? 'Send to customer?' : 'Countersign and finalize?'}</DialogTitle>
        <DialogContent>
          {confirming === 'send' ? (
            <Typography variant="body2">
              {sow?.sowNumber} draft {versionDisplayLabel(currentVersion)} will be issued to the customer as <strong>version {nextSentVersionLabel(currentVersion)}</strong> — sending
              starts a new whole version. They will be asked to review and sign that exact document.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This closes out {sow?.sowNumber} version {versionDisplayLabel(sow?.activeVersion)} — the version the customer signed. Type your full name to
                countersign on behalf of the lab.
              </Typography>
              <TextField
                size="small"
                fullWidth
                autoFocus
                label="Countersign as"
                value={countersignName}
                onChange={(e) => setCountersignName(e.target.value)}
                disabled={busy}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirming === 'countersign' ? 'success' : 'primary'}
            disabled={busy || (confirming === 'countersign' && !countersignName.trim())}
            onClick={() => void (confirming === 'send' ? handleSend() : handleFinalize())}
          >
            {confirming === 'send' ? 'Send' : 'Countersign'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
