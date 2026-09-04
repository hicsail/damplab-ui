import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, TextField, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE } from '../../gql/queries';
import { DECLINE_SOW, SIGN_SOW } from '../../gql/mutations';
import SowDiffText from './SowDiffText';
import SowVersionHistory from './SowVersionHistory';
import SowPdfDocument from './SowPdfDocument';
import SowSignaturesSummary from './SowSignaturesSummary';
import ProcessCard from '../technician/ProcessCard';
import StatusPaneHeader from '../technician/StatusPaneHeader';
import { diffVersions, previousCustomerVersion } from '../../utils/sowDiff';
import { GROUP_ORDER, SowEditorState, SowField, customerDocumentFields, customerSigningState, signingAgreementText, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';
import { formatSOWInstant } from '../../utils/sowDateUtils';
import { chipStatusBackground, isSowProcessSettled, sowPartyStatus, sowPartyVersionLabel } from '../../utils/technicianProcessStatus';
import { formatGqlError } from '../../utils/gqlError';
import ReasonDialog from '../ReasonDialog';

/**
 * The ground behind the two things the customer has to act on: the initials
 * boxes, and the signing block. Faint enough to sit under body text, and a hue
 * nothing else on the page uses — the diff markers are `info`, the status chips
 * carry their own colours.
 */
const HIGHLIGHT = '#fff8e1';

/**
 * The customer's view of a Statement of Work.
 *
 * Read-only by construction: there is no edit affordance anywhere, and the server
 * only ever hands this component versions that were actually issued. What the
 * customer can do is understand what changed, ask about it, and sign.
 *
 * It renders the same `ProcessCard` shell the staff job page uses, so the two
 * pages read alike — but none of the staff *derivations*. In particular nothing
 * here touches `useSowStaffStatus` or `currentVersionNumber`: both know about
 * drafts above the version in force, and a draft the customer has not been sent
 * is precisely what they must not be able to infer.
 */

interface Props {
  jobId: string;
  /** Lets the job page refresh alongside: declining moves the job's lifecycle too. */
  onDeclined?: () => Promise<unknown> | void;
}

export default function SowCustomerView({ jobId, onDeclined }: Props): React.JSX.Element {
  // Counts completed fetches rather than watching `data` identity. This query is
  // cache-and-network, so `data` can be handed back a new object when some other
  // query writes the same normalised records — and using that as the re-landing
  // trigger below would yank a customer off a version they had just selected.
  const [loadCount, setLoadCount] = useState(0);
  const { data, loading, refetch } = useQuery(GET_SOW_EDITOR_STATE, {
    variables: { jobId },
    skip: !jobId,
    fetchPolicy: 'cache-and-network',
    onCompleted: () => setLoadCount((n) => n + 1)
  });
  const [signSow] = useMutation(SIGN_SOW);
  const [declineSow] = useMutation(DECLINE_SOW);

  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  // The server returns only issued versions to a customer, so this history is
  // already what they are allowed to see.
  const history = useMemo(() => sow?.versions ?? [], [sow?.versions]);

  const [viewing, setViewing] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [initials, setInitials] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);

  const activeNumber = sow?.activeVersionNumber ?? 0;
  // The newest version the customer holds. The server hands this component only
  // issued versions, so this can never be a staff draft.
  const newestIssued = useMemo(() => history.reduce((newest, v) => Math.max(newest, v.versionNumber), 0), [history]);

  // Land on the version in force every time the document reloads — the same rule
  // the job card above follows. Keying this on `activeNumber` alone meant paging
  // back through the history and then refreshing left the reader on the
  // superseded version, because the pointer had not moved. The fallback covers a
  // withdrawal, which resets activeVersionNumber to 0 and used to leave the card
  // showing nothing at all.
  useEffect(() => {
    const landing = activeNumber || newestIssued;
    if (landing) setViewing(landing);
  }, [loadCount, activeNumber, newestIssued]);

  const version = useMemo(() => history.find((v) => v.versionNumber === (viewing ?? activeNumber)) ?? null, [history, viewing, activeNumber]);

  // Always compared against the previous version they were sent, never against a
  // draft they never saw.
  const baseline = useMemo(() => (version ? previousCustomerVersion(history, version.versionNumber) : null), [history, version]);
  const diff = useMemo(() => {
    if (!version || baseline == null) return null;
    return diffVersions(history.find((v) => v.versionNumber === baseline) ?? null, version);
  }, [history, version, baseline]);
  const diffByKey = useMemo(() => new Map((diff?.fields ?? []).map((f) => [f.key, f])), [diff]);

  const visible: SowField[] = useMemo(() => customerDocumentFields(version?.fields), [version]);
  const agreementText = useMemo(() => signingAgreementText(version?.fields), [version]);

  // Only present in the single consent statement if the document actually
  // contains that kind of section — sent to the server as consentedGroups.
  const groups = useMemo(() => GROUP_ORDER.filter((g) => visible.some((f) => f.kind === g)), [visible]);
  // `allowsInitials === false` is filtered here as well as server-side: a
  // document saved before the flag existed can still carry requiresInitials on a
  // section that cannot take it, and asking for initials the server will ignore
  // would block signing on a box that does nothing.
  const sectionsNeedingInitials = useMemo(() => visible.filter((f) => f.requiresInitials && f.allowsInitials !== false), [visible]);

  // Who holds the document, derived from the version in force alone. Passing the
  // customer's own view in for both sides of `sowPartyStatus` is not a shortcut:
  // for them the version in force *is* the current one, and feeding a staff
  // "current" in would badge the lab as drafting something they cannot see.
  const activeVersion = useMemo(() => history.find((v) => v.versionNumber === activeNumber) ?? null, [history, activeNumber]);
  const parties = sowPartyStatus({ currentStatus: activeVersion?.status, activeStatus: activeVersion?.status });

  const isCurrent = !!version && version.versionNumber === activeNumber;
  const awaitingSignature = isCurrent && version?.status === 'SENT';
  const signingState = customerSigningState({
    isActive: isCurrent,
    status: version?.status,
    canSign: sow?.actionGate?.canSign,
    signBlockers: sow?.actionGate?.signBlockers
  });
  const signedName = version?.clientSignature?.name;

  const sowStatusLine = (() => {
    // One message for "no document" and "nothing issued from it". They are
    // different server states, but only one of them is the customer's business:
    // saying the lab is "still preparing" a Statement of Work discloses that a
    // draft exists, which is the same thing the hidden version labels protect.
    if (!sow || activeNumber === 0) return loading ? 'Loading…' : 'The lab has not sent you a Statement of Work for this job.';
    if (awaitingSignature && !signingState.enabled) return signingState.blockerMessage ?? 'Signing is temporarily unavailable.';
    if (awaitingSignature) return 'Review the issued Statement of Work and sign it when you are ready.';
    if (signedName) {
      return `Signed by ${signedName}${version?.staffSignature?.name ? `. Countersigned by ${version.staffSignature.name}.` : '.'}`;
    }
    // Not the version and status again — the chip beside this line already says
    // both, exactly as the staff pane's does.
    if (version) return isCurrent ? 'This is the version the lab last issued to you.' : 'An earlier version, kept for your records.';
    return 'No version of this Statement of Work is available to you yet.';
  })();

  useEffect(() => {
    setAgreed(false);
    setInitials({});
  }, [version?.id]);

  const outstandingInitials = sectionsNeedingInitials.filter((f) => !(initials[f.key] ?? '').trim());
  const allInitialed = outstandingInitials.length === 0;
  const canSign = signingState.enabled && agreed && allInitialed && name.trim().length > 0 && !busy;

  const handleDecline = async (reason: string): Promise<void> => {
    if (!sow) return;
    setBusy(true);
    setBanner(null);
    try {
      await declineSow({ variables: { sowId: sow.id, reason } });
      await refetch();
      await onDeclined?.();
      setDeclining(false);
      setBanner({ severity: 'info', text: 'The lab has been told you are not signing this version, and will follow up.' });
    } catch (e: any) {
      setBanner({ severity: 'error', text: formatGqlError(e, 'The Statement of Work could not be declined.') });
    } finally {
      setBusy(false);
    }
  };

  const handleSign = async (): Promise<void> => {
    if (!sow || !version || !signingState.enabled) return;
    setBusy(true);
    setBanner(null);
    try {
      await signSow({
        variables: {
          sowId: sow.id,
          input: {
            versionNumber: version.versionNumber,
            name: name.trim(),
            consentedGroups: groups,
            sectionInitials: sectionsNeedingInitials.map((f) => ({ key: f.key, initials: (initials[f.key] ?? '').trim() }))
          }
        }
      });
      await refetch();
      setName('');
      setBanner({ severity: 'success', text: 'Thank you — your signature has been recorded.' });
    } catch (e: any) {
      setBanner({ severity: 'error', text: e?.message ?? 'The signature could not be recorded.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ReasonDialog
      open={declining}
      title="Decline to sign this Statement of Work?"
      warning={
        'The lab will be told you are not signing this version, and it will stop being available to sign.\n\n' +
        'This does not cancel your job — the lab can revise the Statement of Work and send you a new version.'
      }
      fieldLabel="Reason (the lab sees this)"
      confirmLabel="Decline to sign"
      busy={busy}
      onCancel={() => setDeclining(false)}
      onConfirm={handleDecline}
    />
    <ProcessCard
      title="Statement of Work"
      // Collapsed once it is countersigned and there is nothing left to do,
      // exactly as the staff card decides.
      defaultExpanded={!isSowProcessSettled(version?.status)}
      // The signing form is in `details`. Open it whenever there is a signature
      // outstanding, so the header's "Review and sign SOW" lands on something to
      // sign rather than on a collapsed pane.
      defaultDetailsOpen={awaitingSignature}
      customerBadge={parties.customer}
      staffBadge={parties.staff}
      // No version labels under the icons: the lab's slot would otherwise number
      // a draft the customer was never sent.
      statusPaneSx={{ bgcolor: chipStatusBackground(version ? statusColor(version.status) : 'default') }}
      statusPane={
        <StatusPaneHeader
          status={version ? sowStatusLabel(version.status) : loading ? 'Loading' : 'Not sent yet'}
          chips={version ? <Chip size="small" label={sowPartyVersionLabel(version)} color={statusColor(version.status)} /> : undefined}
          reference={sow?.sowNumber}
          description={sowStatusLine}
        />
      }
      actions={
        version ? (
          <PDFDownloadLink
            document={<SowPdfDocument version={version} sowNumber={sow?.sowNumber} />}
            fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${versionDisplayLabel(version)}.pdf`}
            style={{ textDecoration: 'none', width: '100%' }}
          >
            {({ loading: pdfLoading }) => (
              <Button size="small" variant="outlined" disabled={pdfLoading} sx={{ textTransform: 'none', width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' }}>
                {pdfLoading ? 'Preparing…' : 'Download a copy'}
              </Button>
            )}
          </PDFDownloadLink>
        ) : undefined
      }
      details={
        <>
          {loading && !sow && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {banner && (
            <Alert severity={banner.severity} sx={{ mb: 2 }} onClose={() => setBanner(null)}>
              {banner.text}
            </Alert>
          )}

          {!loading && activeNumber === 0 && (
            <Alert severity="info">
              The lab has not sent you a Statement of Work for this job. It will appear here, to review and sign, when they do.
            </Alert>
          )}

          {version && (
            <>
              {history.length > 1 && (
                <Box sx={{ mb: 2 }}>
                  <SowVersionHistory
                    versions={history}
                    viewing={version.versionNumber}
                    baseline={baseline}
                    onViewingChange={(v) => {
                      if (typeof v === 'number') setViewing(v);
                    }}
                    onBaselineChange={() => undefined}
                    lockBaseline
                  />
                </Box>
              )}

              {/* Only when there *is* a current version to point at: a withdrawn
                  document has none, and the sentence would name version "". */}
              {!isCurrent && activeNumber > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This is an earlier version, kept for your records. Version {versionDisplayLabel(history.find((v) => v.versionNumber === activeNumber))} is the current one.
                </Alert>
              )}

              {awaitingSignature && !signingState.enabled && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {signingState.blockerMessage ?? 'Signing is temporarily unavailable. Reload this job or contact the lab before continuing.'}
                </Alert>
              )}

              {signedName && (
                <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
                  Signed by {signedName}
                  {version.clientSignature?.signedAt ? ` on ${formatSOWInstant(version.clientSignature.signedAt)}` : ''}.
                  {version.staffSignature?.name ? ` Countersigned by ${version.staffSignature.name}.` : ''}
                </Alert>
              )}

              {diff?.hasChanges && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This version differs from the one you were sent previously. The changes are marked below.
                </Alert>
              )}

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {visible.map((f) => {
                  const d = diffByKey.get(f.key);
                  const changed = d && d.kind !== 'unchanged';
                  const askInitials = awaitingSignature && !signedName && f.requiresInitials && f.allowsInitials !== false;
                  return (
                    <Box key={f.key} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', borderLeft: '3px solid', borderLeftColor: changed ? 'info.main' : 'transparent', '&:last-of-type': { borderBottom: 'none' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }} data-verbatim-text>
                          {f.label}
                        </Typography>
                        {changed && <Chip size="small" label={d?.kind === 'added' ? 'New' : 'Changed'} color="info" variant="outlined" />}
                      </Box>
                      {d?.kind === 'changed' && d.parts ? (
                        <SowDiffText parts={d.parts} />
                      ) : (
                        <Box data-verbatim-text sx={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
                          {f.value}
                        </Box>
                      )}
                      {askInitials && (
                        /* A faint yellow ground, not a border: the coloured left
                           border above already means "this section changed", and a
                           second border here would read as a diff marker rather
                           than something to do. */
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, p: 1.5, borderRadius: 1, backgroundColor: HIGHLIGHT }}>
                          <TextField
                            size="small"
                            required
                            label="Your initials"
                            value={initials[f.key] ?? ''}
                            onChange={(e) => setInitials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            sx={{ width: 140, backgroundColor: 'background.paper' }}
                            disabled={busy || !signingState.enabled}
                          />
                          <Typography variant="body2">
                            Please initial to confirm you have read this section.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {!awaitingSignature && !version.clientSignature && (
                <Typography variant="body2" sx={{ mt: 3, whiteSpace: 'pre-wrap' }} data-verbatim-text>
                  {agreementText}
                </Typography>
              )}

              {awaitingSignature && !signedName && (
                /* The same faint yellow ground as the initials boxes, so the
                   parts of this page the customer has to act on read as one set
                   rather than as more document. */
                <Box sx={{ mt: 3, p: 2.5, borderRadius: 1, backgroundColor: HIGHLIGHT }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Signing
                  </Typography>
                  {sectionsNeedingInitials.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Initial the flagged sections above, then agree and type your full name.
                    </Typography>
                  )}
                  {/* Said before the checkbox rather than after it. The old hint
                      only appeared once `agreed` was ticked, so a customer stuck
                      on a missing initial had no way to find what was blocking. */}
                  {!allInitialed && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {outstandingInitials.length} of {sectionsNeedingInitials.length} highlighted section
                      {sectionsNeedingInitials.length === 1 ? '' : 's'} still need your initials
                      {outstandingInitials.length <= 3 ? `: ${outstandingInitials.map((f) => f.label).join(', ')}` : ''}.
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <FormControlLabel
                      sx={{ flex: '1 1 280px', alignItems: 'flex-start', mr: 0 }}
                      control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} sx={{ pt: 0.25 }} disabled={!signingState.enabled || busy} />}
                      label={
                        <Typography variant="body2" data-verbatim-text>
                          {agreementText}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField size="small" label="Your full name" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 220 }} disabled={busy || !signingState.enabled} />
                      <Button variant="contained" onClick={handleSign} disabled={!canSign}>
                        Sign
                      </Button>
                      {/* Declining needs neither the agreement checkbox nor the
                          initials — those gate agreeing, not refusing — and it
                          stays available even when signing is blocked. */}
                      <Button variant="outlined" color="warning" onClick={() => setDeclining(true)} disabled={busy || sow?.actionGate?.canDecline !== true}>
                        Decline to sign
                      </Button>
                    </Box>
                  </Box>
                  {/* The missing initials are already stated above, before the
                      checkbox, so this only covers the checkbox itself. */}
                  {!agreed && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Confirm the checkbox above to enable signing.</Typography>}
                </Box>
              )}

              {version.clientSignature && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Signatures
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }} data-verbatim-text>
                    {agreementText}
                  </Typography>
                  <SowSignaturesSummary clientSignature={version.clientSignature} staffSignature={version.staffSignature} />
                </Box>
              )}
            </>
          )}
        </>
      }
    />
    </>
  );
}
