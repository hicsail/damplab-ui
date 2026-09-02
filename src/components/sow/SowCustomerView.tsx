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
import CollapsibleStatusCard from '../CollapsibleStatusCard';
import { diffVersions, previousCustomerVersion } from '../../utils/sowDiff';
import { GROUP_ORDER, SowEditorState, SowField, customerDocumentFields, customerSigningState, signingAgreementText, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';
import { formatSOWInstant } from '../../utils/sowDateUtils';
import { chipStatusBackground } from '../../utils/technicianProcessStatus';
import { formatGqlError } from '../../utils/gqlError';
import ReasonDialog from '../ReasonDialog';

/**
 * The customer's view of a Statement of Work.
 *
 * Read-only by construction: there is no edit affordance anywhere, and the server
 * only ever hands this component versions that were actually issued. What the
 * customer can do is understand what changed, ask about it, and sign.
 */

interface Props {
  jobId: string;
  /** Lets the job page refresh alongside: declining moves the job's lifecycle too. */
  onDeclined?: () => Promise<unknown> | void;
}

export default function SowCustomerView({ jobId, onDeclined }: Props): React.JSX.Element | null {
  const { data, loading, refetch } = useQuery(GET_SOW_EDITOR_STATE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
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

  useEffect(() => {
    if (activeNumber) setViewing(activeNumber);
  }, [activeNumber]);

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
    if (sow && activeNumber === 0) return 'The lab is still preparing your Statement of Work.';
    if (awaitingSignature && !signingState.enabled) return signingState.blockerMessage ?? 'Signing is temporarily unavailable.';
    if (awaitingSignature) return 'Review the issued Statement of Work and sign it when you are ready.';
    if (signedName) {
      return `Signed by ${signedName}${version?.staffSignature?.name ? `. Countersigned by ${version.staffSignature.name}.` : '.'}`;
    }
    if (version) return `${versionDisplayLabel(version)} · ${sowStatusLabel(version.status)}`;
    return 'No Statement of Work is available yet.';
  })();

  useEffect(() => {
    setAgreed(false);
    setInitials({});
  }, [version?.id]);

  if (!loading && !sow) return null;

  const allInitialed = sectionsNeedingInitials.every((f) => (initials[f.key] ?? '').trim().length > 0);
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
    <CollapsibleStatusCard
      title="Statement of Work"
      defaultExpanded
      titleExtra={
        <>
          {sow?.sowNumber && <Typography variant="body2" color="text.secondary">{sow.sowNumber}</Typography>}
          {version && (
            <PDFDownloadLink
              document={<SowPdfDocument version={version} sowNumber={sow?.sowNumber} />}
              fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${versionDisplayLabel(version)}.pdf`}
              style={{ textDecoration: 'none' }}
            >
              {({ loading: pdfLoading }) => (
                <Button size="small" variant="outlined" disabled={pdfLoading} sx={{ textTransform: 'none' }}>
                  {pdfLoading ? 'Preparing…' : 'Download a copy'}
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </>
      }
      statusPaneSx={{ bgcolor: chipStatusBackground(version ? statusColor(version.status) : 'default') }}
      statusPane={
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {version ? sowStatusLabel(version.status) : loading ? 'Loading' : 'Not available'}
            </Typography>
            {version && <Chip size="small" label={versionDisplayLabel(version)} color={statusColor(version.status)} />}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {sowStatusLine}
          </Typography>
        </Box>
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

          {sow && activeNumber === 0 && <Alert severity="info">The lab is still preparing your Statement of Work. You will be able to review and sign it here.</Alert>}

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

              {!isCurrent && (
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                          <TextField
                            size="small"
                            label="Initials"
                            value={initials[f.key] ?? ''}
                            onChange={(e) => setInitials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            sx={{ width: 120 }}
                            disabled={busy || !signingState.enabled}
                          />
                          <Typography variant="caption" color="text.secondary">
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
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Signing
                  </Typography>
                  {sectionsNeedingInitials.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Initial the flagged sections above, then agree and type your full name.
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
                  {!agreed && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Confirm the checkbox above to enable signing.</Typography>}
                  {agreed && !allInitialed && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Initial every flagged section above to enable signing.</Typography>}
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
