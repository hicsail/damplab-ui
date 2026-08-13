import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { v4 as uuid } from 'uuid';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE, SOW_FIELD_PREVIEW, GET_LAB_MONITOR_STAFF_LIST } from '../../gql/queries';
import { SAVE_SOW_VERSION, SEND_SOW_TO_CUSTOMER, FINALIZE_SOW, DISCARD_SOW_DRAFT } from '../../gql/mutations';
import SowFieldRow from './SowFieldRow';
import SowVersionHistory from './SowVersionHistory';
import SowPdfDocument from './SowPdfDocument';
import { diffVersions, pickDiffBaseline } from '../../utils/sowDiff';
import { CUSTOM_KEY_PREFIX, SowEditorState, SowField, SowVersionInputs, sowStatusLabel, statusColor, toInputsPayload, versionDisplayLabel } from './sowTypes';

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

  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  const history = useMemo(() => sow?.versions ?? [], [sow?.versions]);

  const [viewing, setViewing] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  // Staff may page back through history; the newest version is the default.
  const version = useMemo(() => {
    if (!sow) return null;
    if (viewing != null) return history.find((v) => v.versionNumber === viewing) ?? sow.currentVersion ?? null;
    return sow.currentVersion ?? null;
  }, [sow, history, viewing]);

  const [fields, setFields] = useState<SowField[]>([]);
  const [inputs, setInputs] = useState<SowVersionInputs | null>(null);
  const [baseVersion, setBaseVersion] = useState<number>(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [saveVersion] = useMutation(SAVE_SOW_VERSION);
  const [sendToCustomer] = useMutation(SEND_SOW_TO_CUSTOMER);
  const [finalizeSow] = useMutation(FINALIZE_SOW);
  const [discardDraft] = useMutation(DISCARD_SOW_DRAFT);

  // What the server actually holds for this version — dirty and Reset both
  // compare against this rather than a boolean flag, so undoing a change (by
  // hand or via Reset) is exactly "back to this" instead of "something was
  // touched at some point."
  const snapshotRef = useRef<{ fields: SowField[]; inputs: SowVersionInputs } | null>(null);
  const draftKey = sow?.id && version ? draftStorageKey(sow.id, version.versionNumber) : null;

  // Load server state whenever a new version arrives, then overlay any local
  // draft still stored for that exact version — so closing the modal without
  // saving and reopening it (even in a new tab) picks the edit back up.
  useEffect(() => {
    if (!version) return;
    const loadedFields = [...version.fields].sort((a, b) => a.order - b.order);
    const loadedInputs = { ...version.inputs, periods: version.inputs.periods ?? [], services: version.inputs.services ?? [], adjustments: version.inputs.adjustments ?? [] };
    snapshotRef.current = { fields: loadedFields, inputs: loadedInputs };
    setBaseVersion(version.versionNumber);

    const key = sow?.id ? draftStorageKey(sow.id, version.versionNumber) : null;
    const stored = key ? readLocalDraft(key) : null;
    if (stored) {
      setFields(mergeDraftOntoFresh(stored.fields, loadedFields));
      setInputs(stored.inputs);
      setNote(stored.note);
    } else {
      setFields(loadedFields);
      setInputs(loadedInputs);
      setNote('');
    }
  }, [version?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // True whenever the in-progress document differs from what the server holds
  // for this version — recomputed from the actual state (via the same
  // projection Save sends, so a refreshed calculatedValue from the live
  // preview doesn't count) rather than tracked as a one-way flag, so undoing an
  // edit — by hand or via Reset — re-enables Send.
  const dirty = useMemo(() => {
    const snap = snapshotRef.current;
    if (!snap || !inputs) return false;
    return fieldsFingerprint(fields) !== fieldsFingerprint(snap.fields) || JSON.stringify(toInputsPayload(inputs)) !== JSON.stringify(toInputsPayload(snap.inputs));
  }, [fields, inputs]);

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

  // Land on the newest version, comparing against whatever is most informative.
  useEffect(() => {
    if (!sow?.currentVersionNumber) return;
    setViewing(sow.currentVersionNumber);
    setBaseline(pickDiffBaseline(history, sow.currentVersionNumber));
  }, [sow?.id, sow?.currentVersionNumber, history]);

  const isHistoric = !!sow && version != null && version.versionNumber !== sow.currentVersionNumber;

  // Paging to another version re-derives the comparison: a baseline at or above
  // the version on screen would otherwise compare it against itself.
  const changeViewing = useCallback(
    (versionNumber: number) => {
      setViewing(versionNumber);
      setBaseline(pickDiffBaseline(history, versionNumber));
    },
    [history]
  );

  const diff = useMemo(() => {
    if (baseline == null || !version || baseline >= version.versionNumber) return null;
    const before = history.find((v) => v.versionNumber === baseline) ?? null;
    // Compare stored text, not the in-progress edits, so the diff answers
    // "what changed between these two saved versions".
    return diffVersions(before, version);
  }, [baseline, version, history]);

  const diffByKey = useMemo(() => new Map((diff?.fields ?? []).map((f) => [f.key, f])), [diff]);

  const status = version?.status ?? 'DRAFT';
  const activeStatus = sow?.activeVersion?.status ?? null;
  const hasUnsentDraft = !!sow && sow.currentVersionNumber > sow.activeVersionNumber;
  // A version the customer already holds is a record, not a draft, but editing
  // the *current* one is still allowed: Save spawns a new draft on top of it and
  // leaves the customer's copy untouched until it's sent (see the banner below).
  // Only a version from the history (isHistoric) or a cancelled SOW is locked.
  const readOnly = isHistoric || status === 'CANCELLED';

  /* ---------------------------------------------------------------- preview */

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPreview = useCallback(
    async (nextInputs: SowVersionInputs) => {
      if (!sow?.id) return;
      try {
        const res = await client.query({
          query: SOW_FIELD_PREVIEW,
          variables: { sowId: sow.id, inputs: toInputsPayload(nextInputs) },
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
    },
    [runPreview]
  );

  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  /* ----------------------------------------------------------------- edits */

  const patchField = useCallback((key: string, patch: Partial<SowField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }, []);

  const renameCustomField = useCallback((key: string, label: string) => patchField(key, { label }), [patchField]);

  // Stable across renders (setState identity never changes), so rows that pass
  // it straight through don't re-render just because a sibling's note field or
  // the PDF preview changed — see toggleExpand below and React.memo on SowFieldRow.
  const toggleExpand = useCallback((key: string) => setExpandedKey((k) => (k === key ? null : key)), []);

  const addCustomField = useCallback(() => {
    const key = `${CUSTOM_KEY_PREFIX}${uuid()}`;
    setFields((prev) => [
      ...prev,
      { key, label: 'New section', kind: 'CUSTOM', order: 1000 + prev.filter((f) => f.key.startsWith(CUSTOM_KEY_PREFIX)).length, value: '', calculatedValue: null, isOverridden: false, isEnabled: true, allowsTextOverride: true, allowsEmpty: true, requiresInitials: false }
    ]);
    setExpandedKey(key);
  }, []);

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

  // Discards in-progress edits and the local draft behind them, landing back on
  // exactly what Save would have overwritten — the counterpart to Save rather
  // than a full reload, so it works without a round trip.
  const handleReset = useCallback(() => {
    const snap = snapshotRef.current;
    if (!snap) return;
    setFields(snap.fields);
    setInputs(snap.inputs);
    setNote('');
    if (draftKey) window.localStorage.removeItem(draftKey);
  }, [draftKey]);

  const handleSave = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !inputs) return;
      const res = await saveVersion({
        variables: {
          sowId: sow.id,
          input: {
            baseVersionNumber: baseVersion,
            note: note.trim() || null,
            fields: fields.map((f) => ({ key: f.key, label: f.label, value: f.value, isEnabled: f.isEnabled, requiresInitials: f.requiresInitials })),
            inputs: toInputsPayload(inputs)
          }
        }
      });
      const v = res.data?.saveSowVersion;
      if (draftKey) window.localStorage.removeItem(draftKey);
      await refetch();
      setBanner({ severity: 'success', text: `Saved as version ${versionDisplayLabel(v)}.` });
    });

  const handleSend = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id) return;
      const res = await sendToCustomer({ variables: { sowId: sow.id } });
      await refetch();
      setBanner({ severity: 'success', text: `Sent to the customer as version ${versionDisplayLabel(res.data?.sendSowToCustomer)}.` });
    });

  const handleFinalize = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id) return;
      const name = window.prompt('Countersign as (your full name):');
      if (!name?.trim()) return;
      const res = await finalizeSow({ variables: { sowId: sow.id, name: name.trim() } });
      await refetch();
      setBanner({ severity: 'success', text: `Finalized as version ${versionDisplayLabel(res.data?.finalizeSow)}.` });
    });

  const handleDiscard = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !version) return;
      await discardDraft({ variables: { sowId: sow.id, versionNumber: version.versionNumber } });
      if (draftKey) window.localStorage.removeItem(draftKey);
      await refetch();
      setBanner({ severity: 'info', text: 'Draft discarded.' });
    });

  const enabledCount = useMemo(() => fields.filter((f) => f.isEnabled).length, [fields]);

  // Mirrors the backend's sendToCustomer check, so staff see why Send is blocked
  // before they click it rather than after a round trip.
  const missingRequired = useMemo(() => fields.filter((f) => !f.allowsEmpty && (!f.isEnabled || !f.value?.trim())).map((f) => f.label), [fields]);

  // react-pdf lays out and rasterizes the whole document to build the download
  // blob, which is not cheap — PDFDownloadLink redoes it whenever its `document`
  // element is a new instance, and JSX creates a new one on every render. Memoing
  // the element itself is what stops that from happening on every keystroke
  // elsewhere in the modal (e.g. the change note).
  const pdfDocument = useMemo(() => (version ? <SowPdfDocument version={version} sowNumber={sow?.sowNumber} /> : null), [version, sow?.sowNumber]);

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
            {version && <Chip size="small" label={`${versionDisplayLabel(version)} · ${sowStatusLabel(status)}`} color={statusColor(status)} />}
            {hasUnsentDraft && activeStatus && (
              <Chip size="small" variant="outlined" label={`Customer holds ${versionDisplayLabel(sow?.activeVersion)} (${sowStatusLabel(activeStatus)})`} />
            )}
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

                {sow.documentStale && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    The job&apos;s services changed after this version was written, so the Fee Schedule is out of date. Change any field and save to bring it up to date.
                  </Alert>
                )}

                {history.length > 1 && version && (
                  <Box sx={{ mb: 2 }}>
                    <SowVersionHistory
                      versions={history}
                      viewing={version.versionNumber}
                      baseline={baseline}
                      onViewingChange={changeViewing}
                      onBaselineChange={setBaseline}
                    />
                  </Box>
                )}

                {isHistoric && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Viewing version {versionDisplayLabel(version)} from the history. Switch back to version {versionDisplayLabel(sow.currentVersion)} to make changes.
                  </Alert>
                )}

                {diff && !diff.hasChanges && baseline != null && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    No edits were made between version {versionDisplayLabel(history.find((v) => v.versionNumber === baseline))} and version {versionDisplayLabel(version)}.
                  </Alert>
                )}

                {readOnly && !isHistoric && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This SOW is cancelled and cannot be altered.
                  </Alert>
                )}

                {!readOnly && status !== 'DRAFT' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Version {versionDisplayLabel(version)} is {sowStatusLabel(status).toLowerCase()}. Editing it saves a new draft; the customer keeps this version until you send the new one.
                  </Alert>
                )}
              </Box>

              <Box>
                {fields.map((f) => (
                  <SowFieldRow
                    key={f.key}
                    field={f}
                    inputs={inputs as SowVersionInputs}
                    staff={staff}
                    readOnly={readOnly}
                    expanded={expandedKey === f.key}
                    onToggleExpand={toggleExpand}
                    onChangeField={patchField}
                    onChangeInputs={patchInputs}
                    onRenameCustom={renameCustomField}
                    diff={diffByKey.get(f.key)}
                  />
                ))}
              </Box>

              <Box sx={{ p: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={addCustomField} disabled={readOnly}>
                  Add a section
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {enabledCount} of {fields.length} sections will be shown to the customer.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="What changed? (optional)" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1, minWidth: 220 }} disabled={busy || !sow} />

          {/* Only offered when there is an earlier version to fall back to; a SOW
              must always keep at least one document. */}
          {hasUnsentDraft && status === 'DRAFT' && (sow?.activeVersionNumber ?? 0) > 0 && (
            <Button color="inherit" onClick={handleDiscard} disabled={busy}>
              Discard draft
            </Button>
          )}

          {version && pdfDocument && (
            <PDFDownloadLink
              document={pdfDocument}
              fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${versionDisplayLabel(version)}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              {({ loading: pdfLoading }) => (
                <Button variant="text" disabled={busy || pdfLoading}>
                  {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          )}

          <Button onClick={handleReset} color="inherit" disabled={busy || !dirty}>
            Reset
          </Button>

          <Button onClick={handleSave} variant="outlined" disabled={busy || !sow || !dirty}>
            Save
          </Button>

          <Tooltip
            title={
              status !== 'DRAFT'
                ? 'Save your changes first — only a draft can be sent.'
                : missingRequired.length > 0
                  ? `Complete before sending: ${missingRequired.join(', ')}.`
                  : ''
            }
          >
            <span>
              <Button onClick={handleSend} variant="contained" disabled={busy || !sow || dirty || status !== 'DRAFT' || missingRequired.length > 0}>
                Send to customer
              </Button>
            </span>
          </Tooltip>

          {activeStatus === 'SIGNED' && (
            <Button onClick={handleFinalize} variant="contained" color="success" disabled={busy}>
              Countersign and finalize
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
