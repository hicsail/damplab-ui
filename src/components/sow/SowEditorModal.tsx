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
import { CUSTOM_KEY_PREFIX, SowEditorState, SowField, SowVersionInputs, statusColor, toInputsPayload } from './sowTypes';

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
  const [dirty, setDirty] = useState(false);
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [saveVersion] = useMutation(SAVE_SOW_VERSION);
  const [sendToCustomer] = useMutation(SEND_SOW_TO_CUSTOMER);
  const [finalizeSow] = useMutation(FINALIZE_SOW);
  const [discardDraft] = useMutation(DISCARD_SOW_DRAFT);

  // Load server state into local state whenever a new version arrives.
  useEffect(() => {
    if (!version) return;
    setFields([...version.fields].sort((a, b) => a.order - b.order));
    setInputs({ ...version.inputs, periods: version.inputs.periods ?? [], services: version.inputs.services ?? [], adjustments: version.inputs.adjustments ?? [] });
    setBaseVersion(version.versionNumber);
    setDirty(false);
    setNote('');
  }, [version?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // A version the customer already holds is a record, not a draft: editing it
  // means producing a new draft, which Save does on its own.
  const readOnly = status !== 'DRAFT' || isHistoric;

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
            // Refresh the revert target always; move the visible text only when
            // the staff member has not taken the section over by hand.
            return { ...f, calculatedValue: calculated, value: f.isOverridden ? f.value : calculated };
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
      setDirty(true);
    },
    [runPreview]
  );

  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  /* ----------------------------------------------------------------- edits */

  const patchField = useCallback((key: string, patch: Partial<SowField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    setDirty(true);
  }, []);

  const addCustomField = useCallback(() => {
    const key = `${CUSTOM_KEY_PREFIX}${uuid()}`;
    setFields((prev) => [
      ...prev,
      { key, label: 'New section', kind: 'CUSTOM', order: 1000 + prev.filter((f) => f.key.startsWith(CUSTOM_KEY_PREFIX)).length, value: '', calculatedValue: null, isOverridden: false, isEnabled: true, allowsTextOverride: true }
    ]);
    setExpandedKey(key);
    setDirty(true);
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

  const handleSave = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !inputs) return;
      const res = await saveVersion({
        variables: {
          sowId: sow.id,
          input: {
            baseVersionNumber: baseVersion,
            note: note.trim() || null,
            fields: fields.map((f) => ({ key: f.key, label: f.label, value: f.value, isEnabled: f.isEnabled })),
            inputs: toInputsPayload(inputs)
          }
        }
      });
      const v = res.data?.saveSowVersion;
      await refetch();
      setBanner({ severity: 'success', text: `Saved as version ${v?.versionNumber}.` });
    });

  const handleSend = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id) return;
      const res = await sendToCustomer({ variables: { sowId: sow.id } });
      await refetch();
      setBanner({ severity: 'success', text: `Sent to the customer as version ${res.data?.sendSowToCustomer?.versionNumber}.` });
    });

  const handleFinalize = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id) return;
      const name = window.prompt('Countersign as (your full name):');
      if (!name?.trim()) return;
      const res = await finalizeSow({ variables: { sowId: sow.id, name: name.trim() } });
      await refetch();
      setBanner({ severity: 'success', text: `Finalized as version ${res.data?.finalizeSow?.versionNumber}.` });
    });

  const handleDiscard = (): Promise<void> =>
    withBusy(async () => {
      if (!sow?.id || !version) return;
      await discardDraft({ variables: { sowId: sow.id, versionNumber: version.versionNumber } });
      await refetch();
      setBanner({ severity: 'info', text: 'Draft discarded.' });
    });

  const enabledCount = useMemo(() => fields.filter((f) => f.isEnabled).length, [fields]);

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
            {version && <Chip size="small" label={`v${version.versionNumber} · ${status}`} color={statusColor(status)} />}
            {hasUnsentDraft && activeStatus && <Chip size="small" variant="outlined" label={`Customer holds v${sow?.activeVersionNumber} (${activeStatus})`} />}
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
                      changedLabels={(diff?.fields ?? []).filter((f) => f.kind !== 'unchanged').map((f) => f.label)}
                    />
                  </Box>
                )}

                {isHistoric && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Viewing version {version?.versionNumber} from the history. Switch back to version {sow.currentVersionNumber} to make changes.
                  </Alert>
                )}

                {diff && !diff.hasChanges && baseline != null && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Nothing changed between version {baseline} and version {version?.versionNumber}.
                  </Alert>
                )}

                {readOnly && !isHistoric && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Version {version?.versionNumber} is {status.toLowerCase()} and cannot be altered. Saving creates a new draft; the customer keeps the current version until you send the new one.
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
                    onToggleExpand={() => setExpandedKey((k) => (k === f.key ? null : f.key))}
                    onChangeField={(patch) => patchField(f.key, patch)}
                    onChangeInputs={patchInputs}
                    onRenameCustom={(label) => patchField(f.key, { label })}
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

          {version && (
            <PDFDownloadLink
              document={<SowPdfDocument version={version} sowNumber={sow?.sowNumber} />}
              fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${version.versionNumber}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              {({ loading: pdfLoading }) => (
                <Button variant="text" disabled={busy || pdfLoading}>
                  {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          )}

          <Button onClick={handleSave} variant="outlined" disabled={busy || !sow || !dirty}>
            Save
          </Button>

          <Tooltip title={status === 'DRAFT' ? '' : 'Save your changes first — only a draft can be sent.'}>
            <span>
              <Button onClick={handleSend} variant="contained" disabled={busy || !sow || dirty || status !== 'DRAFT'}>
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
