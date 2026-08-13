import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, FormControlLabel, TextField, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { GET_SOW_EDITOR_STATE } from '../../gql/queries';
import { SIGN_SOW } from '../../gql/mutations';
import SowDiffText from './SowDiffText';
import SowVersionHistory from './SowVersionHistory';
import SowPdfDocument from './SowPdfDocument';
import SowSignaturesSummary from './SowSignaturesSummary';
import { diffVersions, previousCustomerVersion } from '../../utils/sowDiff';
import { GROUP_ORDER, SowEditorState, SowField, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';

/**
 * The customer's view of a Statement of Work.
 *
 * Read-only by construction: there is no edit affordance anywhere, and the server
 * only ever hands this component versions that were actually issued. What the
 * customer can do is understand what changed, ask about it, and sign.
 */

interface Props {
  jobId: string;
}

export default function SowCustomerView({ jobId }: Props): React.JSX.Element | null {
  const { data, loading, refetch } = useQuery(GET_SOW_EDITOR_STATE, { variables: { jobId }, skip: !jobId, fetchPolicy: 'cache-and-network' });
  const [signSow] = useMutation(SIGN_SOW);

  const sow: SowEditorState | null = data?.sowByJobId ?? null;
  // The server returns only issued versions to a customer, so this history is
  // already what they are allowed to see.
  const history = useMemo(() => sow?.versions ?? [], [sow?.versions]);

  const [viewing, setViewing] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [initials, setInitials] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
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

  const visible: SowField[] = useMemo(() => (version?.fields ?? []).filter((f) => f.isEnabled).sort((a, b) => a.order - b.order), [version]);

  // Only present in the single consent statement if the document actually
  // contains that kind of section — sent to the server as consentedGroups.
  const groups = useMemo(() => GROUP_ORDER.filter((g) => visible.some((f) => f.kind === g)), [visible]);
  const sectionsNeedingInitials = useMemo(() => visible.filter((f) => f.requiresInitials), [visible]);

  const isCurrent = !!version && version.versionNumber === activeNumber;
  const awaitingSignature = isCurrent && version?.status === 'SENT';
  const signedName = version?.clientSignature?.name;

  useEffect(() => {
    setAgreed(false);
    setInitials({});
  }, [version?.id]);

  if (!loading && !sow) return null;

  const allInitialed = sectionsNeedingInitials.every((f) => (initials[f.key] ?? '').trim().length > 0);
  const canSign = awaitingSignature && agreed && allInitialed && name.trim().length > 0 && !busy;

  const handleSign = async (): Promise<void> => {
    if (!sow || !version) return;
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
    <Box sx={{ mx: 3, my: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Statement of Work
            </Typography>
            {sow?.sowNumber && <Typography variant="body2" color="text.secondary">{sow.sowNumber}</Typography>}
            {version && <Chip size="small" label={`${versionDisplayLabel(version)} · ${sowStatusLabel(version.status)}`} color={statusColor(version.status)} />}
            {version && (
              <PDFDownloadLink
                document={<SowPdfDocument version={version} sowNumber={sow?.sowNumber} />}
                fileName={`${(sow?.sowNumber ?? 'SOW').replace(/\s+/g, '-')}-v${versionDisplayLabel(version)}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <Button size="small" variant="outlined" disabled={pdfLoading}>
                    {pdfLoading ? 'Preparing…' : 'Download a copy'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>

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
                  <SowVersionHistory versions={history} viewing={version.versionNumber} baseline={baseline} onViewingChange={setViewing} onBaselineChange={() => undefined} lockBaseline />
                </Box>
              )}

              {!isCurrent && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This is an earlier version, kept for your records. Version {versionDisplayLabel(history.find((v) => v.versionNumber === activeNumber))} is the current one.
                </Alert>
              )}

              {signedName && (
                <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
                  Signed by {signedName}
                  {version.clientSignature?.signedAt ? ` on ${new Date(version.clientSignature.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
                  {version.staffSignature?.name ? ` Countersigned by ${version.staffSignature.name}.` : ''}
                </Alert>
              )}

              {diff?.hasChanges && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This version differs from the one you were sent previously. The changes are marked below.
                </Alert>
              )}

              {/* The document */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {visible.map((f) => {
                  const d = diffByKey.get(f.key);
                  const changed = d && d.kind !== 'unchanged';
                  const askInitials = awaitingSignature && !signedName && f.requiresInitials;
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
                            disabled={busy}
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

              {/* Signing */}
              {awaitingSignature && !signedName && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Signing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Confirm the document{sectionsNeedingInitials.length > 0 ? ' — including the sections above asking for your initials —' : ''} then type your full name.
                  </Typography>

                  <FormControlLabel
                    control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
                    label="I agree to all terms above, including scope of work, costs, and any client responsibilities."
                  />

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
                    <TextField size="small" label="Your full name" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 260 }} disabled={busy} />
                    <Button variant="contained" onClick={handleSign} disabled={!canSign}>
                      Sign
                    </Button>
                  </Box>
                  {!agreed && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Confirm the checkbox above to enable signing.</Typography>}
                  {agreed && !allInitialed && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Initial every flagged section above to enable signing.</Typography>}
                </Box>
              )}

              {/* Signatures */}
              {version.clientSignature && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Signatures
                  </Typography>
                  <SowSignaturesSummary clientSignature={version.clientSignature} staffSignature={version.staffSignature} />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
